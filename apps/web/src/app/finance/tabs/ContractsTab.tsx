"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { toastSuccess, alertError } from "@/lib/swal";
import { formatPrice, formatDate } from "@/lib/format";
import type { ContractSummary, ReminderChannel } from "../types";

interface ContractsTabProps {
  contracts: ContractSummary[] | null;
  loading: boolean;
  canSendReminder: boolean;
}

export default function ContractsTab({ contracts, loading, canSendReminder }: ContractsTabProps) {
  const [reminderLoadingId, setReminderLoadingId] = useState<string | null>(null);

  const triggerReminder = async (installmentId: string, channel: ReminderChannel) => {
    setReminderLoadingId(installmentId + "-" + channel);
    try {
      await apiFetch(`/finance/reminders/${installmentId}`, {
        method: "POST",
        body: JSON.stringify({ channel }),
      });
      toastSuccess(`ส่งแจ้งเตือนผ่าน ${channel.toUpperCase()} แล้ว`);
    } catch (err) {
      alertError(err instanceof Error ? err.message : `Failed to send reminder via ${channel}`);
    } finally {
      setReminderLoadingId(null);
    }
  };

  return (
    <div className="h-full min-h-0 overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white shadow-[0_1px_0_0_#f3f4f6]">
          <tr className="bg-gray-50/50">
            <th className="text-left px-5 py-3 font-medium text-gray-500">สัญญา / ลูกค้า</th>
            <th className="text-left px-5 py-3 font-medium text-gray-500">ข้อมูลรถ</th>
            <th className="text-right px-5 py-3 font-medium text-gray-500">ค่างวด</th>
            <th className="text-right px-5 py-3 font-medium text-gray-500">ยอดหนี้</th>
            <th className="text-center px-5 py-3 font-medium text-gray-500">เกินกำหนด</th>
            <th className="text-left px-5 py-3 font-medium text-gray-500">งวดถัดไป</th>
            <th className="px-5 py-3 text-center font-medium text-gray-500">ส่งแจ้งเตือน</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {loading || contracts === null ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 7 }).map((__, j) => (
                  <td key={j} className="px-5 py-4">
                    <div className="h-4 bg-gray-100 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))
          ) : contracts.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400">
                ยังไม่มีสัญญาในระบบ
              </td>
            </tr>
          ) : (
            contracts.map((c) => {
              const oldestUnpaid = c.installments.find((inst) => inst.status !== "paid");
              const pctPaid = Math.round((c.total_paid / c.total_amount) * 100);

              return (
                <tr
                  key={c.id}
                  className={`hover:bg-gray-50/50 transition-colors ${c.overdue_count > 0 ? "bg-red-50/10" : ""}`}
                >
                  {/* Contract / Customer */}
                  <td className="px-5 py-4">
                    <div>
                      <Link
                        href={`/contracts/${c.id}`}
                        className="font-semibold text-primary-600 hover:text-primary-700 font-mono text-sm"
                      >
                        {c.contract_number}
                      </Link>
                      <p className="text-sm font-semibold text-gray-900 mt-1">{c.customer.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-gray-500">{c.customer.phone}</span>
                        {c.customer.isLineLinked ? (
                          <span className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
                            เชื่อม LINE แล้ว
                          </span>
                        ) : (
                          <span className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] bg-gray-50 text-gray-400 border border-gray-200">
                            ไม่มี LINE
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Vehicle Info */}
                  <td className="px-5 py-4 text-xs text-gray-600">
                    {c.motorcycle ? (
                      <div>
                        <p className="font-semibold text-gray-800">
                          {c.motorcycle.brand} {c.motorcycle.model}
                        </p>
                        <p className="font-mono text-gray-500 mt-0.5">{c.motorcycle.chassisNumber}</p>
                        <p className="text-gray-400">{c.motorcycle.color}</p>
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>

                  {/* Repayment rate */}
                  <td className="px-5 py-4 text-right">
                    <p className="font-semibold text-gray-900">{formatPrice(c.installment_rate)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">/ เดือน</p>
                    <p className="text-xs text-gray-400 mt-0.5">{c.installment_count} งวด</p>
                  </td>

                  {/* Debt Overview */}
                  <td className="px-5 py-4 text-right">
                    <div className="inline-block text-right">
                      <p className="font-semibold text-gray-900">{formatPrice(c.total_outstanding)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">คงค้าง</p>
                      <div className="w-24 bg-gray-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
                        <div
                          className="bg-primary-600 h-1.5 rounded-full transition-all"
                          style={{ width: `${pctPaid}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400 mt-1 block">
                        ชำระแล้ว {pctPaid}% ({formatPrice(c.total_paid)})
                      </span>
                    </div>
                  </td>

                  {/* Overdue Stats */}
                  <td className="px-5 py-4 text-center">
                    {c.overdue_count > 0 ? (
                      <div>
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 animate-pulse">
                          เกินกำหนด {c.overdue_count} งวด
                        </span>
                        <p className="text-xs text-red-600 font-bold mt-1">
                          {formatPrice(c.total_overdue_amount)}
                        </p>
                      </div>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                        ปกติ
                      </span>
                    )}
                  </td>

                  {/* Next Payment */}
                  <td className="px-5 py-4 text-xs">
                    {c.next_due_date ? (
                      <div>
                        <p className="font-semibold text-gray-900">{formatDate(c.next_due_date)}</p>
                        <p className="text-gray-500 mt-0.5">{formatPrice(c.next_due_amount)}</p>
                      </div>
                    ) : (
                      <span className="text-gray-400">ครบแล้ว</span>
                    )}
                  </td>

                  {/* Reminders & Actions */}
                  <td className="px-5 py-4 text-center">
                    {oldestUnpaid ? (
                      <div className="inline-flex gap-1.5 mx-auto">
                        <button
                          onClick={() => triggerReminder(oldestUnpaid.id, "line")}
                          disabled={!canSendReminder || !c.customer.isLineLinked || reminderLoadingId !== null}
                          title="ส่งแจ้งเตือนผ่าน LINE"
                          className={`px-2.5 py-1 text-xs font-semibold rounded-md border text-center transition-colors ${
                            c.customer.isLineLinked
                              ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                              : "bg-gray-50 border-gray-150 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          {reminderLoadingId === `${oldestUnpaid.id}-line` ? "…" : "LINE"}
                        </button>
                        <button
                          onClick={() => triggerReminder(oldestUnpaid.id, "sms")}
                          disabled={!canSendReminder || reminderLoadingId !== null}
                          title="ส่งแจ้งเตือนผ่าน SMS"
                          className="px-2.5 py-1 text-xs font-semibold rounded-md border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 text-center transition-colors"
                        >
                          {reminderLoadingId === `${oldestUnpaid.id}-sms` ? "…" : "SMS"}
                        </button>
                        <button
                          onClick={() => triggerReminder(oldestUnpaid.id, "email")}
                          disabled={!canSendReminder || reminderLoadingId !== null}
                          title="ส่งแจ้งเตือนผ่านอีเมล"
                          className="px-2.5 py-1 text-xs font-semibold rounded-md border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-center transition-colors"
                        >
                          {reminderLoadingId === `${oldestUnpaid.id}-email` ? "…" : "อีเมล"}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
