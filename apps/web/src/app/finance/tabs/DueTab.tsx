"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { confirm, toastSuccess, alertError } from "@/lib/swal";
import { formatPrice, formatDate } from "@/lib/format";
import type { UpcomingDue, ReminderChannel } from "../types";

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const BUCKET_BADGES: Record<string, { label: string; cls: string }> = {
  overdue: { label: "เกินกำหนด", cls: "bg-red-100 text-red-700" },
  today: { label: "ครบกำหนดวันนี้", cls: "bg-amber-100 text-amber-700" },
  upcoming: { label: "ใกล้ครบกำหนด", cls: "bg-blue-50 text-blue-700" },
};

interface DueTabProps {
  data: UpcomingDue | null;
  loading: boolean;
  dueDays: number;
  onDueDaysChange: (days: number) => void;
  canSendReminder: boolean;
  onSent: () => void;
}

export default function DueTab({
  data,
  loading,
  dueDays,
  onDueDaysChange,
  canSendReminder,
  onSent,
}: DueTabProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkChannel, setBulkChannel] = useState<ReminderChannel>("line");
  const [bulkSending, setBulkSending] = useState(false);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (!data) return;
    setSelectedIds((prev) =>
      prev.size === data.items.length
        ? new Set()
        : new Set(data.items.map((i) => i.installment_id))
    );
  }

  async function handleBulkSend() {
    if (!data || selectedIds.size === 0) return;
    const selected = data.items.filter((i) => selectedIds.has(i.installment_id));
    const noLine = selected.filter((i) => !i.customer?.isLineLinked);

    const rows = selected
      .map(
        (i) => `<tr>
          <td style="padding:4px 8px;text-align:left;border-bottom:1px solid #eee;">${escapeHtml(i.customer?.name ?? "—")}${
            bulkChannel === "line" && !i.customer?.isLineLinked
              ? ' <span style="color:#b45309;font-size:11px;">(ไม่มี LINE)</span>'
              : ""
          }</td>
          <td style="padding:4px 8px;text-align:left;border-bottom:1px solid #eee;font-family:monospace;">${escapeHtml(i.contract_number ?? "—")}</td>
          <td style="padding:4px 8px;text-align:center;border-bottom:1px solid #eee;">${i.installment_number}</td>
          <td style="padding:4px 8px;text-align:right;border-bottom:1px solid #eee;">${formatPrice(i.remaining)}</td>
          <td style="padding:4px 8px;text-align:left;border-bottom:1px solid #eee;">${formatDate(i.due_date)}</td>
        </tr>`
      )
      .join("");

    const totalAmount = selected.reduce((s, i) => s + i.remaining, 0);
    const html = `
      <div style="text-align:left;font-size:13px;max-height:320px;overflow-y:auto;">
        <p style="margin-bottom:8px;">ส่งแจ้งเตือนผ่านช่องทาง <b>${bulkChannel.toUpperCase()}</b> จำนวน <b>${selected.length}</b> รายการ รวม <b>${formatPrice(totalAmount)}</b></p>
        ${noLine.length > 0 && bulkChannel === "line" ? `<p style="color:#b45309;margin-bottom:8px;">⚠ ${noLine.length} รายการไม่มี LINE — ระบบจะส่งช่องทางสำรอง (SMS/Email) แทน</p>` : ""}
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead><tr style="color:#6b7280;">
            <th style="padding:4px 8px;text-align:left;">ลูกค้า</th>
            <th style="padding:4px 8px;text-align:left;">สัญญา</th>
            <th style="padding:4px 8px;text-align:center;">งวด</th>
            <th style="padding:4px 8px;text-align:right;">ยอดค้าง</th>
            <th style="padding:4px 8px;text-align:left;">ครบกำหนด</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;

    const confirmed = await confirm({
      title: `ยืนยันการส่งแจ้งเตือน ${selected.length} รายการ?`,
      html,
      confirmText: `ส่งแจ้งเตือน (${selected.length})`,
      cancelText: "ยกเลิก",
      icon: "question",
    });
    if (!confirmed) return;

    setBulkSending(true);
    try {
      const res = await apiFetch<{ data: { sent: number; failed: number } }>(
        "/finance/reminders/bulk",
        {
          method: "POST",
          body: JSON.stringify({
            installment_ids: selected.map((i) => i.installment_id),
            channel: bulkChannel,
          }),
        }
      );
      if (res.data.failed > 0) {
        alertError(`ส่งสำเร็จ ${res.data.sent} รายการ, ล้มเหลว ${res.data.failed} รายการ — ดูรายละเอียดในแท็บประวัติการส่ง`);
      } else {
        toastSuccess(`ส่งแจ้งเตือนสำเร็จ ${res.data.sent} รายการ`);
      }
      setSelectedIds(new Set());
      onSent();
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Failed to send bulk reminders");
    } finally {
      setBulkSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <p className="text-xs text-gray-500">
            เกินกำหนด + วันนี้ + {data?.days ?? dueDays} วันข้างหน้า — เลือกรายการเพื่อส่งแจ้งเตือนแบบกลุ่ม
          </p>
          {data && data.summary.partial_count > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 text-orange-700">
              ⚠ ชำระบางส่วนค้าง {data.summary.partial_count} งวด รวม{" "}
              {formatPrice(data.summary.partial_amount)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={dueDays}
            onChange={(e) => onDueDaysChange(parseInt(e.target.value))}
            className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs bg-white focus:border-primary-500 focus:outline-none"
          >
            <option value={7}>7 วัน</option>
            <option value={14}>14 วัน</option>
            <option value={30}>30 วัน</option>
          </select>
          <select
            value={bulkChannel}
            onChange={(e) => setBulkChannel(e.target.value as ReminderChannel)}
            className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs bg-white focus:border-primary-500 focus:outline-none"
          >
            <option value="line">LINE</option>
            <option value="sms">SMS</option>
            <option value="email">Email</option>
          </select>
          <button
            onClick={handleBulkSend}
            disabled={!canSendReminder || selectedIds.size === 0 || bulkSending}
            title={canSendReminder ? "" : "ไม่มีสิทธิ์ส่งแจ้งเตือน"}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 transition-colors"
          >
            {bulkSending ? "กำลังส่ง…" : `ส่งแจ้งเตือน (${selectedIds.size})`}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white shadow-[0_1px_0_0_#f3f4f6]">
            <tr className="bg-gray-50/50">
              <th className="px-4 py-2.5 w-10 text-center">
                <input
                  type="checkbox"
                  checked={
                    !!data && data.items.length > 0 && selectedIds.size === data.items.length
                  }
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-500">ลูกค้า</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-500">สัญญา</th>
              <th className="text-center px-4 py-2.5 font-medium text-gray-500">งวด</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-500">ครบกำหนด</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-500">ยอดค้าง</th>
              <th className="text-center px-4 py-2.5 font-medium text-gray-500">สถานะ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : !data || data.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                  ไม่มีงวดครบกำหนดในช่วงนี้ 🎉
                </td>
              </tr>
            ) : (
              data.items.map((item) => {
                const badge = BUCKET_BADGES[item.bucket] ?? BUCKET_BADGES["upcoming"]!;
                return (
                  <tr
                    key={item.installment_id}
                    className={`hover:bg-gray-50/50 transition-colors ${
                      item.bucket === "overdue" ? "bg-red-50/20" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.installment_id)}
                        onChange={() => toggleSelected(item.installment_id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{item.customer?.name ?? "—"}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-gray-500">{item.customer?.phone}</span>
                        {item.customer?.isLineLinked ? (
                          <span className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
                            LINE
                          </span>
                        ) : (
                          <span className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] bg-gray-50 text-gray-400 border border-gray-200">
                            No LINE
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {item.contract_id ? (
                        <Link
                          href={`/contracts/${item.contract_id}`}
                          className="font-mono text-xs text-primary-600 hover:underline"
                        >
                          {item.contract_number}
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">
                      {item.installment_number}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{formatDate(item.due_date)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatPrice(item.remaining)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                      {item.status === "partially_paid" && (
                        <span className="block mt-1 mx-auto w-fit px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-700">
                          ชำระบางส่วน
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
