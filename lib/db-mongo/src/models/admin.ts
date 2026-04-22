import { mongoose } from "../connection";
import { z } from "zod";
import { getNextSequence } from "./counter";

const adminSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { versionKey: false },
);

adminSchema.pre("save", async function () {
  if (this.isNew) {
    this.id = await getNextSequence("admins");
  }
});

export const AdminModel =
  mongoose.models["Admin"] ?? mongoose.model("Admin", adminSchema);

export const insertAdminSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  passwordHash: z.string(),
});

export type InsertAdmin = z.infer<typeof insertAdminSchema>;

export type Admin = {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
};
