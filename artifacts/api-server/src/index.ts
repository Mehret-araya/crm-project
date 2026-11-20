import app from "./app";
import { logger } from "./lib/logger";
import { connectBeforeListen } from "./lib/startup";
import { safeErrorMetadata } from "./middlewares/api-error-handler";
import { connectDB, mongoose } from "@workspace/db-mongo";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function start(): Promise<void> {
  try {
    await connectBeforeListen(async () => {
      await connectDB();
      logger.info("MongoDB connected");
    }, () => new Promise<void>((resolve, reject) => {
      const server = app.listen(port, () => {
        logger.info({ port }, "Server listening");
        resolve();
      });
      server.once("error", reject);
    }));
  } catch (error) {
    logger.error(safeErrorMetadata(error), "API startup failed before accepting requests");
    await mongoose.disconnect().catch(() => undefined);
    process.exitCode = 1;
  }
}

void start();
