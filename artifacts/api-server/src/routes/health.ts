import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { mongoose } from "@workspace/db-mongo";
import { createReadinessHandler } from "../lib/readiness";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get(
  "/readyz",
  createReadinessHandler(async () => {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) return false;
    await mongoose.connection.db.admin().ping({ maxTimeMS: 2_000 });
    return true;
  }),
);

export default router;
