import { randomBytes } from "node:crypto";

const databaseUrl = process.env.DATABASE_URL || process.env.DB_URL;
if (!databaseUrl) {
  throw new Error("Set DATABASE_URL in lib/.env before starting the local API.");
}

let parsedDatabaseUrl;
try {
  parsedDatabaseUrl = new URL(databaseUrl);
} catch {
  throw new Error(
    "The configured database URL is invalid. Check the MongoDB Atlas URI format and URL-encode reserved characters in its credentials; the value is not displayed.",
  );
}

if (parsedDatabaseUrl.protocol !== "mongodb:" && parsedDatabaseUrl.protocol !== "mongodb+srv:") {
  throw new Error("The configured database URL must use mongodb:// or mongodb+srv://.");
}

process.env.NODE_ENV = "development";
process.env.PORT = "10001";

// Keep a local-only fallback in memory; do not write or print the secret.
if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = randomBytes(48).toString("base64url");
}

await import("./dist/index.mjs");
