"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/api";
import { TH, formatPrice, formatDate, formatDateTime } from "@/lib/format";

interface DashboardSummary {
  generated_at: string;
  inventory: { total: number; in_stock: number; reserved: number; sold: number };
  customers: { total: number };
  finance: {
    active_sales: number;
    active_contracts: number;
    overdue_count: number;
    overdue_amount: number;
    due_today_count: number;
    due_today_amount: number;
    collected_today: number;
    payments_today_count: number;
    collected_month: number;
    expected_month: number;
  };
  recent_payments: Array<{
    id: string;
    amount: number;
    channel: string;
    verified: boolean;
    payment_date: string;
    created_at: string;
    customer_name: string | null;
    contract_number: string | null;
  }>;
  upcoming_installments: Array<{
    id: string;
    installment_number: number;
    due_date: string;
    remaining: number;
    customer_name: string | null;
    contract_id: string | null;
    contract_number: string | null;
  }>;
}

// Client-side cache: paint instantly from sessionStorage, then revalidate.
const CACHE_KEY = "dashboard-summary-v1";
const CLIENT_CACHE_MS = 5 * 60 * 1000;

function readCache(): DashboardSummary | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: DashboardSummary; ts: number };
    if (Date.now() - parsed.ts > CLIENT_CACHE_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(data: DashboardSummary) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // storage full / unavailable — ignore
  }
}

interface StatCardProps {
  title: string;
  value: number | string;
  sub?: string;
  accent?: string;
}

function StatCard({ title, value, sub, accent = "text-gray-900" }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-1.5">
      <span className="text-sm font-medium text-gray-500">{title}</span>
      <span className={`text-2xl font-bold ${accent}`}>{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async (force = false) => {
    if (force) setRefreshing(true);
    try {
      const res = await apiFetch<{ data: DashboardSummary }>(
        `/dashboard/summary${force ? "?refresh=1" : ""}`
      );
      setSummary(res.data);
      writeCache(res.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดข้อมูลสถิติไม่สำเร็จ");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const cached = readCache();
    if (cached) {
      setSummary(cached);
      setLoading(false);
    }
    // Always revalidate in the background (server has its own 60s cache)
    fetchSummary();
  }, [fetchSummary]);

  const fin = summary?.finance;

  return (
    <DashboardLayout>
      <div className="px-8 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">แดชบอร์ด</h1>
            <p className="text-sm text-gray-500 mt-1">
              ภาพรวมธุรกิจขายรถจักรยานยนต์ของคุณ
              {summary && (
                <span className="text-gray-400">
                  {" "}
                  · อัปเดตล่าสุด {formatDateTime(summary.generated_at)}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => fetchSummary(true)}
            disabled={refreshing}
            className="px-3.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {refreshing ? "กำลังโหลด…" : "รีเฟรชข้อมูล"}
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-200 p-6 h-28 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Finance KPIs */}
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                การเงินวันนี้
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard
                  title="เก็บเงินวันนี้"
                  value={formatPrice(fin?.collected_today ?? 0)}
                  sub={`${fin?.payments_today_count ?? 0} รายการชำระวันนี้`}
                  accent="text-green-600"
                />
                <StatCard
                  title="เก็บเงินเดือนนี้"
                  value={formatPrice(fin?.collected_month ?? 0)}
                  sub={`เป้าหมายเดือนนี้ ${formatPrice(fin?.expected_month ?? 0)}`}
                  accent="text-primary-700"
                />
                <StatCard
                  title="ครบกำหนดวันนี้"
                  value={formatPrice(fin?.due_today_amount ?? 0)}
                  sub={`${fin?.due_today_count ?? 0} งวดครบกำหนดวันนี้`}
                  accent="text-amber-600"
                />
                <StatCard
                  title="ยอดเกินกำหนด"
                  value={formatPrice(fin?.overdue_amount ?? 0)}
                  sub={`${fin?.overdue_count ?? 0} งวดเกินกำหนดชำระ`}
                  accent={(fin?.overdue_count ?? 0) > 0 ? "text-red-600" : "text-gray-900"}
                />
              </div>
            </div>

            {/* Business counters */}
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                คลังสินค้าและธุรกิจ
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard title="รถทั้งหมด" value={summary?.inventory.total ?? 0} />
                <StatCard
                  title={TH.motorcycleStatus.in_stock ?? "พร้อมขาย"}
                  value={summary?.inventory.in_stock ?? 0}
                  accent="text-green-600"
                />
                <StatCard
                  title={TH.motorcycleStatus.reserved ?? "จองแล้ว"}
                  value={summary?.inventory.reserved ?? 0}
                  accent="text-yellow-600"
                />
                <StatCard
                  title={TH.motorcycleStatus.sold ?? "ขายแล้ว"}
                  value={summary?.inventory.sold ?? 0}
                  accent="text-red-600"
                />
                <StatCard
                  title="สัญญากำลังผ่อน"
                  value={(fin?.active_contracts ?? 0) + (fin?.active_sales ?? 0)}
                  accent="text-primary-700"
                />
                <StatCard title="ลูกค้าทั้งหมด" value={summary?.customers.total ?? 0} />
              </div>
            </div>

            {/* Two panels: upcoming due + recent payments */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">งวดใกล้ครบกำหนด</h3>
                  <Link href="/finance" className="text-xs text-primary-600 hover:underline font-medium">
                    ดูทั้งหมด →
                  </Link>
                </div>
                {summary && summary.upcoming_installments.length > 0 ? (
                  <ul className="divide-y divide-gray-100">
                    {summary.upcoming_installments.map((inst) => (
                      <li key={inst.id} className="px-5 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {inst.customer_name ?? "—"}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {inst.contract_id ? (
                              <Link
                                href={`/contracts/${inst.contract_id}`}
                                className="font-mono text-primary-600 hover:underline"
                              >
                                {inst.contract_number}
                              </Link>
                            ) : (
                              <span className="font-mono">{inst.contract_number ?? "—"}</span>
                            )}
                            {" · งวดที่ "}
                            {inst.installment_number}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-gray-900">
                            {formatPrice(inst.remaining)}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{formatDate(inst.due_date)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-5 py-8 text-center text-sm text-gray-400">
                    ไม่มีงวดใกล้ครบกำหนด 🎉
                  </p>
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">การชำระเงินล่าสุด</h3>
                  <Link href="/payments" className="text-xs text-primary-600 hover:underline font-medium">
                    ดูทั้งหมด →
                  </Link>
                </div>
                {summary && summary.recent_payments.length > 0 ? (
                  <ul className="divide-y divide-gray-100">
                    {summary.recent_payments.map((p) => (
                      <li key={p.id} className="px-5 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {p.customer_name ?? "—"}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            <span className="font-mono">{p.contract_number ?? "—"}</span>
                            {" · "}
                            {TH.paymentChannel[p.channel] ?? p.channel}
                            {p.verified ? (
                              <span className="ml-1.5 text-green-600 font-medium">✓ ตรวจแล้ว</span>
                            ) : (
                              <span className="ml-1.5 text-amber-600 font-medium">รอตรวจ</span>
                            )}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-green-700">
                            +{formatPrice(p.amount)}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{formatDate(p.payment_date)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-5 py-8 text-center text-sm text-gray-400">
                    ยังไม่มีการชำระเงิน
                  </p>
                )}
              </div>
            </div>

            {/* Quick links */}
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                ทางลัด
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link
                  href="/inventory"
                  className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 px-5 py-4 hover:border-primary-400 hover:shadow-sm transition-all"
                >
                  <span className="text-2xl">🏍</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">คลังสินค้า</p>
                    <p className="text-xs text-gray-500">จัดการรายการสต็อก / เพิ่มรถ</p>
                  </div>
                </Link>
                <Link
                  href="/finance"
                  className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 px-5 py-4 hover:border-primary-400 hover:shadow-sm transition-all"
                >
                  <span className="text-2xl">📋</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">ค่างวด</p>
                    <p className="text-xs text-gray-500">ติดตามการชำระเงิน</p>
                  </div>
                </Link>
                <Link
                  href="/payments"
                  className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 px-5 py-4 hover:border-primary-400 hover:shadow-sm transition-all"
                >
                  <span className="text-2xl">💵</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">รับชำระ</p>
                    <p className="text-xs text-gray-500">บันทึกการรับชำระเงิน</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
