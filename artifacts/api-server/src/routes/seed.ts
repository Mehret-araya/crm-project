import { Router, IRouter } from "express";
import bcrypt from "bcryptjs";
import { AdminModel } from "@workspace/db-mongo";

const router: IRouter = Router();

const SEED_SECRET = "seed-once-123";

router.post("/seed-admin", async (req, res): Promise<void> => {
  const { name, email, password, secret } = req.body;

  if (secret !== SEED_SECRET) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (!name || !email || !password) {
    res.status(400).json({ error: "name, email and password are required" });
    return;
  }

  const existing = await AdminModel.findOne({ email });
  if (existing) {
    res.status(409).json({ error: "Admin already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await new AdminModel({ name, email, passwordHash }).save();

  res.status(201).json({ message: "Admin created", id: admin.id, email: admin.email });
});

export default router;
