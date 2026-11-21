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
import { getLeadScope } from "../middlewares/authorization";
import {
  escapeRegexLiteral,
  isDecimalIntegerString,
  isOptionalDecimalInteger,
} from "../lib/lead-search";

const router: IRouter = Router();

router.get("/leads", requireAuth, async (req, res): Promise<void> => {
  if (
    !isOptionalDecimalInteger(req.query.page) ||
    !isOptionalDecimalInteger(req.query.limit)
  ) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const parsed = GetLeadsQueryParams.safeParse(req.query);
  if (
    !parsed.success ||
    !Number.isSafeInteger(parsed.data.page) ||
    !Number.isSafeInteger(parsed.data.limit)
  ) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const { search, status, sort, page = 1, limit = 20 } = parsed.data;
  const offset = (page - 1) * limit;

  const filter: Record<string, unknown> = { ...getLeadScope(req.auth!) };
  if (search) {
    const literalSearch = new RegExp(escapeRegexLiteral(search), "i");
    filter["$or"] = [
      { name: literalSearch },
      { email: literalSearch },
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
      .limit(limit)
      .lean(),
  ]);

  const leads = docs.map((d) => docToLead(d as unknown as Parameters<typeof docToLead>[0]));
  const totalPages = Math.ceil(total / limit);

  res.json({ leads, total, page, limit, totalPages });
});

router.post("/leads", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const owner = req.auth!.role === "user" ? { ownerId: req.auth!.id } : {};
  const doc = await new LeadModel({ ...parsed.data, ...owner }).save();
  res.status(201).json(docToLead(doc as unknown as Parameters<typeof docToLead>[0]));
});

router.get("/leads/:id", requireAuth, async (req, res): Promise<void> => {
  if (!isDecimalIntegerString(req.params.id)) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const params = GetLeadParams.safeParse(req.params);
  if (!params.success || !Number.isSafeInteger(params.data.id)) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const doc = await LeadModel.findOne({ id: params.data.id, ...getLeadScope(req.auth!) }).lean();
  if (!doc) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  res.json(docToLead(doc as unknown as Parameters<typeof docToLead>[0]));
});

router.put("/leads/:id", requireAuth, async (req, res): Promise<void> => {
  if (!isDecimalIntegerString(req.params.id)) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const params = UpdateLeadParams.safeParse(req.params);
  if (!params.success || !Number.isSafeInteger(params.data.id)) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const parsed = UpdateLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const doc = await LeadModel.findOneAndUpdate(
    { id: params.data.id, ...getLeadScope(req.auth!) },
    { ...parsed.data, updatedAt: new Date() },
    { new: true },
  ).lean();

  if (!doc) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  res.json(docToLead(doc as unknown as Parameters<typeof docToLead>[0]));
});

router.delete("/leads/:id", requireAuth, async (req, res): Promise<void> => {
  if (!isDecimalIntegerString(req.params.id)) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const params = DeleteLeadParams.safeParse(req.params);
  if (!params.success || !Number.isSafeInteger(params.data.id)) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const doc = await LeadModel.findOneAndDelete({
    id: params.data.id,
    ...getLeadScope(req.auth!),
  }).lean();
  if (!doc) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  res.sendStatus(204);
});

router.patch("/leads/:id/status", requireAuth, async (req, res): Promise<void> => {
  if (!isDecimalIntegerString(req.params.id)) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const params = UpdateLeadStatusParams.safeParse(req.params);
  if (!params.success || !Number.isSafeInteger(params.data.id)) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const parsed = UpdateLeadStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const doc = await LeadModel.findOneAndUpdate(
    { id: params.data.id, ...getLeadScope(req.auth!) },
    { status: parsed.data.status, updatedAt: new Date() },
    { new: true },
  ).lean();

  if (!doc) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  res.json(docToLead(doc as unknown as Parameters<typeof docToLead>[0]));
});

export default router;
