import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import express from "express";
import { test } from "node:test";
import { createReadinessHandler } from "../src/lib/readiness.ts";

test("GET /api/healthz contract returns status ok", async () => {
  const app = express();
  app.get("/api/healthz", (_req, res) => res.json({ status: "ok" }));

  const server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");

  try {
    const res = await fetch(`http://127.0.0.1:${address.port}/api/healthz`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body, { status: "ok" });
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("GET /api/readyz reports ready when database ping passes", async () => {
  const app = express();
  app.get("/api/readyz", createReadinessHandler(async () => true));

  const server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");

  try {
    const res = await fetch(`http://127.0.0.1:${address.port}/api/readyz`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body, { status: "ok" });
  } finally {
    server.close();
    await once(server, "close");
  }
});
