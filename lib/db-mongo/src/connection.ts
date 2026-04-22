import mongoose from "mongoose";

const MONGO_URL_ENV_NAMES = ["DATABASE_URL", "DB_URL"] as const;
const MONGODB_PROTOCOLS = new Set(["mongodb:", "mongodb+srv:"]);

function getConfiguredDatabaseUrl(): string {
  for (const envName of MONGO_URL_ENV_NAMES) {
    const value = process.env[envName];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  throw new Error(
    `Missing database connection string. Set one of: ${MONGO_URL_ENV_NAMES.join(", ")}.\n` +
      `This package uses Mongoose, so the value must be a MongoDB URL such as:\n` +
      `mongodb+srv://USER:PASSWORD@cluster.mongodb.net/DB_NAME`,
  );
}

function validateDatabaseUrl(connectionString: string): string {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(connectionString);
  } catch (error) {
    throw new Error(
      `Invalid database URL format: ${(error as Error).message}\n` +
        `Expected a MongoDB connection string like:\n` +
        `mongodb+srv://USER:PASSWORD@cluster.mongodb.net/DB_NAME`,
    );
  }

  if (!MONGODB_PROTOCOLS.has(parsedUrl.protocol)) {
    throw new Error(
      `Unsupported database protocol "${parsedUrl.protocol}".\n` +
        `Expected one of: ${Array.from(MONGODB_PROTOCOLS).join(", ")}\n` +
        `If you are using PostgreSQL, use @workspace/db instead.`,
    );
  }

  return connectionString;
}

const connectionString = validateDatabaseUrl(getConfiguredDatabaseUrl());

let connected = false;

export async function connectDB(): Promise<void> {
  if (connected) return;
  await mongoose.connect(connectionString);
  connected = true;
}

export { mongoose };
