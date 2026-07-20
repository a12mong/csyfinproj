"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { apiFetch } from "@/lib/api";
import { formatPrice, TH } from "@/lib/format";
import type { Motorcycle } from "@csyfinproj/shared";

type MotorcycleStatus = Motorcycle["status"];

const STATUS_OPTIONS: { value: MotorcycleStatus; label: string }[] = [
  { value: "in_stock", label: TH.motorcycleStatus.in_stock },
  { value: "reserved", label: TH.motorcycleStatus.reserved },
  { value: "sold", label: TH.motorcycleStatus.sold },
];

interface EditForm {
  model: string;
  color: string;
  selling_price: string;
  status: MotorcycleStatus;
}

export default function MotorcycleDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [moto, setMoto] = useState<Motorcycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState<EditForm>({
    model: "",
    color: "",
    selling_price: "",
    status: "in_stock",
  });

  useEffect(() => {
    async function fetchMoto() {
      try {
        const res = await apiFetch<{ data: Motorcycle }>(
          `/motorcycles/${params.id}`
        );
        setMoto(res.data);
        setForm({
          model: res.data.model,
          color: res.data.color,
          selling_price: String(res.data.sellingPrice),
          status: res.data.status,
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "โหลดข้อมูลรถไม่สำเร็จ"
        );
      } finally {
        setLoading(false);
      }
    }
    fetchMoto();
  }, [params.id]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    const sellingPrice = parseFloat(form.selling_price);
    if (isNaN(sellingPrice) || sellingPrice <= 0) {
      setSaveError("ราคาขายต้องเป็นจำนวนบวก");
      setSaving(false);
      return;
    }

    try {
      const res = await apiFetch<{ data: Motorcycle }>(
        `/motorcycles/${params.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            model: form.model,
            color: form.color,
            selling_price: sellingPrice,
            status: form.status,
          }),
        }
      );
      setMoto(res.data);
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="px-8 py-6">
          <div className="h-8 w-48 bg-gray-100 rounded animate-pulse mb-4" />
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-6 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !moto) {
    return (
      <DashboardLayout>
        <div className="px-8 py-6">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error ?? "ไม่พบข้อมูลรถ"}
          </div>
          <Link
            href="/inventory"
            className="mt-4 inline-block text-sm text-primary-600 hover:underline"
          >
            ← กลับไปหน้าคลังสินค้า
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="px-8 py-6 max-w-2xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/inventory" className="hover:text-gray-700 transition-colors">
            คลังสินค้า
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">
            {moto.brand} {moto.model}
          </span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {moto.brand} {moto.model}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm text-gray-500">{moto.year}</span>
              <StatusBadge status={moto.status} />
            </div>
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              แก้ไข
            </button>
          )}
        </div>

        {editing ? (
          /* Edit form */
          <form
            onSubmit={handleSave}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5"
          >
            <h2 className="text-sm font-semibold text-gray-700">
              แก้ไขข้อมูลรถ
            </h2>

            {saveError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {saveError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                รุ่น
              </label>
              <input
                type="text"
                required
                value={form.model}
                onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                สี
              </label>
              <input
                type="text"
                required
                value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ราคาขาย (บาท)
              </label>
              <input
                type="number"
                required
                min={1}
                step={0.01}
                value={form.selling_price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, selling_price: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                สถานะ
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.value as MotorcycleStatus,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setSaveError(null);
                  setForm({
                    model: moto.model,
                    color: moto.color,
                    selling_price: String(moto.sellingPrice),
                    status: moto.status,
                  });
                }}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "กำลังบันทึก…" : "บันทึก"}
              </button>
            </div>
          </form>
        ) : (
          /* Detail view */
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
            {[
              { label: "ยี่ห้อ", value: moto.brand },
              { label: "รุ่น", value: moto.model },
              { label: "ปี", value: moto.year },
              { label: "สี", value: moto.color },
              { label: "เลขตัวถัง", value: moto.chassisNumber },
              { label: "เลขเครื่องยนต์", value: moto.engineNumber },
              {
                label: "ราคาทุน",
                value:
                  moto.costPrice != null ? formatPrice(moto.costPrice) : "ไม่มีสิทธิ์ดู",
              },
              {
                label: "ราคาขาย",
                value: (
                  <span className="font-semibold text-gray-900">
                    {formatPrice(moto.sellingPrice)}
                  </span>
                ),
              },
              {
                label: "สถานะ",
                value: <StatusBadge status={moto.status} />,
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between px-6 py-4"
              >
                <span className="text-sm text-gray-500">{label}</span>
                <span className="text-sm text-gray-900">{value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6">
          <Link
            href="/inventory"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← กลับไปหน้าคลังสินค้า
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
