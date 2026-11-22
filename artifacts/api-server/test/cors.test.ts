import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import express from "express";
import cors from "cors";
import { test } from "node:test";

test("CORS allows configured FRONTEND_ORIGIN with credentials", async () => {
  const allowedOrigins = new Set([
    "https://mehret-araya.github.io",
    "https://crm-project-0s9s.onrender.com",
    "http://localhost:8081",
    "http://localhost:5173",
  ]);

  const configuredOrigin = "https://crm-project-frontend.onrender.com";
  const parsed = new URL(configuredOrigin);
  allowedOrigins.add(parsed.origin);

  const app = express();
  app.use(cors({ origin: [...allowedOrigins], credentials: true }));
  app.get("/api/test", (_req, res) => res.json({ status: "ok" }));

  const server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}/api/test`;

  try {
    const res = await fetch(url, {
      headers: { Origin: "https://crm-project-frontend.onrender.com" },
    });
    assert.equal(res.status, 200);
    assert.equal(
      res.headers.get("access-control-allow-origin"),
      "https://crm-project-frontend.onrender.com",
    );
    assert.equal(res.headers.get("access-control-allow-credentials"), "true");
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("CORS rejects untrusted origins without wildcard", async () => {
  const allowedOrigins = new Set([
    "https://mehret-araya.github.io",
    "https://crm-project-0s9s.onrender.com",
  ]);

  const app = express();
  app.use(cors({ origin: [...allowedOrigins], credentials: true }));
  app.get("/api/test", (_req, res) => res.json({ status: "ok" }));

  const server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}/api/test`;

  try {
    const res = await fetch(url, {
      headers: { Origin: "https://untrusted-site.example.com" },
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("access-control-allow-origin"), null);
  } finally {
    server.close();
    await once(server, "close");
  }
});
