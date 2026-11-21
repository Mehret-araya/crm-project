import { Router, IRouter } from "express";
import bcrypt from "bcryptjs";
import { AccountModel } from "@workspace/db-mongo";
import { LoginBody, RegisterBody } from "@workspace/api-zod";
import { signToken, requireAuth, AuthenticatedRequest } from "../middlewares/auth";
import { loginRateLimiter, registrationRateLimiter } from "../middlewares/login-rate-limit";
import { logger } from "../lib/logger";
import { isValidAdminName } from "../lib/admin-profile";
import { createRegistrationHandler } from "../lib/registration";
import { escapeRegexLiteral } from "../lib/lead-search";

const router: IRouter = Router();
type AccountRecord = {
  id: number;
  name: unknown;
  email: string;
  passwordHash: string;
  role?: unknown;
};

const registerHandler = createRegistrationHandler({
  parseRegistrationBody: (value) => {
    const parsed = RegisterBody.safeParse(value);
    return parsed.success ? parsed.data : null;
  },
  findExistingAccount: async (email) => {
    const escapedEmail = escapeRegexLiteral(email);
    return Boolean(await AccountModel.findOne({
      email: new RegExp(`^${escapedEmail}$`, "i"),
    }).lean());
  },
  hashPassword: (password) => bcrypt.hash(password, 12),
  createAccount: async (account) => {
    const created = await new AccountModel(account).save();
    return { id: created["id"] as number };
  },
});

router.post("/auth/register", registrationRateLimiter, registerHandler);

router.post("/auth/login", loginRateLimiter, async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const { email, password } = parsed.data;

  const normalizedEmail = email.trim().toLowerCase();
  const escapedEmail = escapeRegexLiteral(normalizedEmail);
  const admin = await AccountModel.findOne({
    email: new RegExp(`^${escapedEmail}$`, "i"),
  }).lean() as unknown as AccountRecord | null;
  if (!admin) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (!isValidAdminName(admin.name)) {
    logger.error({ requestId: req.id }, "Stored account profile has an invalid name");
    res.status(500).json({ error: "Internal server error" });
    return;
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const role = (admin as { role?: unknown }).role;
  if (role !== undefined && role !== "admin" && role !== "user") {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const token = signToken(admin.id, role === "user" ? "user" : "admin");
  res.json({
    token,
    user: { id: admin.id, email: admin.email, name: admin.name },
  });
});

router.get("/auth/me", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const admin = await AccountModel.findOne({ id: req.auth?.id }).lean() as unknown as AccountRecord | null;
  if (!admin) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const adminName = (admin as { name?: unknown }).name;
  const storedRole = (admin as { role?: unknown }).role;
  const role = storedRole === undefined ? "admin" : storedRole;
  if (role !== req.auth?.role) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isValidAdminName(adminName)) {
    logger.error({ requestId: req.id, accountId: req.auth?.id }, "Stored account profile has an invalid name");
    res.status(500).json({ error: "Internal server error" });
    return;
  }
  res.json({ id: admin.id, email: admin.email, name: adminName });
});

export default router;
