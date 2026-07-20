import { Router, type IRouter } from "express";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

export const auditRouter: IRouter = Router();

// GET /api/v1/audit-logs — admin only
// Filters: entity, user (email contains), date_from, date_to, page
auditRouter.get("/", requireAuth, requireRole("admin"), async (req, res) => {
  const page = Math.max(parseInt(req.query["page"] as string) || 1, 1);
  const limit = 25;
  const entity = (req.query["entity"] as string) || undefined;
  const user = (req.query["user"] as string) || undefined;
  const dateFrom = (req.query["date_from"] as string) || undefined;
  const dateTo = (req.query["date_to"] as string) || undefined;

  const where: Record<string, unknown> = {};
  if (entity) where["entity"] = entity;
  if (user) where["userName"] = { contains: user };
  if (dateFrom || dateTo) {
    where["createdAt"] = {
      ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00`) } : {}),
      ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999`) } : {}),
    };
  }

  try {
    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({ data, total, page, limit });
  } catch (err: unknown) {
    const e = err as { message?: string };
    res.status(500).json({ error: e.message ?? "Internal server error" });
  }
});
