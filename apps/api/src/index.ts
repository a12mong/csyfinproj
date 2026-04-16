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

const app: Application = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());

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

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});

export default app;
