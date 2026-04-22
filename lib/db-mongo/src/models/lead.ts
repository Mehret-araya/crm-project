import { mongoose } from "../connection";
import { z } from "zod";
import { getNextSequence } from "./counter";

const leadSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    source: {
      type: String,
      required: true,
      default: "Website",
      enum: ["Website", "Social Media", "Referral", "Cold Call", "Email Campaign", "Other"],
    },
    status: {
      type: String,
      required: true,
      default: "New",
      enum: ["New", "Contacted", "Converted"],
    },
    notes: { type: String, default: null },
    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
  },
  { versionKey: false },
);

leadSchema.pre("save", async function () {
  if (this.isNew) {
    this.id = await getNextSequence("leads");
  }
  this.updatedAt = new Date();
});

export const LeadModel =
  mongoose.models["Lead"] ?? mongoose.model("Lead", leadSchema);

export const insertLeadSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  source: z.enum(["Website", "Social Media", "Referral", "Cold Call", "Email Campaign", "Other"]).default("Website"),
  status: z.enum(["New", "Contacted", "Converted"]).default("New"),
  notes: z.string().nullish(),
});

export const updateLeadSchema = insertLeadSchema.partial();

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type UpdateLead = z.infer<typeof updateLeadSchema>;

export type Lead = {
  id: number;
  name: string;
  email: string;
  phone: string;
  source: string;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function docToLead(doc: mongoose.Document & Record<string, unknown>): Lead {
  return {
    id: doc["id"] as number,
    name: doc["name"] as string,
    email: doc["email"] as string,
    phone: doc["phone"] as string,
    source: doc["source"] as string,
    status: doc["status"] as string,
    notes: (doc["notes"] as string | null | undefined) ?? null,
    createdAt: doc["createdAt"] as Date,
    updatedAt: doc["updatedAt"] as Date,
  };
}
