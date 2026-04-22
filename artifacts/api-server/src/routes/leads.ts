import { Router, IRouter } from "express";
import { LeadModel, docToLead } from "@workspace/db-mongo";
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

  const filter: Record<string, unknown> = {};
  if (search) {
    filter["$or"] = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }
  if (status) {
    filter["status"] = status;
  }

  const sortOrder = sort === "oldest" ? 1 : -1;

  const [total, docs] = await Promise.all([
    LeadModel.countDocuments(filter),
    LeadModel.find(filter)
      .sort({ createdAt: sortOrder })
      .skip(offset)
      .limit(limit as number)
      .lean(),
  ]);

  const leads = docs.map((d) => docToLead(d as Parameters<typeof docToLead>[0]));
  const totalPages = Math.ceil(total / (limit as number));

  res.json({ leads, total, page, limit, totalPages });
});

router.post("/leads", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const doc = await new LeadModel(parsed.data).save();
  res.status(201).json(docToLead(doc as Parameters<typeof docToLead>[0]));
});

router.get("/leads/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const doc = await LeadModel.findOne({ id: params.data.id }).lean();
  if (!doc) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  res.json(docToLead(doc as Parameters<typeof docToLead>[0]));
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

  const doc = await LeadModel.findOneAndUpdate(
    { id: params.data.id },
    { ...parsed.data, updatedAt: new Date() },
    { new: true },
  ).lean();

  if (!doc) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  res.json(docToLead(doc as Parameters<typeof docToLead>[0]));
});

router.delete("/leads/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const doc = await LeadModel.findOneAndDelete({ id: params.data.id }).lean();
  if (!doc) {
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

  const doc = await LeadModel.findOneAndUpdate(
    { id: params.data.id },
    { status: parsed.data.status, updatedAt: new Date() },
    { new: true },
  ).lean();

  if (!doc) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  res.json(docToLead(doc as Parameters<typeof docToLead>[0]));
});

export default router;
