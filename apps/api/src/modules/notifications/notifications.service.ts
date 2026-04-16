import { prisma } from "../../lib/prisma.js";
import type { SendRemindersInput, GetLogsQuery } from "./notifications.schemas.js";

const PAGE_SIZE = 20;

// --- Stub channel senders ---

async function sendViaLine(lineId: string, message: string): Promise<boolean> {
  console.log(`[LINE stub] → ${lineId}: ${message}`);
  // TODO: integrate with LINE Messaging API when LINE_CHANNEL_ACCESS_TOKEN is configured
  return true;
}

async function sendViaSms(phone: string, message: string): Promise<boolean> {
  console.log(`[SMS stub] → ${phone}: ${message}`);
  // TODO: integrate with SMS gateway when SMS_API_KEY is configured
  return true;
}

async function sendViaEmail(email: string, message: string): Promise<boolean> {
  console.log(`[Email stub] → ${email}: ${message}`);
  // TODO: integrate with SMTP when SMTP_HOST/SMTP_USER/SMTP_PASS are configured
  return true;
}

// --- Send reminders ---

export async function sendReminders(input: SendRemindersInput) {
  const overdueInstallments = await prisma.installment.findMany({
    where: {
      status: "overdue",
      ...(input.customer_id
        ? { sale: { customerId: input.customer_id } }
        : {}),
    },
    include: {
      sale: {
        include: { customer: true },
      },
    },
  });

  let sent = 0;
  let failed = 0;

  for (const installment of overdueInstallments) {
    const customer = installment.sale.customer;
    const message =
      `แจ้งเตือนค่างวด: ลูกค้า ${customer.name} มียอดค้างชำระ ` +
      `${Number(installment.amountDue).toFixed(2)} บาท ` +
      `(ครบกำหนด ${installment.dueDate.toISOString().slice(0, 10)})`;

    // Determine which channels to send on
    const channels = resolveChannels(input.channel, customer);

    for (const { channel, address } of channels) {
      let success = false;
      try {
        if (channel === "line") {
          success = await sendViaLine(address, message);
        } else if (channel === "sms") {
          success = await sendViaSms(address, message);
        } else {
          success = await sendViaEmail(address, message);
        }
      } catch {
        success = false;
      }

      await prisma.notificationLog.create({
        data: {
          customerId: customer.id,
          installmentId: installment.id,
          channel,
          message,
          status: success ? "sent" : "failed",
          sentAt: success ? new Date() : null,
        },
      });

      if (success) {
        sent++;
      } else {
        failed++;
      }
    }
  }

  return { data: { sent, failed } };
}

// Determine which channel+address pairs to use for a customer
function resolveChannels(
  preferredChannel: "line" | "sms" | "email" | undefined,
  customer: { lineId: string | null; phone: string; email: string | null }
): Array<{ channel: "line" | "sms" | "email"; address: string }> {
  const results: Array<{ channel: "line" | "sms" | "email"; address: string }> = [];

  if (preferredChannel) {
    // Use only the requested channel if customer has that contact info
    if (preferredChannel === "line" && customer.lineId) {
      results.push({ channel: "line", address: customer.lineId });
    } else if (preferredChannel === "sms") {
      results.push({ channel: "sms", address: customer.phone });
    } else if (preferredChannel === "email" && customer.email) {
      results.push({ channel: "email", address: customer.email });
    }
    // If customer doesn't have the preferred channel, fall through to default
    if (results.length > 0) return results;
  }

  // Default: prefer LINE → SMS → email
  if (customer.lineId) {
    results.push({ channel: "line", address: customer.lineId });
  } else if (customer.phone) {
    results.push({ channel: "sms", address: customer.phone });
  } else if (customer.email) {
    results.push({ channel: "email", address: customer.email });
  }

  return results;
}

// --- Notification logs ---

export async function getNotificationLogs(query: GetLogsQuery) {
  const where = {
    ...(query.customer_id ? { customerId: query.customer_id } : {}),
    ...(query.channel ? { channel: query.channel } : {}),
  };

  const [total, data] = await Promise.all([
    prisma.notificationLog.count({ where }),
    prisma.notificationLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
      },
    }),
  ]);

  return { data, total, page: query.page, pageSize: PAGE_SIZE };
}
