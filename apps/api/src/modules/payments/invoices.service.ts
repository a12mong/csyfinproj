import { prisma } from "../../lib/prisma.js";
import { calculateVat } from "../../lib/vat.js";

export async function generateTaxInvoiceNumber(tx: any = prisma): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
  const prefix = `TXN-${dateStr}-`;

  const lastInvoice = await tx.taxInvoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: "desc" },
  });

  let seq = 1;
  if (lastInvoice) {
    const lastSeqStr = lastInvoice.invoiceNumber.replace(prefix, "");
    const lastSeq = parseInt(lastSeqStr, 10);
    if (!isNaN(lastSeq)) {
      seq = lastSeq + 1;
    }
  }

  return `${prefix}${String(seq).padStart(4, "0")}`;
}

export async function createTaxInvoice(
  tx: any,
  options: {
    saleId?: string | null;
    paymentId?: string | null;
    customerId: string;
    type: "motorcycle" | "commission" | "installment" | "addon" | "down_payment";
    totalAmount: number;
  }
) {
  const vatCalc = calculateVat(options.totalAmount, "included");
  const invoiceNumber = await generateTaxInvoiceNumber(tx);

  return await tx.taxInvoice.create({
    data: {
      invoiceNumber,
      saleId: options.saleId ?? null,
      paymentId: options.paymentId ?? null,
      customerId: options.customerId,
      type: options.type,
      amount: vatCalc.amountBeforeTax,
      vatAmount: vatCalc.vatAmount,
      totalAmount: options.totalAmount,
    },
  });
}
