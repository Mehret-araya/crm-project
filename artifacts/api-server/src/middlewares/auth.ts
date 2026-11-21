import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getSessionSecret } from "../security/session-secret";
import { principalFromClaims } from "./authorization";

const JWT_SECRET = getSessionSecret();

declare global {
  namespace Express {
    interface Request {
      auth?: { id: number; role: "admin" | "user" };
      adminId?: number;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  auth?: { id: number; role: "admin" | "user" };
  /** Compatibility for existing route code and legacy JWTs. */
  adminId?: number;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & {
      adminId?: unknown;
      userId?: unknown;
      role?: unknown;
    };
    const principal = principalFromClaims(payload);
    if (!principal) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    req.auth = principal;
    if (principal.role === "admin") req.adminId = principal.id;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function signToken(accountId: number, role: "admin" | "user" = "admin"): string {
  const claims = role === "admin"
    ? { adminId: accountId, role }
    : { userId: accountId, role };
  return jwt.sign(claims, JWT_SECRET, { expiresIn: "7d" });
}
