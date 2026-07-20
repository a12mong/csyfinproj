import type { Request, Response, NextFunction } from "express";
import { prisma } from "./prisma.js";

// ─── PDPA masking helpers ─────────────────────────────────────────────────────

export function maskIdCard(id: string): string {
  if (!id || id.length < 6) return "*".repeat(id?.length ?? 0);
  return id.slice(0, 2) + "*".repeat(id.length - 5) + id.slice(-3);
}

export function maskPhone(phone: string): string {
  const digits = phone ?? "";
  if (digits.length < 5) return "*".repeat(digits.length);
  return digits.slice(0, 3) + "***" + digits.slice(-3);
}

export function maskEmail(email: string): string {
  const [local, domain] = (email ?? "").split("@");
  if (!domain) return "***";
  return (local ?? "").slice(0, 2) + "***@" + domain;
}

// Keys stripped or masked before anything is written to the audit trail
const STRIP_KEYS = new Set(["password", "newPassword", "passwordHash", "token"]);
const MASK_RULES: Record<string, (v: string) => string> = {
  idCardNumber: maskIdCard,
  id_card_number: maskIdCard,
  phone: maskPhone,
  email: maskEmail,
  lineId: () => "U***",
  line_id: () => "U***",
};

export function maskForAudit(value: unknown, depth = 0): unknown {
  if (depth > 4 || value == null) return value;
  if (Array.isArray(value)) return value.map((v) => maskForAudit(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (STRIP_KEYS.has(k)) {
        out[k] = "[ซ่อน]";
      } else if (k in MASK_RULES && typeof v === "string") {
        out[k] = MASK_RULES[k]!(v);
      } else {
        out[k] = maskForAudit(v, depth + 1);
      }
    }
    return out;
  }
  return value;
}

// ─── Entity naming (Thai) from URL path ───────────────────────────────────────

const ENTITY_LABELS: Record<string, string> = {
  auth: "การเข้าสู่ระบบ",
  motorcycles: "รถจักรยานยนต์",
  addons: "สินค้า/บริการเสริม",
  "delivery-notes": "ใบรับสินค้า",
  sales: "รายการขาย",
  customers: "ลูกค้า",
  contracts: "สัญญา",
  installments: "งวดชำระ",
  payments: "การรับชำระ",
  finance: "การเงิน",
  notifications: "การแจ้งเตือน",
  users: "ผู้ใช้งาน",
  roles: "role และสิทธิ์",
  settings: "การตั้งค่า",
  webhooks: "LINE webhook",
};

const ACTION_LABELS: Record<string, string> = {
  POST: "สร้าง/ดำเนินการ",
  PATCH: "แก้ไข",
  PUT: "แก้ไข",
  DELETE: "ลบ",
};

/**
 * Express middleware: records every mutating API call (POST/PATCH/PUT/DELETE)
 * into audit_logs after the response finishes. Request bodies are PDPA-masked
 * before storage. Fire-and-forget — never blocks or fails the request.
 */
export function auditTap(req: Request, res: Response, next: NextFunction): void {
  if (!["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) {
    next();
    return;
  }
  // LINE webhook is high-volume machine traffic; linking is logged separately
  if (req.path.startsWith("/webhooks/")) {
    next();
    return;
  }

  const startedPath = req.path;
  res.on("finish", () => {
    try {
      const segments = startedPath.split("/").filter(Boolean);
      const entityKey = segments[0] ?? "unknown";
      // Pull a plausible entity id out of the path (uuid segment)
      const entityId =
        segments.find((s) => /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(s)) ?? null;

      const entityLabel = ENTITY_LABELS[entityKey] ?? entityKey;
      const actionLabel = ACTION_LABELS[req.method] ?? req.method;
      const suffix = segments.length > 1 ? ` (${segments.slice(1).filter((s) => s !== entityId).join("/")})` : "";
      const ok = res.statusCode < 400;
      const summary = `${actionLabel}${entityLabel ? " " + entityLabel : ""}${suffix}${ok ? "" : " — ไม่สำเร็จ"}`;

      const body =
        req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)
          ? (maskForAudit(req.body) as object)
          : undefined;

      prisma.auditLog
        .create({
          data: {
            userId: req.user?.sub ?? null,
            userName: req.user?.email ?? null,
            action: req.method.toLowerCase(),
            entity: entityKey.slice(0, 60),
            entityId,
            summary: summary.slice(0, 500),
            changes: body as never,
            ipAddress:
              (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
              req.socket?.remoteAddress ??
              null,
            statusCode: res.statusCode,
          },
        })
        .catch((err) => console.error("[Audit] failed to write log:", err));
    } catch (err) {
      console.error("[Audit] tap error:", err);
    }
  });
  next();
}

/** Direct audit entry for system events (e.g. LINE webhook account link). */
export async function auditSystem(entry: {
  action: string;
  entity: string;
  entityId?: string;
  summary: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action.slice(0, 20),
        entity: entry.entity.slice(0, 60),
        entityId: entry.entityId ?? null,
        summary: entry.summary.slice(0, 500),
      },
    });
  } catch (err) {
    console.error("[Audit] failed to write system log:", err);
  }
}

// ─── Retention cleanup ────────────────────────────────────────────────────────

/**
 * Delete audit logs older than the configured retention period.
 * Runs at boot and then every 24 hours.
 */
export function startAuditRetentionJob() {
  const run = async () => {
    try {
      const { getSetting } = await import("../modules/settings/settings.service.js");
      const days = parseInt((await getSetting("audit_retention_days")) ?? "365") || 365;
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const result = await prisma.auditLog.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      if (result.count > 0) {
        console.log(`[Audit] retention cleanup removed ${result.count} logs (> ${days} days)`);
      }
    } catch (err) {
      console.error("[Audit] retention job error:", err);
    }
  };
  run();
  setInterval(run, 24 * 60 * 60 * 1000);
}
