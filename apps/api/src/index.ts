import express, { type Application } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { resolve } from "path";
import { authRouter } from "./modules/auth/auth.router.js";
import { motorcyclesRouter } from "./modules/inventory/motorcycles.router.js";
import { customersRouter } from "./modules/customers/customers.router.js";
import { salesRouter } from "./modules/sales/sales.router.js";
import { paymentsRouter } from "./modules/payments/payments.router.js";
import { addonsRouter } from "./modules/addons/addons.router.js";
import { installmentsRouter } from "./modules/installments/installments.router.js";
import { notificationsRouter } from "./modules/notifications/notifications.router.js";
import { deliveryNotesRouter } from "./modules/grn/delivery-notes.router.js";
import { lineWebhookRouter } from "./modules/webhooks/line-webhook.router.js";
import { usersRouter } from "./modules/users/users.router.js";
import { permissionsRouter } from "./modules/permissions/permissions.router.js";
import { contractsRouter } from "./modules/contracts/contracts.router.js";
import { financialInstitutionsRouter } from "./modules/financial-institutions/financial-institutions.router.js";
import { settingsRouter } from "./modules/settings/settings.router.js";
import { rolesRouter } from "./modules/roles/roles.router.js";
import { auditRouter } from "./modules/audit/audit.router.js";
import { auditTap, startAuditRetentionJob } from "./lib/audit.js";
import { pdpaResponseMask } from "./middleware/pdpa.js";
import { financeRouter } from "./modules/finance/finance.router.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.router.js";

const app: Application = express();
const PORT = process.env.PORT || 4000;

// Behind a reverse proxy (Caddy/nginx) in production: needed for correct
// client IPs in express-rate-limit and secure-cookie handling.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Allow the web app (different origin in dev/deploy) to embed images we serve
// (payment slips, customer documents) — auth is still enforced per-endpoint.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:3000").split(",");
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

app.use(cookieParser());

// Mount LINE webhook BEFORE express.json() so raw body is available for signature validation
app.use("/api/v1/webhooks/line", lineWebhookRouter);

app.use(express.json());

// Serve uploaded slip images
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";
app.use("/uploads", express.static(resolve(UPLOAD_DIR)));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API v1 routes
app.use("/api/v1", auditTap);
// PDPA policy: mask PII fields in every JSON response unless the requester
// has customers.view_pii — applies to all routes automatically.
app.use("/api/v1", pdpaResponseMask);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/motorcycles", motorcyclesRouter);
app.use("/api/v1/customers", customersRouter);
app.use("/api/v1/sales", salesRouter);
app.use("/api/v1/payments", paymentsRouter);
app.use("/api/v1/addons", addonsRouter);
app.use("/api/v1/installments", installmentsRouter);
app.use("/api/v1/notifications", notificationsRouter);
app.use("/api/v1/delivery-notes", deliveryNotesRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1", permissionsRouter);
app.use("/api/v1/contracts", contractsRouter);
app.use("/api/v1/financial-institutions", financialInstitutionsRouter);
app.use("/api/v1/settings", settingsRouter);
app.use("/api/v1/roles", rolesRouter);
app.use("/api/v1/audit-logs", auditRouter);
app.use("/api/v1/finance", financeRouter);
app.use("/api/v1/dashboard", dashboardRouter);

startAuditRetentionJob();

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});

export default app;
