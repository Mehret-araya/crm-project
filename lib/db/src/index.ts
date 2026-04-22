import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;
const DATABASE_URL_ENV_NAMES = ["DATABASE_URL", "DB_URL"] as const;
const POSTGRES_PROTOCOLS = new Set(["postgres:", "postgresql:"]);
const MONGODB_PROTOCOLS = new Set(["mongodb:", "mongodb+srv:"]);

function getConfiguredDatabaseUrl(): string {
  for (const envName of DATABASE_URL_ENV_NAMES) {
    const value = process.env[envName];

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  throw new Error(
    `Missing database connection string. Set one of: ${DATABASE_URL_ENV_NAMES.join(", ")}.
This package uses Drizzle's PostgreSQL driver, so the value must be a Postgres URL such as:
postgresql://USER:PASSWORD@HOST:5432/DB_NAME

If you put the value in a .env file, make sure your runtime actually loads that file before importing @workspace/db.`,
  );
}

function validateDatabaseUrl(connectionString: string): string {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(connectionString);
  } catch (error) {
    throw new Error(
      `Invalid database URL format: ${(error as Error).message}
Expected a PostgreSQL connection string like:
postgresql://USER:PASSWORD@HOST:5432/DB_NAME`,
    );
  }

  if (MONGODB_PROTOCOLS.has(parsedUrl.protocol)) {
    throw new Error(
      `Received a MongoDB connection string (${parsedUrl.protocol}), but @workspace/db is configured for PostgreSQL.
This code imports "drizzle-orm/node-postgres", uses the "pg" driver, and defines schema with "pgTable".

Use a PostgreSQL URL instead, for example:
postgresql://USER:PASSWORD@HOST:5432/DB_NAME

If you actually want MongoDB, the database layer needs to be rewritten to use a MongoDB driver/ORM.`,
    );
  }

  if (!POSTGRES_PROTOCOLS.has(parsedUrl.protocol)) {
    throw new Error(
      `Unsupported database protocol "${parsedUrl.protocol}".
Expected one of: ${Array.from(POSTGRES_PROTOCOLS).join(", ")}`,
    );
  }

  return connectionString;
}

const connectionString = validateDatabaseUrl(getConfiguredDatabaseUrl());

let pool: pg.Pool;

try {
  pool = new Pool({ connectionString });
} catch (error) {
  throw new Error(
    `Failed to initialize PostgreSQL pool: ${(error as Error).message}`,
  );
}

export { pool };
export const db = drizzle(pool, { schema });

export * from "./schema";
