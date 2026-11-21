import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  AdminBootstrapError,
  ADMIN_BOOTSTRAP_LOCK_ID,
  bootstrapInitialAdmin,
  readAdminBootstrapInput,
} from "./admin-bootstrap.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../lib/.env") });

async function main(): Promise<void> {
  const input = readAdminBootstrapInput();
  const bcrypt = await import("bcryptjs");
  const { connectDB, mongoose, AdminModel, CounterModel } = await import("@workspace/db-mongo");

  try {
    await connectDB();

    await bootstrapInitialAdmin(input, {
      countAdmins: () => AdminModel.countDocuments({ role: { $ne: "user" } }),
      claimBootstrap: async () => {
        try {
          await CounterModel.create({ _id: ADMIN_BOOTSTRAP_LOCK_ID, seq: 1 });
          return true;
        } catch (error) {
          if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === 11000
          ) {
            return false;
          }
          throw error;
        }
      },
      hashPassword: (password) => bcrypt.default.hash(password, 12),
      createAdmin: async (admin) => {
        await new AdminModel({ ...admin, role: "admin" }).save();
      },
    });

    console.log("Initial admin account created.");
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  if (error instanceof AdminBootstrapError) {
    console.error(error.message);
  } else {
    console.error("Admin bootstrap failed. Check the configured environment and database connection.");
  }
  process.exitCode = 1;
});
