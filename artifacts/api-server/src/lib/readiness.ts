import type { RequestHandler } from "express";

export function createDatabaseAvailabilityMiddleware(
  isDatabaseConnected: () => boolean,
): RequestHandler {
  return (req, res, next) => {
    if (req.path === "/healthz" || req.path === "/readyz" || isDatabaseConnected()) {
      next();
      return;
    }

    res.status(503).json({ error: "Service not ready" });
  };
}

export function createReadinessHandler(
  isDatabaseConnected: () => boolean | Promise<boolean>,
): RequestHandler {
  return async (_req, res) => {
    try {
      if (await isDatabaseConnected()) {
        res.status(200).json({ status: "ok" });
        return;
      }
    } catch {
      // Readiness reports only whether the dependency is available.
    }

    if (res.headersSent) return;
    res.status(503).json({ error: "Service not ready" });
  };
}
