import express, { type Application } from "express";
import cors from "cors";
import { authRouter } from "./modules/auth/auth.router.js";
import { motorcyclesRouter } from "./modules/inventory/motorcycles.router.js";
import { customersRouter } from "./modules/customers/customers.router.js";
import { salesRouter } from "./modules/sales/sales.router.js";
import { paymentsRouter } from "./modules/payments/payments.router.js";
import { addonsRouter } from "./modules/addons/addons.router.js";
import { installmentsRouter } from "./modules/installments/installments.router.js";

const app: Application = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});

export default app;
