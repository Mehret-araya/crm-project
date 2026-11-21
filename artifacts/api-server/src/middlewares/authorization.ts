import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "./auth";

export type AuthRole = "admin" | "user";
export type AuthPrincipal = { id: number; role: AuthRole };

export function principalFromClaims(payload: {
  adminId?: unknown;
  userId?: unknown;
  role?: unknown;
}): AuthPrincipal | null {
  const validId = (value: unknown): value is number =>
    typeof value === "number" && Number.isSafeInteger(value) && value > 0;

  if (validId(payload.adminId) && (payload.role === undefined || payload.role === "admin")) {
    return { id: payload.adminId, role: "admin" };
  }
  if (validId(payload.userId) && payload.role === "user") {
    return { id: payload.userId, role: "user" };
  }
  return null;
}

export function getLeadScope(principal: AuthPrincipal): Record<string, number> {
  return principal.role === "admin" ? {} : { ownerId: principal.id };
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  if (req.auth?.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}
