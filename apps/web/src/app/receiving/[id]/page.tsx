"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/api";
import { confirm, toastSuccess, alertError } from "@/lib/swal";
import { formatPrice, formatDate, TH } from "@/lib/format";

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
  reserved: "bg-yellow-50 text-yellow-700",
  sold: "bg-red-50 text-red-700",
};

const ITEM_TYPE_STYLES: Record<string, string> = {
  motorcycle: "bg-indigo-50 text-indigo-700",
  part: "bg-orange-50 text-orange-700",
  accessory: "bg-purple-50 text-purple-700",
};

const ITEM_TYPE_TH: Record<string, string> = {
  motorcycle: "รถจักรยานยนต์",
  part: "อะไหล่",
  accessory: "อุปกรณ์เสริม",
};

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
        err instanceof Error ? err.message : "โหลดใบรับสินค้าไม่สำเร็จ"
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
      title: "ยืนยันการตรวจรับใบรับสินค้า?",
      text: "ใบรับสินค้าจะถูกทำเครื่องหมายว่าตรวจรับแล้ว และข้อมูลรถทั้งหมดจะถูกยืนยันเข้าคลังสินค้า",
      confirmText: "ตรวจรับ",
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
      toastSuccess("ตรวจรับใบรับสินค้าเรียบร้อยแล้ว");
    } catch (err) {
      alertError(
        err instanceof Error ? err.message : "ตรวจรับใบรับสินค้าไม่สำเร็จ"
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    const ok = await confirm({
      title: "ยกเลิกใบรับสินค้า?",
      text: "รถที่ยังไม่ถูกขายจะถูกยกเลิกการเชื่อมโยงกับใบรับนี้ และไม่สามารถย้อนกลับได้",
      confirmText: "ยกเลิกใบรับ",
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
      toastSuccess("ยกเลิกใบรับสินค้าแล้ว");
    } catch (err) {
      alertError(
        err instanceof Error ? err.message : "ยกเลิกใบรับสินค้าไม่สำเร็จ"
      );
    } finally {
      setActionLoading(false);
    }
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <DashboardLayout>
        <div className="px-8 py-6 max-w-5xl">
          <div className="h-5 w-40 bg-gray-100 rounded animate-pulse mb-6" />
          <div className="h-8 w-64 bg-gray-100 rounded animate-pulse mb-4" />
          <div className="grid grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 h-16 animate-pulse"
              />
            ))}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
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
        <div className="px-8 py-6 max-w-5xl">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
            {error ?? "ไม่พบใบรับสินค้า"}
          </div>
          <Link
            href="/receiving"
            className="text-sm text-primary-600 hover:underline"
          >
            ← กลับไปหน้ารับสินค้าเข้า
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
      <div className="px-8 py-6 max-w-5xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/receiving" className="hover:text-gray-700 transition-colors">
            รับสินค้าเข้า
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
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  STATUS_STYLES[note.status] ?? "bg-gray-100 text-gray-500"
                }`}
              >
                {TH.grnStatus[note.status] ?? note.status}
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
                ยกเลิกใบรับ
              </button>
              <button
                onClick={handleVerify}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                ตรวจรับ
              </button>
            </div>
          )}
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "วันที่รับ", value: formatDate(note.received_date) },
            {
              label: "ผู้รับสินค้า",
              value: note.received_by?.name ?? note.received_by_user_id,
            },
            {
              label: "จำนวนรายการ",
              value: `${note.items.length} รายการ`,
            },
            { label: "มูลค่ารวม", value: formatPrice(totalValue) },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3"
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
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 mb-6">
            <p className="text-xs text-gray-500 mb-1">หมายเหตุ</p>
            <p className="text-sm text-gray-700">{note.notes}</p>
          </div>
        )}

        {/* Items */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">
              รายการที่รับเข้า
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
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        ITEM_TYPE_STYLES[item.item_type] ??
                        "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {ITEM_TYPE_TH[item.item_type] ?? item.item_type}
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
                              รุ่น / ปี
                            </th>
                            <th className="text-left px-3 py-2 font-medium text-gray-500">
                              เลขตัวถัง
                            </th>
                            <th className="text-left px-3 py-2 font-medium text-gray-500">
                              เลขเครื่องยนต์
                            </th>
                            <th className="text-left px-3 py-2 font-medium text-gray-500">
                              สี
                            </th>
                            <th className="text-left px-3 py-2 font-medium text-gray-500">
                              สถานะ
                            </th>
                            <th className="px-3 py-2" />
                          </tr>
                        </thead>
                        <tbody>
                          {item.motorcycles.map((moto) => (
                            <tr
                              key={moto.id}
                              className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
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
                                  {TH.motorcycleStatus[moto.status] ?? moto.status}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right">
                                <Link
                                  href={`/inventory/${moto.id}`}
                                  className="text-primary-600 hover:text-primary-700 font-medium"
                                >
                                  ดู →
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
                    <p className="mt-2 text-xs text-gray-400">
                      ยังไม่มีข้อมูลรถที่เชื่อมโยง
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
