import { Router, IRouter } from "express";
import bcrypt from "bcryptjs";
import { AdminModel } from "@workspace/db-mongo";
import { LoginBody } from "@workspace/api-zod";
import { signToken, requireAuth, AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
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
  res.json({ id: admin["id"], email: admin["email"], name: admin["name"] });
});

export default router;
