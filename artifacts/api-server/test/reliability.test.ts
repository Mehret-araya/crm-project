import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { once } from "node:events";
import express from "express";
import { test } from "node:test";
import { connectDB } from "../../../lib/db-mongo/src/connection.ts";
import {
  GetLeadParams,
  GetLeadsQueryParams,
} from "../../../lib/api-zod/src/generated/api.ts";
import {
  escapeRegexLiteral,
  isDecimalIntegerString,
  isOptionalDecimalInteger,
} from "../src/lib/lead-search.ts";
import { connectBeforeListen } from "../src/lib/startup.ts";
import {
  apiNotFoundHandler,
  createApiErrorHandler,
} from "../src/middlewares/api-error-handler.ts";
import {
  createDatabaseAvailabilityMiddleware,
  createReadinessHandler,
} from "../src/lib/readiness.ts";

async function withServer<T>(
  app: express.Express,
  run: (server: Server, baseUrl: string) => Promise<T>,
): Promise<T> {
  const server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");

  try {
    return await run(server, `http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, "close");
  }
}

test("pagination and search query schemas reject invalid and unbounded input", () => {
  for (const page of ["-1", "0", "1.5", "abc", "10001"]) {
    assert.equal(GetLeadsQueryParams.safeParse({ page }).success, false, `page ${page}`);
  }
  for (const limit of ["-1", "0", "1.5", "abc", "101"]) {
    assert.equal(GetLeadsQueryParams.safeParse({ limit }).success, false, `limit ${limit}`);
  }
  assert.equal(GetLeadsQueryParams.safeParse({ search: "x".repeat(101) }).success, false);
  assert.equal(GetLeadsQueryParams.safeParse({ page: "10000", limit: "100", search: "x".repeat(100) }).success, true);

  const defaults = GetLeadsQueryParams.parse({});
  assert.equal(defaults.page, 1);
  assert.equal(defaults.limit, 20);
});

test("lead ID schema rejects non-positive, fractional, and unsafe IDs", () => {
  for (const id of ["0", "-1", "1.2", "abc", "9007199254740992"]) {
    assert.equal(GetLeadParams.safeParse({ id }).success, false, `id ${id}`);
  }
  assert.equal(GetLeadParams.safeParse({ id: "42" }).success, true);
});

test("raw pagination query fields must use decimal integer syntax", () => {
  for (const value of ["-1", "1.5", "1e3", "0x10", ["1", "2"], { value: "1" }]) {
    assert.equal(isOptionalDecimalInteger(value), false);
  }
  assert.equal(isOptionalDecimalInteger(undefined), true);
  assert.equal(isOptionalDecimalInteger("100"), true);
});

test("lead path IDs must use decimal integer syntax", () => {
  for (const value of ["1.2", "1e2", "+2", " 2", "0x10", ["2"]]) {
    assert.equal(isDecimalIntegerString(value), false);
  }
  assert.equal(isDecimalIntegerString("42"), true);
});

test("search metacharacters are escaped and retain literal substring behavior", () => {
  const input = "crm.*(lead)[x]\\?";
  const matcher = new RegExp(escapeRegexLiteral(input), "i");
  assert.equal(matcher.test(`before ${input} after`), true);
  assert.equal(matcher.test("crmZZleadx"), false);
});

test("API errors hide internal messages and return a consistent JSON body", async () => {
  const logged: Array<{ fields: Record<string, unknown>; message: string }> = [];
  const testLogger = {
    warn(fields: Record<string, unknown>, message: string) { logged.push({ fields, message }); },
    error(fields: Record<string, unknown>, message: string) { logged.push({ fields, message }); },
  };
  const app = express();
  app.get("/failure", async () => {
    throw new Error("private database connection detail");
  });
  app.use(createApiErrorHandler(testLogger));

  await withServer(app, async (_server, baseUrl) => {
    const response = await fetch(`${baseUrl}/failure`);
    const body = await response.json();
    assert.equal(response.status, 500);
    assert.deepEqual(body, { error: "Internal server error" });
    assert.equal(JSON.stringify(body).includes("private database connection detail"), false);
    assert.equal(JSON.stringify(logged).includes("private database connection detail"), false);
    assert.equal(logged[0]?.fields.errorName, "Error");
  });
});

test("malformed and oversized request bodies return safe client errors", async () => {
  const app = express();
  app.use(express.json({ limit: "16b" }));
  app.post("/body", (_req, res) => res.json({ status: "ok" }));
  app.use(createApiErrorHandler({ warn() {}, error() {} }));

  await withServer(app, async (_server, baseUrl) => {
    const malformed = await fetch(`${baseUrl}/body`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });
    assert.equal(malformed.status, 400);
    assert.deepEqual(await malformed.json(), { error: "Invalid request body" });

    const oversized = await fetch(`${baseUrl}/body`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "x".repeat(64) }),
    });
    assert.equal(oversized.status, 413);
    assert.deepEqual(await oversized.json(), { error: "Request body is too large" });

    const unsupportedEncoding = await fetch(`${baseUrl}/body`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-encoding": "unsupported",
      },
      body: "{}",
    });
    assert.equal(unsupportedEncoding.status, 415);
    assert.deepEqual(await unsupportedEncoding.json(), { error: "Unsupported request encoding" });
  });
});

test("unknown routes return the stable JSON error shape", async () => {
  const app = express();
  app.use(apiNotFoundHandler);

  await withServer(app, async (_server, baseUrl) => {
    const response = await fetch(`${baseUrl}/missing`);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "Not found" });
  });
});

test("readiness returns 503 until the database is connected", async () => {
  let connected = false;
  const app = express();
  app.get("/readyz", createReadinessHandler(() => connected));

  await withServer(app, async (_server, baseUrl) => {
    const unavailable = await fetch(`${baseUrl}/readyz`);
    assert.equal(unavailable.status, 503);
    assert.deepEqual(await unavailable.json(), { error: "Service not ready" });

    connected = true;
    const ready = await fetch(`${baseUrl}/readyz`);
    assert.equal(ready.status, 200);
    assert.deepEqual(await ready.json(), { status: "ok" });
  });
});

test("readiness reports unavailable when the database ping fails", async () => {
  const app = express();
  app.get("/readyz", createReadinessHandler(async () => {
    throw new Error("private database detail");
  }));

  await withServer(app, async (_server, baseUrl) => {
    const response = await fetch(`${baseUrl}/readyz`);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "Service not ready" });
  });
});

test("database outages block normal API requests but leave health routes available", async () => {
  const app = express();
  app.use("/api", createDatabaseAvailabilityMiddleware(() => false));
  app.get("/api/healthz", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/leads", (_req, res) => res.json({ leads: [] }));

  await withServer(app, async (_server, baseUrl) => {
    const health = await fetch(`${baseUrl}/api/healthz`);
    assert.equal(health.status, 200);

    const leads = await fetch(`${baseUrl}/api/leads`);
    assert.equal(leads.status, 503);
    assert.deepEqual(await leads.json(), { error: "Service not ready" });
  });
});

test("startup never calls listen when the database connection fails", async () => {
  let listened = false;
  await assert.rejects(
    () => connectBeforeListen(
      async () => { throw new Error("database unavailable"); },
      () => { listened = true; },
    ),
    /database unavailable/,
  );
  assert.equal(listened, false);
});

test("database startup rejects missing configuration without attempting a connection", async () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalDbUrl = process.env.DB_URL;
  delete process.env.DATABASE_URL;
  delete process.env.DB_URL;

  try {
    await assert.rejects(connectDB(), /Missing database connection string/);
  } finally {
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
    if (originalDbUrl === undefined) delete process.env.DB_URL;
    else process.env.DB_URL = originalDbUrl;
  }
});
