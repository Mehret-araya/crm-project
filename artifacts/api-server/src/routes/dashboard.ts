import { Router, IRouter } from "express";
import { db, leadsTable } from "@workspace/db";
import { eq, count, sql, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/dashboard/stats", requireAuth, async (_req, res): Promise<void> => {
  const [totalResult, newResult, contactedResult, convertedResult, thisMonthResult] = await Promise.all([
    db.select({ count: count() }).from(leadsTable),
    db.select({ count: count() }).from(leadsTable).where(eq(leadsTable.status, "New")),
    db.select({ count: count() }).from(leadsTable).where(eq(leadsTable.status, "Contacted")),
    db.select({ count: count() }).from(leadsTable).where(eq(leadsTable.status, "Converted")),
    db.select({ count: count() }).from(leadsTable).where(
      sql`date_trunc('month', ${leadsTable.createdAt}) = date_trunc('month', now())`
    ),
  ]);

  const totalLeads = Number(totalResult[0]?.count ?? 0);
  const newLeads = Number(newResult[0]?.count ?? 0);
  const contactedLeads = Number(contactedResult[0]?.count ?? 0);
  const convertedLeads = Number(convertedResult[0]?.count ?? 0);
  const leadsThisMonth = Number(thisMonthResult[0]?.count ?? 0);
  const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100 * 10) / 10 : 0;

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
  const leads = await db
    .select()
    .from(leadsTable)
    .orderBy(desc(leadsTable.updatedAt))
    .limit(8);

  res.json(leads);
});

router.get("/dashboard/sources", requireAuth, async (_req, res): Promise<void> => {
  const result = await db
    .select({
      source: leadsTable.source,
      count: count(),
    })
    .from(leadsTable)
    .groupBy(leadsTable.source)
    .orderBy(desc(count()));

  res.json(result.map((r) => ({ source: r.source, count: Number(r.count) })));
});

export default router;
