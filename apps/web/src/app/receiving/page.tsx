"use client";

import { useEffect, useState, useCallback, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import FormModal from "@/components/FormModal";
import { apiFetch } from "@/lib/api";
import { toastSuccess, alertError } from "@/lib/swal";
import { formatDate, TH } from "@/lib/format";

// ─── API shapes (snake_case from backend) ─────────────────────────────────────

interface DeliveryNoteListItem {
  id: string;
  note_number: string;
  supplier_name: string;
  received_date: string;
  status: "pending" | "verified" | "cancelled";
  item_count: number;
  received_by?: { id: string; name: string; email: string };
}

interface ListResponse {
  data: DeliveryNoteListItem[];
  total: number;
  page: number;
  totalPages: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "", label: "ทุกสถานะ" },
  { value: "pending", label: TH.grnStatus.pending },
  { value: "verified", label: TH.grnStatus.verified },
  { value: "cancelled", label: TH.grnStatus.cancelled },
];

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700",
  verified: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-700",
};

const PAGE_SIZE = 20;

// ─── Item row state ───────────────────────────────────────────────────────────

interface ItemRow {
  localId: string;
  item_type: "motorcycle" | "part" | "accessory";
  description: string;
  quantity: string;
  unit_cost: string;
  chassis_numbers: string;
  engine_numbers: string;
  color: string;
  year: string;
  selling_price: string;
}

function makeItem(): ItemRow {
  return {
    localId: Math.random().toString(36).slice(2),
    item_type: "motorcycle",
    description: "",
    quantity: "1",
    unit_cost: "",
    chassis_numbers: "",
    engine_numbers: "",
    color: "",
    year: String(new Date().getFullYear()),
    selling_price: "",
  };
}

// ─── New GRN Form ─────────────────────────────────────────────────────────────

interface NewGrnFormProps {
  onSuccess: (id: string) => void;
  onCancel: () => void;
}

function NewGrnForm({ onSuccess, onCancel }: NewGrnFormProps) {
  const [noteNumber, setNoteNumber] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [receivedDate, setReceivedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([makeItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateItem(localId: string, patch: Partial<ItemRow>) {
    setItems((prev) =>
      prev.map((it) => (it.localId === localId ? { ...it, ...patch } : it))
    );
  }

  function removeItem(localId: string) {
    setItems((prev) => prev.filter((it) => it.localId !== localId));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side validate motorcycle chassis/engine counts
    for (const item of items) {
      if (item.item_type === "motorcycle") {
        const qty = parseInt(item.quantity) || 0;
        const chassis = item.chassis_numbers
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        const engines = item.engine_numbers
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        if (chassis.length !== qty) {
          setError(
            `รายการ "${item.description || "(รถจักรยานยนต์)"}" ต้องมีเลขตัวถัง ${qty} รายการ แต่กรอกมา ${chassis.length} รายการ`
          );
          return;
        }
        if (engines.length !== qty) {
          setError(
            `รายการ "${item.description || "(รถจักรยานยนต์)"}" ต้องมีเลขเครื่องยนต์ ${qty} รายการ แต่กรอกมา ${engines.length} รายการ`
          );
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        note_number: noteNumber.trim(),
        supplier_name: supplierName.trim(),
        received_date: receivedDate,
        notes: notes.trim() || undefined,
        items: items.map((item) => {
          const qty = parseInt(item.quantity);
          const base: Record<string, unknown> = {
            item_type: item.item_type,
            description: item.description.trim(),
            quantity: qty,
            unit_cost: parseFloat(item.unit_cost),
          };
          if (item.item_type === "motorcycle") {
            base.chassis_numbers = item.chassis_numbers
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean);
            base.engine_numbers = item.engine_numbers
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean);
            if (item.color.trim()) base.color = item.color.trim();
            if (item.year) base.year = parseInt(item.year);
            if (item.selling_price)
              base.selling_price = parseFloat(item.selling_price);
          }
          return base;
        }),
      };

      const res = await apiFetch<{ data: { id: string } }>("/delivery-notes", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toastSuccess("สร้างใบรับสินค้าเรียบร้อยแล้ว");
      onSuccess(res.data.id);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "สร้างใบรับสินค้าไม่สำเร็จ";
      setError(msg);
      alertError(msg);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Basic fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            เลขที่ใบรับ <span className="text-red-500">*</span>
          </label>
          <input
            required
            type="text"
            value={noteNumber}
            onChange={(e) => setNoteNumber(e.target.value)}
            placeholder="GRN-2024-001"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            วันที่รับ <span className="text-red-500">*</span>
          </label>
          <input
            required
            type="date"
            value={receivedDate}
            onChange={(e) => setReceivedDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ชื่อผู้จำหน่าย <span className="text-red-500">*</span>
        </label>
        <input
          required
          type="text"
          value={supplierName}
          onChange={(e) => setSupplierName(e.target.value)}
          placeholder="Yamaha Motor Thailand"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          หมายเหตุ
        </label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
          placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)…"
        />
      </div>

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900">
            รายการสินค้า <span className="text-red-500">*</span>
          </h3>
          <button
            type="button"
            onClick={() => setItems((prev) => [...prev, makeItem()])}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            + เพิ่มรายการ
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={item.localId}
              className="rounded-lg border border-gray-200 p-3 space-y-3 bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600">
                  รายการที่ {idx + 1}
                </span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(item.localId)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    ลบ
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    ประเภท <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={item.item_type}
                    onChange={(e) =>
                      updateItem(item.localId, {
                        item_type: e.target.value as ItemRow["item_type"],
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="motorcycle">รถจักรยานยนต์</option>
                    <option value="part">อะไหล่</option>
                    <option value="accessory">อุปกรณ์เสริม</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    รายละเอียด <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={item.description}
                    onChange={(e) =>
                      updateItem(item.localId, { description: e.target.value })
                    }
                    placeholder={
                      item.item_type === "motorcycle"
                        ? "NMAX 155 2024"
                        : "รายละเอียดสินค้า"
                    }
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    จำนวน <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(item.localId, { quantity: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    ราคาทุนต่อหน่วย (บาท) <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={item.unit_cost}
                    onChange={(e) =>
                      updateItem(item.localId, { unit_cost: e.target.value })
                    }
                    placeholder="85000"
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                {item.item_type === "motorcycle" ? (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      ราคาขาย (บาท)
                    </label>
                    <input
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={item.selling_price}
                      onChange={(e) =>
                        updateItem(item.localId, {
                          selling_price: e.target.value,
                        })
                      }
                      placeholder="95000"
                      className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                ) : (
                  <div />
                )}
              </div>

              {item.item_type === "motorcycle" && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        สี
                      </label>
                      <input
                        type="text"
                        value={item.color}
                        onChange={(e) =>
                          updateItem(item.localId, { color: e.target.value })
                        }
                        placeholder="เช่น ดำด้าน"
                        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        ปี
                      </label>
                      <input
                        type="number"
                        min={1900}
                        max={2100}
                        value={item.year}
                        onChange={(e) =>
                          updateItem(item.localId, { year: e.target.value })
                        }
                        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        เลขตัวถัง{" "}
                        <span className="text-red-500">*</span>
                        <span className="text-gray-400 ml-1">
                          (บรรทัดละ 1 รายการ, จำนวน={item.quantity})
                        </span>
                      </label>
                      <textarea
                        required
                        rows={Math.max(2, parseInt(item.quantity) || 1)}
                        value={item.chassis_numbers}
                        onChange={(e) =>
                          updateItem(item.localId, {
                            chassis_numbers: e.target.value,
                          })
                        }
                        placeholder={"CHASSIS001\nCHASSIS002"}
                        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        เลขเครื่องยนต์{" "}
                        <span className="text-red-500">*</span>
                        <span className="text-gray-400 ml-1">
                          (บรรทัดละ 1 รายการ, จำนวน={item.quantity})
                        </span>
                      </label>
                      <textarea
                        required
                        rows={Math.max(2, parseInt(item.quantity) || 1)}
                        value={item.engine_numbers}
                        onChange={(e) =>
                          updateItem(item.localId, {
                            engine_numbers: e.target.value,
                          })
                        }
                        placeholder={"ENGINE001\nENGINE002"}
                        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none font-mono"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? "กำลังสร้าง…" : "สร้างใบรับสินค้า"}
        </button>
      </div>
    </form>
  );
}

// ─── Receiving Page ────────────────────────────────────────────────────────────

export default function ReceivingPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<DeliveryNoteListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const fetchNotes = useCallback(
    async (
      currentPage: number,
      status: string,
      supplier: string,
      from: string,
      to: string
    ) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: String(currentPage) });
        if (status) params.set("status", status);
        if (supplier) params.set("supplier", supplier);
        if (from) params.set("date_from", from);
        if (to) params.set("date_to", to);
        const res = await apiFetch<ListResponse>(`/delivery-notes?${params}`);
        setNotes(res.data);
        setTotal(res.total);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "โหลดใบรับสินค้าไม่สำเร็จ"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchNotes(page, statusFilter, supplierSearch, dateFrom, dateTo);
  }, [page, statusFilter, supplierSearch, dateFrom, dateTo, fetchNotes]);

  function handleSuccess(id: string) {
    setShowNewModal(false);
    router.push(`/receiving/${id}`);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <DashboardLayout>
      <div className="px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              รับสินค้าเข้า
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              ใบรับสินค้า {total} ใบ
            </p>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            <span>+</span> สร้างใบรับสินค้า
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="ค้นหาผู้จำหน่าย…"
            value={supplierSearch}
            onChange={(e) => {
              setSupplierSearch(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 w-48"
          />

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-400">–</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 font-medium text-gray-500">
                    เลขที่ใบรับ
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">
                    ผู้จำหน่าย
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">
                    วันที่รับ
                  </th>
                  <th className="text-center px-5 py-3 font-medium text-gray-500">
                    จำนวนรายการ
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">
                    สถานะ
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} className="px-5 py-3">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : notes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center text-sm text-gray-400"
                    >
                      ไม่พบใบรับสินค้า{" "}
                      <button
                        onClick={() => setShowNewModal(true)}
                        className="text-primary-600 hover:underline"
                      >
                        สร้างใบใหม่?
                      </button>
                    </td>
                  </tr>
                ) : (
                  notes.map((note) => (
                    <tr
                      key={note.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-5 py-3 font-mono font-medium text-gray-900">
                        {note.note_number}
                      </td>
                      <td className="px-5 py-3 text-gray-700">
                        {note.supplier_name}
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {formatDate(note.received_date)}
                      </td>
                      <td className="px-5 py-3 text-center text-gray-600">
                        {note.item_count}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            STATUS_STYLES[note.status] ??
                            "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {TH.grnStatus[note.status] ?? note.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/receiving/${note.id}`}
                          className="text-primary-600 hover:text-primary-700 text-xs font-medium"
                        >
                          ดูรายละเอียด
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
              <span className="text-xs text-gray-500">
                หน้า {page} จาก {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 text-xs rounded-md border border-gray-300 bg-white text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  ก่อนหน้า
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 text-xs rounded-md border border-gray-300 bg-white text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New GRN Modal */}
      <FormModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="สร้างใบรับสินค้า (GRN)"
        maxWidth="max-w-2xl"
      >
        <NewGrnForm
          onSuccess={handleSuccess}
          onCancel={() => setShowNewModal(false)}
        />
      </FormModal>
    </DashboardLayout>
  );
}
