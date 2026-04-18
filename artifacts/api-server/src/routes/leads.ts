import { Router, IRouter } from "express";
import { db, leadsTable } from "@workspace/db";
import { eq, ilike, or, desc, asc, count, sql } from "drizzle-orm";
import {
  CreateLeadBody,
  UpdateLeadBody,
  GetLeadParams,
  UpdateLeadParams,
  DeleteLeadParams,
  UpdateLeadStatusParams,
  UpdateLeadStatusBody,
  GetLeadsQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/leads", requireAuth, async (req, res): Promise<void> => {
  const parsed = GetLeadsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { search, status, sort, page = 1, limit = 20 } = parsed.data;
  const offset = ((page as number) - 1) * (limit as number);

  let query = db.select().from(leadsTable);
  let countQuery = db.select({ count: count() }).from(leadsTable);

  const conditions = [];
  if (search) {
    const searchCondition = or(
      ilike(leadsTable.name, `%${search}%`),
      ilike(leadsTable.email, `%${search}%`),
    );
    conditions.push(searchCondition);
  }
  if (status) {
    conditions.push(eq(leadsTable.status, status));
  }

  if (conditions.length > 0) {
    const whereClause = conditions.length === 1 ? conditions[0]! : sql`${conditions[0]} AND ${conditions[1]}`;
    query = query.where(whereClause) as typeof query;
    countQuery = countQuery.where(whereClause) as typeof countQuery;
  }

  const orderFn = sort === "oldest" ? asc : desc;
  const [totalResult, leads] = await Promise.all([
    countQuery,
    query.orderBy(orderFn(leadsTable.createdAt)).limit(limit as number).offset(offset),
  ]);

  const total = totalResult[0]?.count ?? 0;
  const totalPages = Math.ceil((total as number) / (limit as number));

  res.json({ leads, total, page, limit, totalPages });
});

router.post("/leads", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [lead] = await db.insert(leadsTable).values(parsed.data).returning();
  res.status(201).json(lead);
});

router.get("/leads/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, params.data.id));
  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  res.json(lead);
});

router.put("/leads/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [lead] = await db
    .update(leadsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(leadsTable.id, params.data.id))
    .returning();

  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  res.json(lead);
});

router.delete("/leads/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [lead] = await db.delete(leadsTable).where(eq(leadsTable.id, params.data.id)).returning();
  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  res.sendStatus(204);
});

router.patch("/leads/:id/status", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateLeadStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateLeadStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [lead] = await db
    .update(leadsTable)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(leadsTable.id, params.data.id))
    .returning();

  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  res.json(lead);
});

export default router;
