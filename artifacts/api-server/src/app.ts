import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { connectDB } from "@workspace/db-mongo";

const app: Express = express();

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
app.use(cors({
  origin: [
    "https://mehret-araya.github.io",
    "http://localhost:8081",
    "http://localhost:5173",
  ],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

connectDB()
  .then(() => logger.info("MongoDB connected"))
  .catch((err) => {
    logger.error({ err }, "MongoDB connection failed");
    process.exit(1);
  });

app.use("/api", router);

export default app;
