"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PermissionGuard from "@/components/PermissionGuard";
import { apiFetch } from "@/lib/api";

interface AuditLog {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  summary: string;
  changes: unknown;
  ipAddress: string | null;
  statusCode: number | null;
  createdAt: string;
}

const ENTITY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "ทุกประเภท" },
  { value: "auth", label: "การเข้าสู่ระบบ" },
  { value: "sales", label: "รายการขาย" },
  { value: "payments", label: "การรับชำระ" },
  { value: "customers", label: "ลูกค้า" },
  { value: "contracts", label: "สัญญา" },
  { value: "motorcycles", label: "รถจักรยานยนต์" },
  { value: "delivery-notes", label: "ใบรับสินค้า" },
  { value: "finance", label: "การเงิน" },
  { value: "users", label: "ผู้ใช้งาน" },
  { value: "roles", label: "role และสิทธิ์" },
  { value: "settings", label: "การตั้งค่า" },
];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (entity) params.set("entity", entity);
      if (userFilter.trim()) params.set("user", userFilter.trim());
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      const res = await apiFetch<{ data: AuditLog[]; total: number }>(
        `/audit-logs?${params}`
      );
      setLogs(res.data);
      setTotal(res.total);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, entity, userFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / 25));

  return (
    <PermissionGuard page="settings">
      <DashboardLayout>
        <div className="px-8 py-8">
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <a href="/settings" className="hover:text-primary-600 transition-colors">
                ตั้งค่า
              </a>
              <span>/</span>
              <span className="text-gray-700 font-medium">ประวัติการใช้งาน</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">ประวัติการใช้งานระบบ (Audit Logs)</h1>
            <p className="text-sm text-gray-500 mt-1">
              บันทึกทุกการกระทำในระบบ — ข้อมูลส่วนบุคคลถูกปกปิด (mask) ตามหลัก PDPA
            </p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">ประเภทข้อมูล</label>
              <select
                value={entity}
                onChange={(e) => {
                  setEntity(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:border-primary-500 focus:outline-none"
              >
                {ENTITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">ผู้ใช้ (อีเมล)</label>
              <input
                type="text"
                value={userFilter}
                onChange={(e) => {
                  setUserFilter(e.target.value);
                  setPage(1);
                }}
                placeholder="ค้นหาอีเมล…"
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">ตั้งแต่วันที่</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">ถึงวันที่</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
              />
            </div>
            <span className="text-xs text-gray-400 ml-auto">{total.toLocaleString()} รายการ</span>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-2.5 font-medium text-gray-500">วันเวลา</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-500">ผู้ใช้</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-500">รายละเอียด</th>
                    <th className="text-center px-4 py-2.5 font-medium text-gray-500">ผล</th>
                    <th className="px-4 py-2.5 w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                        กำลังโหลด…
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">
                        ไม่พบประวัติตามเงื่อนไข
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <>
                        <tr key={log.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString("th-TH", {
                              dateStyle: "short",
                              timeStyle: "medium",
                            })}
                          </td>
                          <td className="px-4 py-2.5 text-gray-700">
                            {log.userName ?? <span className="text-gray-400">ระบบ</span>}
                          </td>
                          <td className="px-4 py-2.5 text-gray-800">{log.summary}</td>
                          <td className="px-4 py-2.5 text-center">
                            {log.statusCode == null ? (
                              <span className="text-gray-400">—</span>
                            ) : log.statusCode < 400 ? (
                              <span className="text-green-600 font-semibold text-xs">สำเร็จ</span>
                            ) : (
                              <span className="text-red-600 font-semibold text-xs">
                                {log.statusCode}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {log.changes != null && (
                              <button
                                onClick={() =>
                                  setExpandedId(expandedId === log.id ? null : log.id)
                                }
                                className="text-xs text-primary-600 hover:underline"
                              >
                                {expandedId === log.id ? "ซ่อน" : "ข้อมูล"}
                              </button>
                            )}
                          </td>
                        </tr>
                        {expandedId === log.id && (
                          <tr key={`${log.id}-detail`}>
                            <td colSpan={5} className="px-6 py-3 bg-gray-50/70">
                              <pre className="text-[11px] text-gray-600 whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                                {JSON.stringify(log.changes, null, 2)}
                              </pre>
                              {log.ipAddress && (
                                <p className="text-[11px] text-gray-400 mt-1">IP: {log.ipAddress}</p>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 rounded-lg border border-gray-300 text-gray-600 disabled:opacity-40"
              >
                ก่อนหน้า
              </button>
              <span className="text-xs text-gray-500">
                หน้า {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 rounded-lg border border-gray-300 text-gray-600 disabled:opacity-40"
              >
                ถัดไป
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </PermissionGuard>
  );
}
