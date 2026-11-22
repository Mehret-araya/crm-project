import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { apiNotFoundHandler, createApiErrorHandler } from "./middlewares/api-error-handler";
import { createDatabaseAvailabilityMiddleware } from "./lib/readiness";
import { mongoose } from "@workspace/db-mongo";

const app: Express = express();

const rawTrustProxyHops = process.env.TRUST_PROXY_HOPS ?? "0";
const trustProxyHops = Number(rawTrustProxyHops);
if (!Number.isSafeInteger(trustProxyHops) || trustProxyHops < 0) {
  throw new Error("TRUST_PROXY_HOPS must be a non-negative integer.");
}
app.set("trust proxy", trustProxyHops);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
const allowedOrigins = new Set([
  "https://mehret-araya.github.io",
  "https://crm-project-0s9s.onrender.com",
  "http://localhost:8081",
  "http://localhost:5173",
]);
const configuredFrontendOrigin = process.env.FRONTEND_ORIGIN?.trim();
if (configuredFrontendOrigin) {
  let parsedFrontendOrigin: URL;
  try {
    parsedFrontendOrigin = new URL(configuredFrontendOrigin);
  } catch {
    throw new Error("FRONTEND_ORIGIN must be a valid HTTP or HTTPS origin.");
  }
  if (
    !["http:", "https:"].includes(parsedFrontendOrigin.protocol) ||
    parsedFrontendOrigin.origin !== configuredFrontendOrigin
  ) {
    throw new Error("FRONTEND_ORIGIN must be a valid HTTP or HTTPS origin without a path.");
  }
  allowedOrigins.add(parsedFrontendOrigin.origin);
}

app.use(cors({
  origin: [...allowedOrigins],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  "/api",
  createDatabaseAvailabilityMiddleware(() => mongoose.connection.readyState === 1),
);
app.use("/api", router);
app.use(apiNotFoundHandler);
app.use(createApiErrorHandler(logger));

export default app;
