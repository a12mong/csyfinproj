import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API v1 routes will be mounted here
// app.use("/api/v1/auth", authRouter);
// app.use("/api/v1/motorcycles", motorcyclesRouter);
// app.use("/api/v1/customers", customersRouter);
// app.use("/api/v1/sales", salesRouter);
// app.use("/api/v1/installments", installmentsRouter);
// app.use("/api/v1/payments", paymentsRouter);
// app.use("/api/v1/notifications", notificationsRouter);
// app.use("/api/v1/addons", addonsRouter);

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});

export default app;
