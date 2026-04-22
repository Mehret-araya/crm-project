export { connectDB, mongoose } from "./connection";
export { LeadModel, insertLeadSchema, updateLeadSchema, docToLead } from "./models/lead";
export type { InsertLead, UpdateLead, Lead } from "./models/lead";
export { AdminModel, insertAdminSchema } from "./models/admin";
export type { InsertAdmin, Admin } from "./models/admin";
