"use client";

import { useEffect, useState, useCallback, FormEvent } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import FormModal from "@/components/FormModal";
import { apiFetch } from "@/lib/api";
import { toastSuccess, alertError } from "@/lib/swal";
import type { Motorcycle, PaginatedResponse } from "@csyfinproj/shared";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "in_stock", label: "In Stock" },
  { value: "reserved", label: "Reserved" },
  { value: "sold", label: "Sold" },
];

const PAGE_SIZE = 20;

function formatPrice(n: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(n);
}

// ─── Add Motorcycle Form ──────────────────────────────────────────────────────

interface NewMotorcycleForm {
  brand: string;
  model: string;
  year: string;
  chassis_number: string;
  engine_number: string;
  color: string;
  cost_price: string;
  selling_price: string;
}

const INITIAL_FORM: NewMotorcycleForm = {
  brand: "Yamaha",
  model: "",
  year: String(new Date().getFullYear()),
  chassis_number: "",
  engine_number: "",
  color: "",
  cost_price: "",
  selling_price: "",
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

interface AddMotorcycleFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

function AddMotorcycleForm({ onSuccess, onCancel }: AddMotorcycleFormProps) {
  const [form, setForm] = useState<NewMotorcycleForm>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<NewMotorcycleForm>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function set(field: keyof NewMotorcycleForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate(): boolean {
    const newErrors: Partial<NewMotorcycleForm> = {};
    if (!form.brand.trim()) newErrors.brand = "Brand is required";
    if (!form.model.trim()) newErrors.model = "Model is required";
    const year = parseInt(form.year);
    if (!form.year || isNaN(year) || year < 1900 || year > 2100) {
      newErrors.year = "Enter a valid year (e.g. 2024)";
    }
    if (!form.chassis_number.trim())
      newErrors.chassis_number = "Chassis number is required";
    if (!form.engine_number.trim())
      newErrors.engine_number = "Engine number is required";
    if (!form.color.trim()) newErrors.color = "Color is required";
    const costPrice = parseFloat(form.cost_price);
    if (!form.cost_price || isNaN(costPrice) || costPrice <= 0) {
      newErrors.cost_price = "Enter a valid cost price";
    }
    const sellingPrice = parseFloat(form.selling_price);
    if (!form.selling_price || isNaN(sellingPrice) || sellingPrice <= 0) {
      newErrors.selling_price = "Enter a valid selling price";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await apiFetch<{ data: Motorcycle }>("/motorcycles", {
        method: "POST",
        body: JSON.stringify({
          brand: form.brand.trim(),
          model: form.model.trim(),
          year: parseInt(form.year),
          chassis_number: form.chassis_number.trim(),
          engine_number: form.engine_number.trim(),
          color: form.color.trim(),
          cost_price: parseFloat(form.cost_price),
          selling_price: parseFloat(form.selling_price),
        }),
      });
      toastSuccess("Motorcycle added successfully");
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add motorcycle";
      setSubmitError(msg);
      alertError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {submitError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
          <input
            type="text"
            value={form.brand}
            onChange={(e) => set("brand", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="Yamaha"
          />
          <FieldError message={errors.brand} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Model <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.model}
            onChange={(e) => set("model", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="NMAX 155"
          />
          <FieldError message={errors.model} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Year <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={form.year}
            onChange={(e) => set("year", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="2024"
            min={1900}
            max={2100}
          />
          <FieldError message={errors.year} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Color <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.color}
            onChange={(e) => set("color", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="Midnight Black"
          />
          <FieldError message={errors.color} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Chassis Number <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.chassis_number}
          onChange={(e) => set("chassis_number", e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="SG5EJ-000001"
        />
        <FieldError message={errors.chassis_number} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Engine Number <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.engine_number}
          onChange={(e) => set("engine_number", e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="G3C9E-000001"
        />
        <FieldError message={errors.engine_number} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cost Price (THB) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={form.cost_price}
            onChange={(e) => set("cost_price", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="70000"
            min={1}
            step={0.01}
          />
          <FieldError message={errors.cost_price} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Selling Price (THB) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={form.selling_price}
            onChange={(e) => set("selling_price", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="84900"
            min={1}
            step={0.01}
          />
          <FieldError message={errors.selling_price} />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? "Adding…" : "Add Motorcycle"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Inventory Page ───────────────────────────────────────────────────────────

export default function InventoryPage() {
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchMotorcycles = useCallback(
    async (currentPage: number, searchTerm: string, status: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(currentPage),
          limit: String(PAGE_SIZE),
        });
        if (searchTerm) params.set("search", searchTerm);
        if (status) params.set("status", status);

        const res = await apiFetch<PaginatedResponse<Motorcycle>>(
          `/motorcycles?${params}`
        );
        setMotorcycles(res.data);
        setTotal(res.total);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load inventory"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchMotorcycles(page, search, statusFilter);
  }, [page, search, statusFilter, fetchMotorcycles]);

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleStatusFilter(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  function handleAddSuccess() {
    setShowAddModal(false);
    fetchMotorcycles(page, search, statusFilter);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <DashboardLayout>
      <div className="px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
            <p className="text-sm text-gray-500 mt-1">
              {total} motorcycle{total !== 1 ? "s" : ""} total
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            <span>+</span> Add Motorcycle
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder="Search model, chassis, color…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Model</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Year</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Color</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Chassis #</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Selling Price</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="px-5 py-3">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : motorcycles.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-sm text-gray-400"
                    >
                      No motorcycles found.{" "}
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="text-primary-600 hover:underline"
                      >
                        Add one?
                      </button>
                    </td>
                  </tr>
                ) : (
                  motorcycles.map((moto) => (
                    <tr
                      key={moto.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {moto.brand} {moto.model}
                      </td>
                      <td className="px-5 py-3 text-gray-600">{moto.year}</td>
                      <td className="px-5 py-3 text-gray-600">{moto.color}</td>
                      <td className="px-5 py-3 text-gray-500 font-mono text-xs">
                        {moto.chassisNumber}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={moto.status} />
                      </td>
                      <td className="px-5 py-3 text-right text-gray-900 font-medium">
                        {formatPrice(moto.sellingPrice)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/inventory/${moto.id}`}
                          className="text-primary-600 hover:text-primary-700 text-xs font-medium"
                        >
                          View
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
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 text-xs rounded-md border border-gray-300 text-gray-600 disabled:opacity-40 hover:bg-white transition-colors"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 text-xs rounded-md border border-gray-300 text-gray-600 disabled:opacity-40 hover:bg-white transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Motorcycle Modal */}
      <FormModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Motorcycle"
        maxWidth="max-w-xl"
      >
        <AddMotorcycleForm
          onSuccess={handleAddSuccess}
          onCancel={() => setShowAddModal(false)}
        />
      </FormModal>
    </DashboardLayout>
  );
}
