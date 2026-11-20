import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import express from "express";
import { test } from "node:test";
import { createLoginRateLimiter } from "../src/middlewares/login-rate-limit.ts";
import { getSessionSecret } from "../src/security/session-secret.ts";

test("SESSION_SECRET is mandatory and at least 32 bytes", () => {
  assert.throws(() => getSessionSecret({}), /SESSION_SECRET is required/);
  assert.throws(() => getSessionSecret({ SESSION_SECRET: "   " }), /required/);
  assert.throws(() => getSessionSecret({ SESSION_SECRET: "too-short" }), /at least 32 bytes/);
  assert.throws(() => getSessionSecret({ SESSION_SECRET: `${"x".repeat(32)} ` }), /surrounding whitespace/);
  const secret = "x".repeat(32);
  assert.equal(getSessionSecret({ SESSION_SECRET: secret }), secret);
});

test("login rate limiter blocks repeated failed login attempts", async () => {
  const app = express();
  app.use(express.json());
  app.post("/login", createLoginRateLimiter({ limit: 2, windowMs: 60_000 }), (_req, res) => {
    res.status(401).json({ error: "Invalid credentials" });
  });

  const server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}/login`;

  try {
    const first = await fetch(url, { method: "POST" });
    const second = await fetch(url, { method: "POST" });
    const third = await fetch(url, { method: "POST" });
    assert.equal(first.status, 401);
    assert.equal(second.status, 401);
    assert.equal(third.status, 429);
    assert.match(third.headers.get("ratelimit") ?? "", /limit=2/);
    assert.deepEqual(await third.json(), {
      error: "Too many failed login attempts. Please try again later.",
    });
  } finally {
    server.close();
    await once(server, "close");
  }
});
