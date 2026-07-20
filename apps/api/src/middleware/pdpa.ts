import type { Request, Response, NextFunction } from "express";
import { maskIdCard } from "../lib/audit.js";
import { resolveUserPermissions } from "./auth.js";

/**
 * PDPA response-masking policy — applied globally to every JSON response.
 *
 * Any field listed here is masked in ALL API responses (no matter which
 * endpoint or how deeply nested) unless the requesting user has the
 * `customers.view_pii` permission. Adding a new protected field is a
 * one-line change here; individual routes never need to handle masking.
 */
const PII_FIELD_MASKS: Record<string, (v: string) => string> = {
  idCardNumber: maskIdCard,
  id_card_number: maskIdCard,
  // เพิ่ม field อื่นในอนาคตได้ที่นี่ เช่น:
  // phone: maskPhone,
};

const MAX_DEPTH = 8;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return (
    typeof v === "object" &&
    v !== null &&
    (v.constructor === Object || Object.getPrototypeOf(v) === null)
  );
}

/**
 * Recursively mask PII fields. Only plain objects/arrays are traversed —
 * Dates, Prisma Decimals, Buffers etc. pass through untouched so JSON
 * serialization stays identical apart from the masked fields.
 */
export function maskPiiDeep(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH || value == null) return value;

  if (Array.isArray(value)) {
    return value.map((v) => maskPiiDeep(v, depth + 1));
  }

  if (isPlainObject(value)) {
    let changed = false;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (k in PII_FIELD_MASKS && typeof v === "string" && v.length > 0) {
        out[k] = PII_FIELD_MASKS[k]!(v);
        changed = true;
      } else {
        const masked = maskPiiDeep(v, depth + 1);
        if (masked !== v) changed = true;
        out[k] = masked;
      }
    }
    return changed ? out : value;
  }

  return value;
}

/**
 * Express middleware: wraps res.json so every JSON payload is passed through
 * the PDPA policy. Permission is resolved at send time (after requireAuth has
 * populated req.user). Unauthenticated/public responses are always masked.
 */
export function pdpaResponseMask(req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json.bind(res);

  res.json = ((body: unknown) => {
    const send = (masked: boolean) => {
      try {
        originalJson(masked ? maskPiiDeep(body) : body);
      } catch (err) {
        console.error("[PDPA] mask/serialize error:", err);
        originalJson(body);
      }
    };

    if (!req.user) {
      send(true);
      return res;
    }

    resolveUserPermissions(req.user.sub, req.user.role)
      .then((perms) => send(!perms["customers.view_pii"]))
      .catch(() => send(true));

    return res;
  }) as Response["json"];

  next();
}
