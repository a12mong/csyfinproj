import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { createLinePayment } from "../payments/payments.service.js";
import { linkCustomerByCode } from "../customers/customers.service.js";
import { auditSystem } from "../../lib/audit.js";

export const lineWebhookRouter: IRouter = Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

/**
 * Validate the X-Line-Signature header against the raw request body.
 * Returns true if signature is valid or if no channel secret is configured (dev mode).
 */
function validateLineSignature(rawBody: Buffer, signature: string | undefined): boolean {
  if (!LINE_CHANNEL_SECRET) {
    console.warn("[LINE Webhook] LINE_CHANNEL_SECRET not set — skipping signature validation");
    return true;
  }
  if (!signature) return false;

  const expected = crypto
    .createHmac("sha256", LINE_CHANNEL_SECRET)
    .update(rawBody)
    .digest("base64");

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

/**
 * Download an image message content from the LINE Content API and save to disk.
 * Returns the local URL path, or undefined if download fails / no access token.
 */
async function downloadLineImage(messageId: string): Promise<string | undefined> {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.warn("[LINE Webhook] LINE_CHANNEL_ACCESS_TOKEN not set — cannot download image");
    return undefined;
  }

  try {
    const response = await fetch(
      `https://api-data.line.me/v2/bot/message/${messageId}/content`,
      {
        headers: { Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
      }
    );

    if (!response.ok) {
      console.error(`[LINE Webhook] Failed to download image for message ${messageId}: ${response.status}`);
      return undefined;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const filename = `line-${messageId}-${Date.now()}.jpg`;
    const filePath = path.join(UPLOAD_DIR, filename);

    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    fs.writeFileSync(filePath, buffer);
    return `/uploads/${filename}`;
  } catch (err) {
    console.error("[LINE Webhook] Error downloading image:", err);
    return undefined;
  }
}

/**
 * Reply to a LINE message using the reply token (free, no push quota).
 */
async function replyLineMessage(replyToken: string, text: string): Promise<void> {
  if (!LINE_CHANNEL_ACCESS_TOKEN) return;
  try {
    await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ replyToken, messages: [{ type: "text", text }] }),
    });
  } catch (err) {
    console.error("[LINE Webhook] Failed to reply:", err);
  }
}

/**
 * Fetch a LINE user's profile picture URL via the Messaging API.
 */
async function fetchLineProfilePicture(lineUserId: string): Promise<string | undefined> {
  if (!LINE_CHANNEL_ACCESS_TOKEN) return undefined;
  try {
    const res = await fetch(`https://api.line.me/v2/bot/profile/${lineUserId}`, {
      headers: { Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
    });
    if (!res.ok) return undefined;
    const profile = (await res.json()) as { pictureUrl?: string };
    return profile.pictureUrl;
  } catch {
    return undefined;
  }
}

// Matches "LINK A1B2C3" / "link a1b2c3" / bare "A1B2C3" (6 chars, unambiguous alphabet)
const LINK_MESSAGE_RE = /^(?:LINK[\s:-]*)?([A-HJ-NP-Z2-9]{6})$/i;

/**
 * Handle a text message: if it carries a link code, bind the sender's LINE
 * account to the matching customer record and reply with the result.
 */
async function handleLinkTextMessage(
  text: string,
  lineUserId: string,
  replyToken: string | undefined
): Promise<boolean> {
  const match = text.trim().match(LINK_MESSAGE_RE);
  if (!match) return false;

  const code = match[1]!.toUpperCase();
  const pictureUrl = await fetchLineProfilePicture(lineUserId);
  const customer = await linkCustomerByCode(code, lineUserId, pictureUrl);

  if (customer) {
    console.log(`[LINE Webhook] Linked LINE user ${lineUserId} to customer ${customer.id}`);
    auditSystem({
      action: "link",
      entity: "customers",
      entityId: customer.id,
      summary: `ลูกค้า "${customer.name}" เชื่อมบัญชี LINE ผ่านรหัสในแชท OA`,
    });
    if (replyToken) {
      await replyLineMessage(
        replyToken,
        `เชื่อมต่อบัญชี LINE สำเร็จ! ✅\nคุณ ${customer.name} จะได้รับการแจ้งเตือนค่างวดและใบเสร็จผ่าน LINE นี้ และสามารถส่งสลิปโอนเงินเข้ามาในแชทนี้ได้เลยครับ 🏍️`
      );
    }
  } else {
    console.warn(`[LINE Webhook] Link code ${code} not found or expired (user ${lineUserId})`);
    if (replyToken) {
      await replyLineMessage(
        replyToken,
        `รหัสเชื่อมต่อไม่ถูกต้องหรือหมดอายุแล้ว ⚠️\nกรุณาติดต่อเจ้าหน้าที่เพื่อขอรหัสใหม่ หรือสแกน QR Code จากหน้าจอเจ้าหน้าที่อีกครั้งครับ`
      );
    }
  }
  return true;
}

// LINE Webhook types (minimal)
interface LineMessageEvent {
  type: "message";
  source: { type: string; userId?: string; groupId?: string; roomId?: string };
  message: { type: string; id: string; text?: string };
  replyToken?: string;
  timestamp: number;
}

interface LineWebhookPayload {
  destination: string;
  events: LineMessageEvent[];
}

/**
 * POST /api/v1/webhooks/line
 *
 * Receives LINE Messaging API webhook events.
 * When a user sends an image message, auto-creates an unverified Payment record
 * matched by the customer's line_id.
 *
 * Uses express.raw() middleware so the raw body is available for HMAC-SHA256 validation.
 */
lineWebhookRouter.post(
  "/",
  // Parse raw body for signature validation — must come before express.json()
  (req: Request, res: Response, next) => {
    // If body is already a Buffer (from express.raw upstream), proceed
    if (Buffer.isBuffer(req.body)) {
      next();
      return;
    }
    // Otherwise use inline raw parser
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      (req as Request & { rawBody: Buffer }).rawBody = Buffer.concat(chunks);
      try {
        req.body = JSON.parse((req as Request & { rawBody: Buffer }).rawBody.toString("utf8"));
      } catch {
        req.body = {};
      }
      next();
    });
    req.on("error", () => {
      res.status(400).json({ error: "Failed to read request body" });
    });
  },
  async (req: Request, res: Response) => {
    const rawBody: Buffer =
      (req as Request & { rawBody?: Buffer }).rawBody ?? Buffer.from(JSON.stringify(req.body));

    const signature = req.headers["x-line-signature"] as string | undefined;

    if (!validateLineSignature(rawBody, signature)) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    const payload = req.body as LineWebhookPayload;

    if (!payload?.events || !Array.isArray(payload.events)) {
      // Webhook verification call from LINE (empty events)
      res.status(200).json({ ok: true });
      return;
    }

    for (const event of payload.events) {
      if (event.type !== "message") continue;

      const lineUserId = event.source?.userId;
      if (!lineUserId) continue;

      // Text messages: account-link codes ("LINK A1B2C3")
      if (event.message.type === "text" && event.message.text) {
        await handleLinkTextMessage(event.message.text, lineUserId, event.replyToken);
        continue;
      }

      // Image messages: payment slips
      if (event.message.type !== "image") continue;

      const messageId = event.message.id;

      // Download the slip image in the background
      const slipImageUrl = await downloadLineImage(messageId);

      const result = await createLinePayment({
        lineUserId,
        lineMessageId: messageId,
        slipImageUrl,
      });

      if (result) {
        console.log(
          `[LINE Webhook] Auto-created payment ${result.data.id} for customer ${result.customer.id} installment ${result.installment.id}`
        );
      } else {
        console.warn(
          `[LINE Webhook] No matching customer or installment for LINE user ${lineUserId}`
        );
      }
    }

    res.status(200).json({ ok: true });
  }
);
