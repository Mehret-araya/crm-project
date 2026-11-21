import { mongoose } from "../connection";
import { z } from "zod";
import { getNextSequence } from "./counter";

export type AccountRole = "admin" | "user";

const adminSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    // New account documents default to least privilege; legacy role-less records remain admins.
    role: { type: String, enum: ["admin", "user"], default: "user", required: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { versionKey: false },
);

adminSchema.pre("save", async function () {
  if (this.isNew) {
    this.id = await getNextSequence("admins");
  }
});

export const AccountModel =
  mongoose.models["Admin"] ?? mongoose.model("Admin", adminSchema);
// Keep the old export for the trusted administrator bootstrap and existing callers.
export const AdminModel = AccountModel;

export const insertAdminSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  passwordHash: z.string(),
});

export type InsertAdmin = z.infer<typeof insertAdminSchema>;

export type Account = {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  role?: AccountRole;
  createdAt: Date;
};

export type Admin = Account;
