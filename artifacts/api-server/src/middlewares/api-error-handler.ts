import type { ErrorRequestHandler, RequestHandler } from "express";

interface ApiLogger {
  warn(fields: Record<string, unknown>, message: string): void;
  error(fields: Record<string, unknown>, message: string): void;
}

export function safeErrorMetadata(error: unknown): {
  errorName: string;
  errorCode?: string | number;
} {
  if (typeof error !== "object" || error === null) {
    return { errorName: "UnknownError" };
  }

  const candidate = error as { name?: unknown; code?: unknown };
  const errorName =
    typeof candidate.name === "string" && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(candidate.name)
      ? candidate.name
      : "UnknownError";
  const errorCode =
    typeof candidate.code === "number" ||
    (typeof candidate.code === "string" && /^[A-Z0-9_-]{1,32}$/.test(candidate.code))
      ? candidate.code
      : undefined;

  return { errorName, ...(errorCode === undefined ? {} : { errorCode }) };
}

function getParserFailureStatus(error: unknown): 400 | 403 | 413 | 415 | undefined {
  if (typeof error !== "object" || error === null || !("type" in error)) {
    return undefined;
  }

  if (
    error.type === "entity.parse.failed" ||
    error.type === "request.aborted" ||
    error.type === "request.size.invalid"
  ) return 400;
  if (error.type === "entity.verify.failed") return 403;
  if (error.type === "entity.too.large") return 413;
  if (error.type === "encoding.unsupported" || error.type === "charset.unsupported") return 415;
  return undefined;
}

export function createApiErrorHandler(
  logger: ApiLogger,
): ErrorRequestHandler {
  return (error: unknown, req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }

    const parserFailureStatus = getParserFailureStatus(error);
    const status = parserFailureStatus ?? 500;
    const details = {
      requestId: req.id,
      method: req.method,
      path: req.path,
      ...safeErrorMetadata(error),
    };

    if (status >= 500) {
      logger.error(details, "Unhandled API request error");
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    logger.warn(details, "Request body rejected");
    res.status(status).json({
      error: status === 413
        ? "Request body is too large"
        : status === 415
          ? "Unsupported request encoding"
          : status === 403
            ? "Request body rejected"
            : "Invalid request body",
    });
  };
}

export const apiNotFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "Not found" });
};
