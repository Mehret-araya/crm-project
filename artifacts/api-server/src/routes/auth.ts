import { Router, IRouter } from "express";
import bcrypt from "bcryptjs";
import { AdminModel } from "@workspace/db-mongo";
import { LoginBody } from "@workspace/api-zod";
import { signToken, requireAuth, AuthenticatedRequest } from "../middlewares/auth";
import { loginRateLimiter } from "../middlewares/login-rate-limit";
import { logger } from "../lib/logger";
import { isValidAdminName } from "../lib/admin-profile";

const router: IRouter = Router();

router.post("/auth/login", loginRateLimiter, async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const { email, password } = parsed.data;

  const admin = await AdminModel.findOne({ email }).lean();
  if (!admin) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, admin["passwordHash"] as string);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signToken(admin["id"] as number);
  res.json({
    token,
    user: { id: admin["id"], email: admin["email"], name: admin["name"] },
  });
});

router.get("/auth/me", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const admin = await AdminModel.findOne({ id: req.adminId }).lean();
  if (!admin) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const adminName = (admin as { name?: unknown }).name;
  if (!isValidAdminName(adminName)) {
    logger.error({ requestId: req.id, adminId: req.adminId }, "Stored admin profile has an invalid name");
    res.status(500).json({ error: "Internal server error" });
    return;
  }
  res.json({ id: admin["id"], email: admin["email"], name: adminName });
});

export default router;
