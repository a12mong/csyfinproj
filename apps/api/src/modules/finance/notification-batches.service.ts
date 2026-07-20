import { prisma } from "../../lib/prisma.js";
import { sendInstallmentReminder } from "../notifications/notifications.service.js";
import type { NotificationChannel } from "@prisma/client";

/**
 * Create a notification batch from a list of installment ids.
 * Snapshots customer/contract/amount per item so the batch remains a
 * self-contained audit record even if the underlying data changes later.
 */
export async function createNotificationBatch(input: {
  installmentIds: string[];
  channel?: NotificationChannel;
  source?: string;
  createdByUserId?: string;
}) {
  const installments = await prisma.installment.findMany({
    where: { id: { in: input.installmentIds } },
    include: {
      contract: { select: { contractNumber: true, customer: { select: { id: true, name: true } } } },
      sale: { select: { customer: { select: { id: true, name: true } } } },
    },
  });

  if (installments.length === 0) {
    throw Object.assign(new Error("No matching installments found"), { statusCode: 400 });
  }

  const batch = await prisma.notificationBatch.create({
    data: {
      source: input.source ?? "manual",
      channel: input.channel ?? null,
      status: "pending",
      totalCount: installments.length,
      createdByUserId: input.createdByUserId ?? null,
      items: {
        create: installments.map((inst) => {
          const customer = inst.contract?.customer ?? inst.sale?.customer ?? null;
          return {
            installmentId: inst.id,
            customerId: customer?.id ?? null,
            customerName: customer?.name ?? null,
            contractNumber: inst.contract?.contractNumber ?? null,
            amount: Number(inst.amountDue) - Number(inst.amountPaid),
            status: "pending" as const,
          };
        }),
      },
    },
    include: { items: true },
  });

  return batch;
}

/**
 * Process all pending items in a batch sequentially. Designed so a future
 * scheduler can pick up pending batches and call this as well.
 */
export async function processNotificationBatch(batchId: string) {
  const batch = await prisma.notificationBatch.findUnique({
    where: { id: batchId },
    include: { items: { where: { status: "pending" } } },
  });
  if (!batch) {
    throw Object.assign(new Error("Batch not found"), { statusCode: 404 });
  }

  await prisma.notificationBatch.update({
    where: { id: batchId },
    data: { status: "processing", startedAt: new Date() },
  });

  let sent = 0;
  let failed = 0;

  for (const item of batch.items) {
    try {
      const result = await sendInstallmentReminder(
        item.installmentId,
        batch.channel ?? undefined
      );
      const usedChannel = result.channels[0] ?? null;
      await prisma.notificationBatchItem.update({
        where: { id: item.id },
        data: {
          status: result.success ? "sent" : "failed",
          channel: usedChannel,
          error: result.success
            ? null
            : result.attemptedChannels.length === 0
            ? "ไม่มีช่องทางติดต่อของลูกค้า (no contact channel)"
            : `ส่งไม่สำเร็จ (${result.attemptedChannels.join(", ")})`,
          sentAt: result.success ? new Date() : null,
        },
      });
      if (result.success) sent++;
      else failed++;
    } catch (err: unknown) {
      const e = err as { message?: string };
      await prisma.notificationBatchItem.update({
        where: { id: item.id },
        data: { status: "failed", error: (e.message ?? "Unknown error").slice(0, 500) },
      });
      failed++;
    }
  }

  const updated = await prisma.notificationBatch.update({
    where: { id: batchId },
    data: {
      status: failed > 0 && sent === 0 ? "failed" : "completed",
      sentCount: { increment: sent },
      failedCount: { increment: failed },
      completedAt: new Date(),
    },
    include: {
      items: { orderBy: { createdAt: "asc" } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  return updated;
}

export async function listNotificationBatches(page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    prisma.notificationBatch.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { id: true, name: true } },
        items: { orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.notificationBatch.count(),
  ]);
  return { data, total, page };
}
