import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../lib/.env") });

// Dynamic imports ensure env vars are loaded before db-mongo reads them
const bcrypt = await import("bcryptjs");
const { connectDB, AdminModel } = await import("@workspace/db-mongo");

const ADMIN_NAME = "Mehret Araya";
const ADMIN_EMAIL = "mehretaraya499@gmail.com";
const ADMIN_PASSWORD = "Mehret@2025";

async function seed() {
  await connectDB();

  const existing = await AdminModel.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    console.log(`Admin with email "${ADMIN_EMAIL}" already exists. Skipping.`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.default.hash(ADMIN_PASSWORD, 10);
  await new AdminModel({ name: ADMIN_NAME, email: ADMIN_EMAIL, passwordHash }).save();

  console.log(`✅ Admin created — email: ${ADMIN_EMAIL}  password: ${ADMIN_PASSWORD}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
