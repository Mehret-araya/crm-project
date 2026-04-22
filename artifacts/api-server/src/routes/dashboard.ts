import { Router, IRouter } from "express";
import { LeadModel, docToLead } from "@workspace/db-mongo";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/dashboard/stats", requireAuth, async (_req, res): Promise<void> => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalLeads, newLeads, contactedLeads, convertedLeads, leadsThisMonth] =
    await Promise.all([
      LeadModel.countDocuments(),
      LeadModel.countDocuments({ status: "New" }),
      LeadModel.countDocuments({ status: "Contacted" }),
      LeadModel.countDocuments({ status: "Converted" }),
      LeadModel.countDocuments({ createdAt: { $gte: startOfMonth } }),
    ]);

  const conversionRate =
    totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100 * 10) / 10 : 0;

  res.json({
    totalLeads,
    newLeads,
    contactedLeads,
    convertedLeads,
    conversionRate,
    leadsThisMonth,
  });
});

router.get("/dashboard/recent", requireAuth, async (_req, res): Promise<void> => {
  const docs = await LeadModel.find().sort({ updatedAt: -1 }).limit(8).lean();
  res.json(docs.map((d) => docToLead(d as Parameters<typeof docToLead>[0])));
});

router.get("/dashboard/sources", requireAuth, async (_req, res): Promise<void> => {
  const result = await LeadModel.aggregate<{ source: string; count: number }>([
    { $group: { _id: "$source", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $project: { _id: 0, source: "$_id", count: 1 } },
  ]);

  res.json(result);
});

export default router;
