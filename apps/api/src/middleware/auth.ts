import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

export interface AuthPayload {
  sub: string;
  email: string;
  role: "admin" | "staff" | "viewer";
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    console.error("FATAL: JWT_SECRET environment variable must be set and at least 32 characters long. Exiting.");
    process.exit(1);
  }
  return secret;
})();

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  // Accept token from Authorization header (API clients) or HttpOnly cookie (web app)
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : (req.cookies as Record<string, string | undefined>)?.token;

  if (!token) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }
  let payload: AuthPayload;
  try {
    payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  // Verify the user account is still active
  prisma.user.findUnique({ where: { id: payload.sub }, select: { active: true } })
    .then((user) => {
      if (!user || !user.active) {
        res.status(401).json({ error: "Account is inactive or no longer exists" });
        return;
      }
      req.user = payload;
      next();
    })
    .catch(() => {
      res.status(500).json({ error: "Internal server error" });
    });
}

export function requireRole(...roles: Array<"admin" | "staff" | "viewer">) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden: insufficient role" });
      return;
    }
    next();
  };
}

type PermissionAction = "canView" | "canCreate" | "canEdit" | "canDelete";
type PermissionPage =
  | "dashboard"
  | "inventory"
  | "receiving"
  | "sales"
  | "customers"
  | "finance"
  | "payments"
  | "settings";

/**
 * Middleware that checks page-level permissions.
 * Admin users always pass. Other roles are checked against the UserPermission table.
 * Must be used AFTER requireAuth.
 */
export function requirePermission(page: PermissionPage, action: PermissionAction) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Admins bypass all page-level permission checks
    if (req.user.role === "admin") {
      next();
      return;
    }

    prisma.userPermission
      .findUnique({
        where: { userId_page: { userId: req.user.sub, page } },
        select: { [action]: true },
      })
      .then((permission) => {
        if (!permission || !permission[action as keyof typeof permission]) {
          res.status(403).json({ error: `Forbidden: missing ${action} permission on ${page}` });
          return;
        }
        next();
      })
      .catch(() => {
        res.status(500).json({ error: "Internal server error" });
      });
  };
}
