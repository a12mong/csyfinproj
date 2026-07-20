"use client";

import React, { useState } from "react";
import { formatPrice, formatDateTime } from "@/lib/format";
import type { NotificationBatch } from "../types";

const BATCH_STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  pending: { label: "รอส่ง", cls: "bg-gray-100 text-gray-600" },
  processing: { label: "กำลังส่ง", cls: "bg-blue-50 text-blue-700" },
  completed: { label: "ส่งแล้ว", cls: "bg-green-50 text-green-700" },
  failed: { label: "ล้มเหลว", cls: "bg-red-100 text-red-700" },
};

interface BatchesTabProps {
  batches: NotificationBatch[] | null;
  loading: boolean;
  onRefresh: () => void;
}

export default function BatchesTab({ batches, loading, onRefresh }: BatchesTabProps) {
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
        <p className="text-xs text-gray-500">
          ตรวจสอบย้อนหลังได้ว่าส่งครั้งไหน ถึงใคร ผ่านช่องทางอะไร สำเร็จหรือไม่
        </p>
        <button
          onClick={onRefresh}
          className="text-xs text-primary-600 hover:text-primary-700 font-medium"
        >
          รีเฟรช
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white shadow-[0_1px_0_0_#f3f4f6]">
            <tr className="bg-gray-50/50">
              <th className="text-left px-4 py-2.5 font-medium text-gray-500">วันเวลาที่ส่ง</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-500">ผู้สั่งส่ง</th>
              <th className="text-center px-4 py-2.5 font-medium text-gray-500">ช่องทาง</th>
              <th className="text-center px-4 py-2.5 font-medium text-gray-500">จำนวน</th>
              <th className="text-center px-4 py-2.5 font-medium text-gray-500">สำเร็จ / ล้มเหลว</th>
              <th className="text-center px-4 py-2.5 font-medium text-gray-500">สถานะ</th>
              <th className="px-4 py-2.5 w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading || batches === null ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-400">
                  กำลังโหลด…
                </td>
              </tr>
            ) : batches.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                  ยังไม่มีประวัติการส่งแจ้งเตือน
                </td>
              </tr>
            ) : (
              batches.map((batch) => {
                const badge = BATCH_STATUS_BADGES[batch.status] ?? BATCH_STATUS_BADGES["pending"]!;
                const expanded = expandedBatchId === batch.id;
                return (
                  <React.Fragment key={batch.id}>
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-gray-700">{formatDateTime(batch.createdAt)}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {batch.createdBy?.name ?? (batch.source === "scheduled" ? "ระบบ (ตั้งเวลา)" : "—")}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="uppercase text-xs font-semibold text-gray-600">
                          {batch.channel ?? "อัตโนมัติ"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-700">{batch.totalCount}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-green-700 font-semibold">{batch.sentCount}</span>
                        {" / "}
                        <span className={batch.failedCount > 0 ? "text-red-600 font-semibold" : "text-gray-400"}>
                          {batch.failedCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setExpandedBatchId(expanded ? null : batch.id)}
                          className="text-xs text-primary-600 hover:underline font-medium"
                        >
                          {expanded ? "ซ่อน" : "รายละเอียด"}
                        </button>
                      </td>
                    </tr>
                    {expanded && (
                      <tr>
                        <td colSpan={7} className="px-6 py-3 bg-gray-50/70">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-gray-400">
                                <th className="text-left py-1.5 font-medium">ลูกค้า</th>
                                <th className="text-left py-1.5 font-medium">สัญญา</th>
                                <th className="text-right py-1.5 font-medium">ยอด</th>
                                <th className="text-center py-1.5 font-medium">ช่องทางที่ส่ง</th>
                                <th className="text-center py-1.5 font-medium">ผลการส่ง</th>
                                <th className="text-left py-1.5 font-medium">หมายเหตุ</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {batch.items.map((item) => (
                                <tr key={item.id}>
                                  <td className="py-1.5 text-gray-700">{item.customerName ?? "—"}</td>
                                  <td className="py-1.5 font-mono text-gray-600">{item.contractNumber ?? "—"}</td>
                                  <td className="py-1.5 text-right text-gray-700">
                                    {item.amount != null ? formatPrice(Number(item.amount)) : "—"}
                                  </td>
                                  <td className="py-1.5 text-center uppercase text-gray-600">
                                    {item.channel ?? "—"}
                                  </td>
                                  <td className="py-1.5 text-center">
                                    {item.status === "sent" ? (
                                      <span className="text-green-700 font-semibold">✓ ส่งแล้ว</span>
                                    ) : item.status === "failed" ? (
                                      <span className="text-red-600 font-semibold">✗ ล้มเหลว</span>
                                    ) : (
                                      <span className="text-gray-400">รอส่ง</span>
                                    )}
                                  </td>
                                  <td className="py-1.5 text-gray-500">{item.error ?? ""}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
