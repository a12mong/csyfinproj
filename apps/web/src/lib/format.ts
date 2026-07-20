// Central Thai formatting for the whole app.
// Config is loaded from system settings (ตั้งค่า → ระบบ) after login.

interface FormatConfig {
  dateFormat: "buddhist" | "gregorian";
  decimalPlaces: number;
}

let config: FormatConfig = { dateFormat: "buddhist", decimalPlaces: 2 };

export function setFormatConfig(partial: Partial<FormatConfig>) {
  config = { ...config, ...partial };
}

export function getFormatConfig(): FormatConfig {
  return config;
}

function locale(): string {
  // th-TH defaults to the Buddhist calendar; force Gregorian when configured
  return config.dateFormat === "gregorian" ? "th-TH-u-ca-gregory" : "th-TH";
}

/** ฿1,234.56 — decimal places follow the system setting */
export function formatPrice(n: number | string | null | undefined): string {
  if (n == null || n === "" || isNaN(Number(n))) return "—";
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: config.decimalPlaces,
  }).format(Number(n));
}

/** 20 ก.ค. 2569 (แบบย่อ) */
export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(locale(), {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** 20 กรกฎาคม 2569 (แบบเต็ม — ใช้ในเอกสาร) */
export function formatDateFull(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(locale(), {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** 20 ก.ค. 2569 14:30 */
export function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString(locale(), {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * Contextual label for an installment: a partially paid installment whose due
 * date is still in the future is an ADVANCE payment (ชำระล่วงหน้า), not a
 * carried balance — the current date vs. due date is the standard.
 */
export function installmentStatusLabel(
  status: string,
  dueDate?: string | Date | null
): string {
  if (status === "partially_paid" && dueDate) {
    return new Date(dueDate).getTime() > Date.now()
      ? "ชำระล่วงหน้าบางส่วน"
      : "ค้างชำระบางส่วน";
  }
  return TH.installmentStatus[status] ?? status;
}

/** True when a partially paid installment is actually an advance payment. */
export function isAdvancePartial(
  status: string,
  dueDate?: string | Date | null
): boolean {
  return (
    status === "partially_paid" &&
    !!dueDate &&
    new Date(dueDate).getTime() > Date.now()
  );
}

// ─── Thai labels for enums used across the app ────────────────────────────────

export const TH = {
  saleStatus: {
    active: "กำลังผ่อน",
    completed: "เสร็จสิ้น",
    defaulted: "ผิดนัดชำระ",
    cancelled: "ยกเลิก",
  } as Record<string, string>,
  contractStatus: {
    active: "กำลังผ่อน",
    completed: "ปิดสัญญา",
    defaulted: "ผิดนัดชำระ",
    cancelled: "ยกเลิก",
  } as Record<string, string>,
  installmentStatus: {
    pending: "ค้างชำระ",
    paid: "ชำระแล้ว",
    overdue: "เกินกำหนด",
    partially_paid: "ชำระบางส่วน",
  } as Record<string, string>,
  paymentMethod: {
    cash: "เงินสด",
    installment: "ผ่อนกับร้าน",
    finance_company: "ไฟแนนซ์",
  } as Record<string, string>,
  paymentChannel: {
    cash: "เงินสด",
    bank_transfer: "โอนธนาคาร",
    line: "LINE",
  } as Record<string, string>,
  motorcycleStatus: {
    in_stock: "พร้อมขาย",
    reserved: "จองแล้ว",
    sold: "ขายแล้ว",
  } as Record<string, string>,
  grnStatus: {
    pending: "รอตรวจรับ",
    verified: "ตรวจรับแล้ว",
    cancelled: "ยกเลิก",
  } as Record<string, string>,
  customerType: {
    personal: "บุคคลทั่วไป",
    individual: "บุคคลทั่วไป",
    finance: "ไฟแนนซ์",
  } as Record<string, string>,
  notificationStatus: {
    sent: "ส่งแล้ว",
    failed: "ล้มเหลว",
    pending: "รอส่ง",
  } as Record<string, string>,
} as const;
