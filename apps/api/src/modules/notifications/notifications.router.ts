import { Router, type IRouter, type Request, type Response } from "express";
import { sendRemindersBodySchema, getLogsQuerySchema, sendGreetingBodySchema } from "./notifications.schemas.js";
import { sendReminders, getNotificationLogs, sendGreetingMessage } from "./notifications.service.js";
import { requireAuth } from "../../middleware/auth.js";

export const notificationsRouter: IRouter = Router();

// GET /api/v1/notifications/line-status
notificationsRouter.get("/line-status", requireAuth, (_req: Request, res: Response) => {
  const hasAccessToken = !!process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const hasChannelSecret = !!process.env.LINE_CHANNEL_SECRET;
  res.json({
    data: {
      configured: hasAccessToken && hasChannelSecret,
      hasAccessToken,
      hasChannelSecret,
      webhookUrl: "/api/v1/webhooks/line",
    },
  });
});

// POST /api/v1/notifications/send-reminders
notificationsRouter.post("/send-reminders", requireAuth, async (req: Request, res: Response) => {
  const parsed = sendRemindersBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await sendReminders(parsed.data);
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// GET /api/v1/notifications/logs
notificationsRouter.get("/logs", requireAuth, async (req: Request, res: Response) => {
  const parsed = getLogsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await getNotificationLogs(parsed.data);
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// POST /api/v1/notifications/send-greeting
notificationsRouter.post("/send-greeting", requireAuth, async (req: Request, res: Response) => {
  const parsed = sendGreetingBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await sendGreetingMessage(parsed.data);
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});
