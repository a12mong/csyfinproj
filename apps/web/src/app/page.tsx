"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/api";
import type { PaginatedResponse, Motorcycle } from "@csyfinproj/shared";

interface DashboardStats {
  totalInventory: number;
  inStock: number;
  reserved: number;
  sold: number;
  activeSales: number;
  overdueInstallments: number;
}

interface StatCardProps {
  title: string;
  value: number | string;
  sub?: string;
  accent?: string;
}

function StatCard({ title, value, sub, accent = "bg-primary-50 text-primary-700" }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-2">
      <span className="text-sm font-medium text-gray-500">{title}</span>
      <span className={`text-3xl font-bold ${accent}`}>{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [allMoto, inStock, reserved, sold, sales, overdue] =
          await Promise.all([
            apiFetch<PaginatedResponse<Motorcycle>>("/motorcycles?limit=1"),
            apiFetch<PaginatedResponse<Motorcycle>>(
              "/motorcycles?status=in_stock&limit=1"
            ),
            apiFetch<PaginatedResponse<Motorcycle>>(
              "/motorcycles?status=reserved&limit=1"
            ),
            apiFetch<PaginatedResponse<Motorcycle>>(
              "/motorcycles?status=sold&limit=1"
            ),
            apiFetch<{ data: unknown[]; total: number }>(
              "/sales?status=active&limit=1"
            ),
            apiFetch<{ data: unknown[]; total: number }>(
              "/installments?overdue=true&limit=1"
            ),
          ]);

        setStats({
          totalInventory: allMoto.total,
          inStock: inStock.total,
          reserved: reserved.total,
          sold: sold.total,
          activeSales: sales.total,
          overdueInstallments: overdue.total,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load stats");
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <DashboardLayout>
      <div className="px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Overview of your motorcycle sales business
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-200 p-6 h-28 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <>
            {/* Inventory Stats */}
            <div className="mb-6">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                Inventory
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard
                  title="Total Inventory"
                  value={stats?.totalInventory ?? 0}
                  sub="All motorcycles"
                  accent="text-gray-900"
                />
                <StatCard
                  title="In Stock"
                  value={stats?.inStock ?? 0}
                  sub="Available for sale"
                  accent="text-green-600"
                />
                <StatCard
                  title="Reserved"
                  value={stats?.reserved ?? 0}
                  sub="Pending completion"
                  accent="text-yellow-600"
                />
                <StatCard
                  title="Sold"
                  value={stats?.sold ?? 0}
                  sub="Completed sales"
                  accent="text-red-600"
                />
              </div>
            </div>

            {/* Finance Stats */}
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                Finance
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <StatCard
                  title="Active Sales"
                  value={stats?.activeSales ?? 0}
                  sub="Sales with open installments"
                  accent="text-primary-700"
                />
                <StatCard
                  title="Overdue Payments"
                  value={stats?.overdueInstallments ?? 0}
                  sub="Installments past due date"
                  accent={
                    (stats?.overdueInstallments ?? 0) > 0
                      ? "text-red-600"
                      : "text-gray-900"
                  }
                />
              </div>
            </div>

            {/* Quick links */}
            <div className="mt-8">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                Quick actions
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <a
                  href="/inventory"
                  className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 px-5 py-4 hover:border-primary-400 hover:shadow-sm transition-all"
                >
                  <span className="text-2xl">+</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Add Motorcycle
                    </p>
                    <p className="text-xs text-gray-500">Register new stock</p>
                  </div>
                </a>
                <a
                  href="/inventory"
                  className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 px-5 py-4 hover:border-primary-400 hover:shadow-sm transition-all"
                >
                  <span className="text-2xl">🏍</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      View Inventory
                    </p>
                    <p className="text-xs text-gray-500">Manage stock list</p>
                  </div>
                </a>
                <a
                  href="/finance"
                  className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 px-5 py-4 hover:border-primary-400 hover:shadow-sm transition-all"
                >
                  <span className="text-2xl">📋</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Installments
                    </p>
                    <p className="text-xs text-gray-500">Track payments</p>
                  </div>
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
