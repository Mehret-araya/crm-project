import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { once } from "node:events";
import express from "express";
import bcrypt from "bcryptjs";
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
import { isValidAdminName } from "../src/lib/admin-profile.ts";
import { createRegistrationHandler } from "../src/lib/registration.ts";
import { getLeadScope, principalFromClaims, requireAdmin } from "../src/middlewares/authorization.ts";
import type { AuthenticatedRequest } from "../src/middlewares/auth.ts";
import { RegisterBody } from "../../../lib/api-zod/src/generated/api.ts";

function parseRegistrationBody(value: unknown) {
  const parsed = RegisterBody.safeParse(value);
  return parsed.success ? parsed.data : null;
}

test("admin profile names must be present, non-null, and non-empty", () => {
  for (const name of [undefined, null, "", "   ", 42]) {
    assert.equal(isValidAdminName(name), false, `name ${String(name)}`);
  }
  assert.equal(isValidAdminName("Admin User"), true);
});

test("registration validates required fields and password policy", async () => {
  const app = express();
  app.use(express.json());
  app.post("/register", createRegistrationHandler({
    parseRegistrationBody,
    async findExistingAccount() { return false; },
    async hashPassword() { return "hash"; },
    async createAccount() { return { id: 1 }; },
  }));

  await withServer(app, async (_server, baseUrl) => {
    const invalidBodies = [
      { email: "person@example.test", password: "correct-horse-battery" },
      { name: "Person", password: "correct-horse-battery" },
      { name: "Person", email: "person@example.test" },
      { name: "Person", email: "bad-email", password: "correct-horse-battery" },
      { name: "Person", email: "person@example.test", password: "short" },
      { name: "   ", email: "person@example.test", password: "correct-horse-battery" },
      { name: "Person", email: "person@example.test", password: "😀".repeat(19) },
    ];

    for (const body of invalidBodies) {
      const response = await fetch(`${baseUrl}/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), { error: "Invalid registration details" });
    }
  });
});

test("registration hashes passwords and creates a normal account without returning secrets", async () => {
  let created: { name: string; email: string; passwordHash: string; role: "user" } | undefined;
  let passwordSentToHasher: string | undefined;
  const app = express();
  app.use(express.json());
  app.post("/register", createRegistrationHandler({
    parseRegistrationBody,
    async findExistingAccount() { return false; },
    async hashPassword(password) {
      passwordSentToHasher = password;
      return bcrypt.hash(password, 12);
    },
    async createAccount(account) { created = account; return { id: 21 }; },
  }));

  await withServer(app, async (_server, baseUrl) => {
    const response = await fetch(`${baseUrl}/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "  CRM User ",
        email: " USER@Example.Test ",
        password: "correct-horse-battery",
      }),
    });
    assert.equal(response.status, 201);
    const responseBody = await response.json();
    assert.deepEqual(responseBody, {
      id: 21,
      name: "CRM User",
      email: "user@example.test",
    });
    assert.deepEqual(created, {
      name: "CRM User",
      email: "user@example.test",
      passwordHash: created?.passwordHash,
      role: "user",
    });
    assert.equal(passwordSentToHasher, "correct-horse-battery");
    assert.notEqual(created?.passwordHash, "correct-horse-battery");
    assert.equal(await bcrypt.compare("correct-horse-battery", created!.passwordHash), true);
    assert.equal(JSON.stringify(responseBody).includes("passwordHash"), false);
  });
});

test("registration rejects duplicate emails including unique-index races", async () => {
  let hashCalled = false;
  const app = express();
  app.use(express.json());
  app.post("/register", createRegistrationHandler({
    parseRegistrationBody,
    async findExistingAccount() { return true; },
    async hashPassword() { hashCalled = true; return "hash"; },
    async createAccount() { return { id: 2 }; },
  }));

  await withServer(app, async (_server, baseUrl) => {
    const response = await fetch(`${baseUrl}/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Person", email: "person@example.test", password: "correct-horse-battery" }),
    });
    assert.equal(response.status, 409);
    assert.equal(hashCalled, false);
    assert.deepEqual(await response.json(), { error: "An account with this email already exists" });
  });

  const raceApp = express();
  raceApp.use(express.json());
  raceApp.post("/register", createRegistrationHandler({
    parseRegistrationBody,
    async findExistingAccount() { return false; },
    async hashPassword() { return "hash"; },
    async createAccount() { throw Object.assign(new Error("duplicate"), { code: 11000 }); },
  }));
  raceApp.use(createApiErrorHandler({ warn() {}, error() {} }));
  await withServer(raceApp, async (_server, baseUrl) => {
    const response = await fetch(`${baseUrl}/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Person", email: "person@example.test", password: "correct-horse-battery" }),
    });
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { error: "An account with this email already exists" });
  });
});

test("legacy admin JWT claims stay admin and user claims cannot become admin", () => {
  assert.deepEqual(principalFromClaims({ adminId: 7 }), { id: 7, role: "admin" });
  assert.deepEqual(principalFromClaims({ userId: 8, role: "user" }), { id: 8, role: "user" });
  assert.equal(principalFromClaims({ userId: 8, role: "admin" }), null);
  assert.equal(principalFromClaims({ adminId: 8, role: "user" }), null);
});

test("normal users are restricted to their own leads and denied admin-only routes", async () => {
  assert.deepEqual(getLeadScope({ id: 24, role: "user" }), { ownerId: 24 });
  assert.deepEqual(getLeadScope({ id: 1, role: "admin" }), {});

  const app = express();
  app.get("/admin", (req, _res, next) => {
    (req as AuthenticatedRequest).auth = { id: 24, role: "user" };
    next();
  }, requireAdmin, (_req, res) => res.json({ status: "allowed" }));

  await withServer(app, async (_server, baseUrl) => {
    const response = await fetch(`${baseUrl}/admin`);
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "Forbidden" });
  });
});

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
