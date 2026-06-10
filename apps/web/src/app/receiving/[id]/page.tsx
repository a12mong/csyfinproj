"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/api";
import { confirm, toastSuccess, alertError } from "@/lib/swal";

// ─── API shapes (snake_case from backend) ─────────────────────────────────────

interface MotorcycleRef {
  id: string;
  brand: string;
  model: string;
  year: number;
  chassisNumber: string;
  engineNumber: string;
  color: string;
  status: string;
}

interface DeliveryNoteItemApi {
  id: string;
  delivery_note_id: string;
  item_type: "motorcycle" | "part" | "accessory";
  description: string;
  quantity: number;
  unit_cost: number;
  created_at: string;
  motorcycles: MotorcycleRef[];
}

interface DeliveryNoteDetailApi {
  id: string;
  note_number: string;
  supplier_name: string;
  received_date: string;
  received_by_user_id: string;
  notes: string | null;
  status: "pending" | "verified" | "cancelled";
  created_at: string;
  updated_at: string;
  received_by?: { id: string; name: string; email: string };
  items: DeliveryNoteItemApi[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700",
  verified: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-700",
};

const MOTO_STATUS_STYLES: Record<string, string> = {
  in_stock: "bg-green-50 text-green-700",
  reserved: "bg-blue-50 text-blue-700",
  sold: "bg-gray-100 text-gray-500",
};

const ITEM_TYPE_STYLES: Record<string, string> = {
  motorcycle: "bg-indigo-50 text-indigo-700",
  part: "bg-orange-50 text-orange-700",
  accessory: "bg-purple-50 text-purple-700",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatPrice(n: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReceivingDetailPage() {
  const params = useParams<{ id: string }>();
  const [note, setNote] = useState<DeliveryNoteDetailApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchNote = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: DeliveryNoteDetailApi }>(
        `/delivery-notes/${params.id}`
      );
      setNote(res.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load delivery note"
      );
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  async function handleVerify() {
    const ok = await confirm({
      title: "Verify Delivery Note?",
      text: "This will mark the note as verified. All motorcycle records will be confirmed in inventory.",
      confirmText: "Verify",
      icon: "question",
    });
    if (!ok) return;

    setActionLoading(true);
    try {
      const res = await apiFetch<{ data: DeliveryNoteDetailApi }>(
        `/delivery-notes/${params.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: "verified" }),
        }
      );
      setNote(res.data);
      toastSuccess("Delivery note verified successfully");
    } catch (err) {
      alertError(
        err instanceof Error ? err.message : "Failed to verify delivery note"
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    const ok = await confirm({
      title: "Cancel Delivery Note?",
      text: "Unsold motorcycles will be unlinked from this GRN. This cannot be undone.",
      confirmText: "Cancel Note",
      icon: "warning",
    });
    if (!ok) return;

    setActionLoading(true);
    try {
      const res = await apiFetch<{ data: DeliveryNoteDetailApi }>(
        `/delivery-notes/${params.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: "cancelled" }),
        }
      );
      setNote(res.data);
      toastSuccess("Delivery note cancelled");
    } catch (err) {
      alertError(
        err instanceof Error ? err.message : "Failed to cancel delivery note"
      );
    } finally {
      setActionLoading(false);
    }
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <DashboardLayout>
        <div className="px-8 py-8">
          <div className="h-5 w-40 bg-gray-100 rounded animate-pulse mb-6" />
          <div className="h-8 w-64 bg-gray-100 rounded animate-pulse mb-4" />
          <div className="grid grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-200 p-4 h-16 animate-pulse"
              />
            ))}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-5 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────

  if (error || !note) {
    return (
      <DashboardLayout>
        <div className="px-8 py-8">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
            {error ?? "Delivery note not found"}
          </div>
          <Link
            href="/receiving"
            className="text-sm text-primary-600 hover:underline"
          >
            ← Back to Receiving
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const isPending = note.status === "pending";
  const totalValue = note.items.reduce(
    (sum, it) => sum + it.quantity * it.unit_cost,
    0
  );

  return (
    <DashboardLayout>
      <div className="px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-5">
          <Link href="/receiving" className="hover:text-primary-600">
            Receiving
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{note.note_number}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">
                {note.note_number}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                  STATUS_STYLES[note.status] ?? "bg-gray-100 text-gray-500"
                }`}
              >
                {note.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">{note.supplier_name}</p>
          </div>

          {isPending && (
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                Cancel Note
              </button>
              <button
                onClick={handleVerify}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                Verify Note
              </button>
            </div>
          )}
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Received Date", value: formatDate(note.received_date) },
            {
              label: "Received By",
              value: note.received_by?.name ?? note.received_by_user_id,
            },
            {
              label: "Total Items",
              value: `${note.items.length} line${note.items.length !== 1 ? "s" : ""}`,
            },
            { label: "Total Value", value: formatPrice(totalValue) },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-white rounded-xl border border-gray-200 px-4 py-3"
            >
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">
                {card.value}
              </p>
            </div>
          ))}
        </div>

        {/* Notes */}
        {note.notes && (
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 mb-6">
            <p className="text-xs text-gray-500 mb-1">Notes</p>
            <p className="text-sm text-gray-700">{note.notes}</p>
          </div>
        )}

        {/* Items */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">
              Received Items
            </h2>
          </div>

          <div className="divide-y divide-gray-50">
            {note.items.map((item, idx) => (
              <div key={item.id} className="px-5 py-4">
                {/* Item header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-400">#{idx + 1}</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                        ITEM_TYPE_STYLES[item.item_type] ??
                        "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {item.item_type}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {item.description}
                    </span>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatPrice(item.quantity * item.unit_cost)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {item.quantity} × {formatPrice(item.unit_cost)}
                    </p>
                  </div>
                </div>

                {/* Motorcycle sub-table */}
                {item.item_type === "motorcycle" &&
                  item.motorcycles.length > 0 && (
                    <div className="mt-3 rounded-lg border border-gray-100 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="text-left px-3 py-2 font-medium text-gray-500">
                              Model / Year
                            </th>
                            <th className="text-left px-3 py-2 font-medium text-gray-500">
                              Chassis
                            </th>
                            <th className="text-left px-3 py-2 font-medium text-gray-500">
                              Engine
                            </th>
                            <th className="text-left px-3 py-2 font-medium text-gray-500">
                              Color
                            </th>
                            <th className="text-left px-3 py-2 font-medium text-gray-500">
                              Status
                            </th>
                            <th className="px-3 py-2" />
                          </tr>
                        </thead>
                        <tbody>
                          {item.motorcycles.map((moto) => (
                            <tr
                              key={moto.id}
                              className="border-b border-gray-50 last:border-0"
                            >
                              <td className="px-3 py-2 text-gray-700">
                                {moto.model} {moto.year}
                              </td>
                              <td className="px-3 py-2 font-mono text-gray-600">
                                {moto.chassisNumber}
                              </td>
                              <td className="px-3 py-2 font-mono text-gray-600">
                                {moto.engineNumber}
                              </td>
                              <td className="px-3 py-2 text-gray-600">
                                {moto.color}
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                    MOTO_STATUS_STYLES[moto.status] ??
                                    "bg-gray-100 text-gray-500"
                                  }`}
                                >
                                  {moto.status.replace(/_/g, " ")}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right">
                                <Link
                                  href={`/inventory/${moto.id}`}
                                  className="text-primary-600 hover:text-primary-700 font-medium"
                                >
                                  View →
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                {/* Motorcycle item with no records yet */}
                {item.item_type === "motorcycle" &&
                  item.motorcycles.length === 0 && (
                    <p className="mt-2 text-xs text-gray-400 italic">
                      No motorcycle records linked.
                    </p>
                  )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
