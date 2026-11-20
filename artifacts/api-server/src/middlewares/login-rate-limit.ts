import { rateLimit } from "express-rate-limit";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const LOGIN_ATTEMPTS_PER_WINDOW = 10;

export function createLoginRateLimiter(options?: {
  limit?: number;
  windowMs?: number;
}) {
  return rateLimit({
    windowMs: options?.windowMs ?? FIFTEEN_MINUTES_MS,
    limit: options?.limit ?? LOGIN_ATTEMPTS_PER_WINDOW,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { error: "Too many failed login attempts. Please try again later." },
  });
}

export const loginRateLimiter = createLoginRateLimiter();
