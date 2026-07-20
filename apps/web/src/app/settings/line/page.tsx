"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PermissionGuard from "@/components/PermissionGuard";
import { apiFetch } from "@/lib/api";
import { toastSuccess, alertError } from "@/lib/swal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineStatus {
  configured: boolean;
  hasAccessToken: boolean;
  hasChannelSecret: boolean;
  webhookUrl: string;
}

interface NotificationLog {
  id: string;
  channel: string;
  message: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
  customer: { id: string; name: string; phone: string } | null;
}

interface LogsResponse {
  data: NotificationLog[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const STATUS_STYLES: Record<string, string> = {
  sent: "bg-green-50 text-green-700",
  failed: "bg-red-50 text-red-700",
  pending: "bg-yellow-50 text-yellow-700",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LineSettingsPage() {
  const [lineStatus, setLineStatus] = useState<LineStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState<string | null>(null);

  const [sending, setSending] = useState(false);

  // System settings (LINE OA Basic ID)
  const [oaBasicId, setOaBasicId] = useState("");
  const [oaLoaded, setOaLoaded] = useState(false);
  const [savingOa, setSavingOa] = useState(false);

  useEffect(() => {
    apiFetch<{ data: Array<{ key: string; value: string }> }>("/settings")
      .then((res) => {
        const row = res.data.find((s) => s.key === "line_oa_basic_id");
        setOaBasicId(row?.value ?? "");
      })
      .catch(() => {})
      .finally(() => setOaLoaded(true));
  }, []);

  async function handleSaveOaBasicId() {
    setSavingOa(true);
    try {
      await apiFetch("/settings/line_oa_basic_id", {
        method: "PUT",
        body: JSON.stringify({ value: oaBasicId }),
      });
      toastSuccess("บันทึก LINE OA Basic ID เรียบร้อยแล้ว");
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Failed to save setting");
    } finally {
      setSavingOa(false);
    }
  }

  // Fetch LINE config status
  useEffect(() => {
    setStatusLoading(true);
    apiFetch<{ data: LineStatus }>("/notifications/line-status")
      .then((res) => setLineStatus(res.data))
      .catch(() => setLineStatus(null))
      .finally(() => setStatusLoading(false));
  }, []);

  // Fetch LINE notification logs
  const fetchLogs = useCallback(async (page: number) => {
    setLogsLoading(true);
    setLogsError(null);
    try {
      const params = new URLSearchParams({
        channel: "line",
        page: String(page),
      });
      const res = await apiFetch<LogsResponse>(`/notifications/logs?${params}`);
      setLogs(res.data);
      setLogsTotal(res.total);
    } catch (err) {
      setLogsError(err instanceof Error ? err.message : "Failed to load logs");
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(logsPage);
  }, [logsPage, fetchLogs]);

  async function handleSendReminders() {
    setSending(true);
    try {
      const res = await apiFetch<{ data: { sent: number; failed: number } }>(
        "/notifications/send-reminders",
        {
          method: "POST",
          body: JSON.stringify({ channel: "line" }),
        }
      );
      toastSuccess(
        `Sent ${res.data.sent} reminder${res.data.sent !== 1 ? "s" : ""}` +
          (res.data.failed > 0 ? `, ${res.data.failed} failed` : "")
      );
      // Refresh logs
      fetchLogs(1);
      setLogsPage(1);
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Failed to send reminders");
    } finally {
      setSending(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(logsTotal / PAGE_SIZE));

  return (
    <PermissionGuard page="settings">
      <DashboardLayout>
        <div className="px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <a
                href="/settings"
                className="hover:text-primary-600 transition-colors"
              >
                Settings
              </a>
              <span>/</span>
              <span className="text-gray-700 font-medium">LINE</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">LINE Settings</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage LINE messaging integration and notification settings
            </p>
          </div>

          {/* Connection Status Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">
              Connection Status
            </h2>
            {statusLoading ? (
              <div className="space-y-3">
                <div className="h-4 bg-gray-100 rounded animate-pulse w-48" />
                <div className="h-4 bg-gray-100 rounded animate-pulse w-64" />
              </div>
            ) : lineStatus ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      lineStatus.configured ? "bg-green-500" : "bg-yellow-500"
                    }`}
                  />
                  <span className="text-sm text-gray-700">
                    {lineStatus.configured
                      ? "LINE integration is configured"
                      : "LINE integration is not fully configured"}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        lineStatus.hasAccessToken
                          ? "bg-green-500"
                          : "bg-gray-400"
                      }`}
                    />
                    <span className="text-gray-600">Channel Access Token</span>
                    <span
                      className={`text-xs font-medium ${
                        lineStatus.hasAccessToken
                          ? "text-green-600"
                          : "text-gray-400"
                      }`}
                    >
                      {lineStatus.hasAccessToken
                        ? "Configured"
                        : "Not configured"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        lineStatus.hasChannelSecret
                          ? "bg-green-500"
                          : "bg-gray-400"
                      }`}
                    />
                    <span className="text-gray-600">Channel Secret</span>
                    <span
                      className={`text-xs font-medium ${
                        lineStatus.hasChannelSecret
                          ? "text-green-600"
                          : "text-gray-400"
                      }`}
                    >
                      {lineStatus.hasChannelSecret
                        ? "Configured"
                        : "Not configured"}
                    </span>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">
                    Webhook URL (นำไปวางใน LINE Developers Console → Messaging API)
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm text-gray-700 break-all flex-1">
                      {lineStatus.webhookUrl}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard
                          .writeText(lineStatus.webhookUrl)
                          .then(() => toastSuccess("คัดลอก Webhook URL แล้ว"));
                      }}
                      className="shrink-0 px-2.5 py-1 text-xs font-medium rounded-md border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      คัดลอก
                    </button>
                  </div>
                  <p className="mt-1.5 text-[11px] text-gray-400">
                    หมายเหตุ: LINE ต้องเข้าถึง URL นี้ได้จากอินเทอร์เน็ต (HTTPS) —
                    localhost ใช้ทดสอบกับ LINE จริงไม่ได้ ต้องใช้โดเมนที่ deploy แล้วหรือ tunnel เช่น ngrok
                  </p>
                </div>

                {/* LINE-side configuration checklist */}
                <div className="mt-3 rounded-lg border border-gray-200 p-4">
                  <p className="text-xs font-semibold text-gray-700 mb-2">
                    ✅ Checklist การตั้งค่าฝั่ง LINE (ทำครั้งเดียว)
                  </p>
                  <ul className="text-xs text-gray-600 space-y-1.5 list-disc pl-4">
                    <li>
                      <b>LINE Developers Console</b> → Messaging API: วาง Webhook URL ด้านบน
                      แล้วเปิด <b>Use webhook = ON</b> (กด Verify เพื่อทดสอบได้)
                    </li>
                    <li>
                      Channel ต้องเป็นของ OA เดียวกับ <b>LINE OA Basic ID</b> ที่ตั้งไว้ด้านล่าง
                      (token/secret คนละ OA = ข้อความไม่เข้าระบบ)
                    </li>
                    <li>
                      <b>LINE OA Manager</b> (manager.line.biz) → ตั้งค่าการตอบกลับ:
                      ปิด <b>ตอบกลับอัตโนมัติ (Auto-response)</b> เพื่อไม่ให้ตอบซ้อนกับระบบ
                      (เปิดโหมด Chat ควบคู่กับ Webhook ได้ แอดมินยังคุยกับลูกค้าได้ปกติ)
                    </li>
                    <li>
                      แนะนำตั้ง <b>Greeting message</b> ตอน Add Friend เช่น
                      &quot;หากมาเชื่อมต่อบัญชี กรุณากดส่งข้อความรหัสที่เตรียมไว้ให้ได้เลยครับ&quot;
                    </li>
                  </ul>
                </div>
                {!lineStatus.configured && (
                  <div className="mt-3 rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
                    Set <code className="font-mono text-xs bg-yellow-100 px-1 py-0.5 rounded">LINE_CHANNEL_ACCESS_TOKEN</code> and{" "}
                    <code className="font-mono text-xs bg-yellow-100 px-1 py-0.5 rounded">LINE_CHANNEL_SECRET</code>{" "}
                    environment variables to enable LINE messaging.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                Unable to load LINE configuration status.
              </div>
            )}
          </div>

          {/* LINE OA Basic ID Setting */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">
              LINE OA Basic ID
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Basic ID ของ LINE Official Account (เช่น @400rbdse) — ใช้สร้าง QR Code
              เชื่อมบัญชีลูกค้าแบบสแกนแล้วกดส่งข้อความรหัสได้ทันที โดยไม่ต้อง LINE Login
            </p>
            <div className="flex gap-2 max-w-md">
              <input
                type="text"
                placeholder="@yourOAid"
                value={oaBasicId}
                onChange={(e) => setOaBasicId(e.target.value)}
                disabled={!oaLoaded}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-50"
              />
              <button
                onClick={handleSaveOaBasicId}
                disabled={savingOa || !oaLoaded}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {savingOa ? "กำลังบันทึก…" : "บันทึก"}
              </button>
            </div>
            {oaLoaded && !oaBasicId.trim() && (
              <p className="mt-2 text-xs text-amber-600">
                ⚠ ยังไม่ได้ตั้งค่า — หน้าลูกค้าจะใช้วิธีเชื่อมต่อแบบ LINE Login (LIFF) แทน
              </p>
            )}
          </div>

          {/* Send Reminders Section */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 mb-1">
                  LINE Reminders
                </h2>
                <p className="text-sm text-gray-500">
                  Send overdue installment reminders via LINE to customers with a
                  linked LINE account.
                </p>
              </div>
              <button
                onClick={handleSendReminders}
                disabled={sending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors shrink-0"
              >
                {sending ? "Sending..." : "Send Reminders"}
              </button>
            </div>
          </div>

          {/* Notification Logs */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">
                LINE Notification Logs
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {logsTotal} log{logsTotal !== 1 ? "s" : ""}
              </p>
            </div>

            {logsError && (
              <div className="mx-6 mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {logsError}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 font-medium text-gray-500">
                      Customer
                    </th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">
                      Message
                    </th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">
                      Status
                    </th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        {Array.from({ length: 4 }).map((__, j) => (
                          <td key={j} className="px-5 py-3">
                            <div className="h-4 bg-gray-100 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : logs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-12 text-center text-sm text-gray-400"
                      >
                        No LINE notification logs found.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-5 py-3 font-medium text-gray-900">
                          {log.customer?.name ?? "-"}
                        </td>
                        <td className="px-5 py-3 text-gray-600 max-w-xs truncate">
                          {log.message}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                              STATUS_STYLES[log.status] ??
                              "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-gray-500 text-xs">
                          {new Date(
                            log.sentAt ?? log.createdAt
                          ).toLocaleDateString("th-TH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!logsLoading && totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
                <span className="text-xs text-gray-500">
                  Page {logsPage} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={logsPage <= 1}
                    onClick={() => setLogsPage((p) => p - 1)}
                    className="px-3 py-1.5 text-xs rounded-md border border-gray-300 text-gray-600 disabled:opacity-40 hover:bg-white transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    disabled={logsPage >= totalPages}
                    onClick={() => setLogsPage((p) => p + 1)}
                    className="px-3 py-1.5 text-xs rounded-md border border-gray-300 text-gray-600 disabled:opacity-40 hover:bg-white transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </PermissionGuard>
  );
}
