"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import DashboardLayout from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";
import type {
  ContractSummary,
  DailySummary,
  FinanceOverview,
  MonthlySummary,
  NotificationBatch,
  UpcomingDue,
} from "./types";

function TabSkeleton() {
  return (
    <div className="p-5 space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
      ))}
    </div>
  );
}

// Each tab is its own JS chunk — loaded the first time the user opens it.
const DueTab = dynamic(() => import("./tabs/DueTab"), { loading: TabSkeleton });
const ContractsTab = dynamic(() => import("./tabs/ContractsTab"), { loading: TabSkeleton });
const BatchesTab = dynamic(() => import("./tabs/BatchesTab"), { loading: TabSkeleton });

type TabKey = "due" | "contracts" | "batches";

interface KpiTileProps {
  label: string;
  value: string;
  sub?: string;
  cls: string;
}

function KpiTile({ label, value, sub, cls }: KpiTileProps) {
  return (
    <div className={`rounded-xl border p-3 shadow-sm ${cls}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70 truncate">{label}</p>
      <p className="text-lg font-bold mt-0.5 truncate">{value}</p>
      {sub && <p className="text-[11px] opacity-60 mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

export default function FinanceDashboard() {
  const { hasAction } = useAuth();
  const canSendReminder = hasAction("finance", "send_reminder");

  const [activeTab, setActiveTab] = useState<TabKey>("due");
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
  const [upcomingDue, setUpcomingDue] = useState<UpcomingDue | null>(null);
  const [dueDays, setDueDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lazy-loaded tab data: null = not fetched yet
  const [contracts, setContracts] = useState<ContractSummary[] | null>(null);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [batches, setBatches] = useState<NotificationBatch[] | null>(null);
  const [batchesLoading, setBatchesLoading] = useState(false);

  const loadCore = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, dailyRes, monthlyRes, upcomingRes] = await Promise.all([
        apiFetch<{ data: FinanceOverview }>("/finance/overview"),
        apiFetch<{ data: DailySummary }>("/finance/daily-summary"),
        apiFetch<{ data: MonthlySummary }>("/finance/monthly-summary"),
        apiFetch<{ data: UpcomingDue }>(`/finance/upcoming-due?days=${dueDays}`),
      ]);
      setOverview(overviewRes.data);
      setDailySummary(dailyRes.data);
      setMonthlySummary(monthlyRes.data);
      setUpcomingDue(upcomingRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load finance data");
    } finally {
      setLoading(false);
    }
  }, [dueDays]);

  useEffect(() => {
    loadCore();
  }, [loadCore]);

  const fetchContracts = useCallback(async () => {
    setContractsLoading(true);
    try {
      const res = await apiFetch<{ data: ContractSummary[] }>("/finance/contracts");
      setContracts(res.data);
    } catch {
      setContracts([]);
    } finally {
      setContractsLoading(false);
    }
  }, []);

  const fetchBatches = useCallback(async () => {
    setBatchesLoading(true);
    try {
      const res = await apiFetch<{ data: NotificationBatch[] }>("/finance/notification-batches");
      setBatches(res.data);
    } catch {
      setBatches([]);
    } finally {
      setBatchesLoading(false);
    }
  }, []);

  // Fetch tab data only when the tab is first opened
  useEffect(() => {
    if (activeTab === "contracts" && contracts === null && !contractsLoading) {
      fetchContracts();
    }
    if (activeTab === "batches" && batches === null && !batchesLoading) {
      fetchBatches();
    }
  }, [activeTab, contracts, contractsLoading, batches, batchesLoading, fetchContracts, fetchBatches]);

  const handleRefresh = () => {
    loadCore();
    if (contracts !== null) fetchContracts();
    if (batches !== null) fetchBatches();
  };

  // After a bulk send the batch history is stale — refetch it next time it's viewed
  const handleBatchesInvalidated = () => {
    if (activeTab === "batches") fetchBatches();
    else setBatches(null);
  };

  const tabs: Array<{ key: TabKey; label: string; count: number | null }> = [
    { key: "due", label: "งวดครบกำหนด", count: upcomingDue?.items.length ?? null },
    { key: "contracts", label: "ทะเบียนสัญญา", count: overview?.contracts_count ?? null },
    { key: "batches", label: "ประวัติแจ้งเตือน", count: batches?.length ?? null },
  ];

  return (
    <DashboardLayout>
      <div className="h-screen flex flex-col px-6 py-5 gap-4">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-xl font-bold text-gray-900">การเงินและการติดตามหนี้</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              ภาพรวมสัญญาเช่าซื้อ การรับชำระ และรายการเกินกำหนด
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="px-3.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            รีเฟรชข้อมูล
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 shrink-0">
            {error}
          </div>
        )}

        {/* KPI strip — one compact row */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 shrink-0">
          <KpiTile
            label="ครบกำหนดวันนี้"
            value={upcomingDue ? formatPrice(upcomingDue.summary.today_amount) : "—"}
            sub={upcomingDue ? `${upcomingDue.summary.today_count} งวด` : undefined}
            cls="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-100 text-amber-900"
          />
          <KpiTile
            label="เกินกำหนด"
            value={upcomingDue ? formatPrice(upcomingDue.summary.overdue_amount) : "—"}
            sub={upcomingDue ? `${upcomingDue.summary.overdue_count} งวดเกินกำหนด` : undefined}
            cls="bg-gradient-to-br from-red-50 to-pink-50 border-red-100 text-red-900"
          />
          <KpiTile
            label={`ใกล้ครบกำหนด (${upcomingDue?.days ?? dueDays} วัน)`}
            value={upcomingDue ? formatPrice(upcomingDue.summary.upcoming_amount) : "—"}
            sub={upcomingDue ? `${upcomingDue.summary.upcoming_count} งวด` : undefined}
            cls="bg-gradient-to-br from-sky-50 to-cyan-50 border-sky-100 text-sky-900"
          />
          <KpiTile
            label="หนี้คงค้างรวม"
            value={overview ? formatPrice(overview.total_outstanding) : "—"}
            sub={overview ? `จากสัญญา ${overview.contracts_count} ฉบับ` : undefined}
            cls="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 text-blue-900"
          />
          <KpiTile
            label="เก็บเงินวันนี้"
            value={dailySummary ? formatPrice(dailySummary.total_collected) : "—"}
            sub={dailySummary ? `เป้าหมาย ${formatPrice(dailySummary.total_expected)}` : undefined}
            cls="bg-gradient-to-br from-green-50 to-emerald-50 border-green-100 text-green-950"
          />
          <KpiTile
            label="เก็บเงินเดือนนี้"
            value={monthlySummary ? formatPrice(monthlySummary.total_paid) : "—"}
            sub={monthlySummary ? `เป้าหมาย ${formatPrice(monthlySummary.total_expected)}` : undefined}
            cls="bg-gradient-to-br from-purple-50 to-fuchsia-50 border-purple-100 text-purple-950"
          />
        </div>

        {/* Tabbed content — fills the rest of the screen, scrolls internally */}
        <div className="flex-1 min-h-0 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-1 px-3 pt-2 border-b border-gray-200 bg-gray-50 shrink-0">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border border-b-0 transition-colors -mb-px ${
                  activeTab === tab.key
                    ? "bg-white border-gray-200 text-primary-700"
                    : "bg-transparent border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                {tab.label}
                {tab.count !== null && (
                  <span
                    className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                      activeTab === tab.key
                        ? "bg-primary-50 text-primary-700"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0">
            {activeTab === "due" && (
              <DueTab
                data={upcomingDue}
                loading={loading}
                dueDays={dueDays}
                onDueDaysChange={setDueDays}
                canSendReminder={canSendReminder}
                onSent={handleBatchesInvalidated}
              />
            )}
            {activeTab === "contracts" && (
              <ContractsTab
                contracts={contracts}
                loading={contractsLoading}
                canSendReminder={canSendReminder}
              />
            )}
            {activeTab === "batches" && (
              <BatchesTab batches={batches} loading={batchesLoading} onRefresh={fetchBatches} />
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
