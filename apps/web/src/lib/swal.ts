import Swal from "sweetalert2";

// ─── Base theme ──────────────────────────────────────────────────────────────

const base = Swal.mixin({
  confirmButtonColor: "#4f46e5", // primary-600
  cancelButtonColor: "#6b7280",  // gray-500
  buttonsStyling: true,
  customClass: {
    popup: "rounded-xl shadow-xl text-sm",
    title: "text-base font-semibold",
    confirmButton: "rounded-lg text-sm font-medium px-5 py-2.5",
    cancelButton: "rounded-lg text-sm font-medium px-5 py-2.5",
  },
});

// ─── Delete confirmation ──────────────────────────────────────────────────────

export async function confirmDelete(itemName = "รายการนี้"): Promise<boolean> {
  const result = await base.fire({
    title: "ยืนยันการลบ?",
    text: `"${itemName}" จะถูกลบอย่างถาวร`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "ลบ",
    cancelButtonText: "ยกเลิก",
    confirmButtonColor: "#dc2626", // red-600
    reverseButtons: true,
  });
  return result.isConfirmed;
}

// ─── Generic confirm ─────────────────────────────────────────────────────────

export async function confirm(options: {
  title: string;
  text?: string;
  html?: string;
  confirmText?: string;
  cancelText?: string;
  icon?: "warning" | "question" | "info";
}): Promise<boolean> {
  const result = await base.fire({
    title: options.title,
    text: options.text,
    html: options.html,
    icon: options.icon ?? "question",
    showCancelButton: true,
    confirmButtonText: options.confirmText ?? "ยืนยัน",
    cancelButtonText: options.cancelText ?? "ยกเลิก",
    reverseButtons: true,
    width: options.html ? "42em" : undefined,
  });
  return result.isConfirmed;
}

// ─── Success toast ────────────────────────────────────────────────────────────

export function toastSuccess(message: string): void {
  Swal.fire({
    toast: true,
    position: "top-end",
    icon: "success",
    title: message,
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    customClass: {
      popup: "rounded-xl shadow-md text-sm",
    },
  });
}

// ─── Error alert ─────────────────────────────────────────────────────────────

export function alertError(message: string): void {
  base.fire({
    title: "เกิดข้อผิดพลาด",
    text: message,
    icon: "error",
    confirmButtonText: "ตกลง",
  });
}

// ─── Info alert ──────────────────────────────────────────────────────────────

export function alertInfo(title: string, text?: string): void {
  base.fire({
    title,
    text,
    icon: "info",
    confirmButtonText: "ตกลง",
  });
}
