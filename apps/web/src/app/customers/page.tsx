"use client";

import { useEffect, useState, useCallback, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import FormModal from "@/components/FormModal";
import { apiFetch } from "@/lib/api";
import { toastSuccess, alertError } from "@/lib/swal";
import type { Customer, PaginatedResponse } from "@csyfinproj/shared";

const PAGE_SIZE = 20;

// ─── Add Customer Form ────────────────────────────────────────────────────────

interface NewCustomerForm {
  name: string;
  phone: string;
  id_card_number: string;
  email: string;
  line_id: string;
  address: string;
}

const INITIAL_FORM: NewCustomerForm = {
  name: "",
  phone: "",
  id_card_number: "",
  email: "",
  line_id: "",
  address: "",
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

interface AddCustomerFormProps {
  onSuccess: (customer: Customer) => void;
  onCancel: () => void;
}

function AddCustomerForm({ onSuccess, onCancel }: AddCustomerFormProps) {
  const [form, setForm] = useState<NewCustomerForm>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<NewCustomerForm>>({});
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function set(field: keyof NewCustomerForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate(): boolean {
    const newErrors: Partial<NewCustomerForm> = {};
    if (!form.name.trim()) newErrors.name = "กรุณากรอกชื่อ";
    if (!form.phone.trim()) newErrors.phone = "กรุณากรอกเบอร์โทรศัพท์";
    if (!form.id_card_number.trim()) {
      newErrors.id_card_number = "กรุณากรอกเลขบัตรประชาชน";
    } else if (form.id_card_number.replace(/\D/g, "").length !== 13) {
      newErrors.id_card_number = "เลขบัตรประชาชนต้องมี 13 หลัก";
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
      const body: Record<string, string | boolean> = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        id_card_number: form.id_card_number.trim(),
        consent_accepted: consent,
      };
      if (form.email.trim()) body.email = form.email.trim();
      if (form.line_id.trim()) body.line_id = form.line_id.trim();
      if (form.address.trim()) body.address = form.address.trim();

      const res = await apiFetch<{ data: Customer }>("/customers", {
        method: "POST",
        body: JSON.stringify(body),
      });
      toastSuccess("เพิ่มลูกค้าสำเร็จ");
      onSuccess(res.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "ไม่สามารถเพิ่มลูกค้าได้";
      setSubmitError(msg);
      alertError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <label className="flex items-start gap-2 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 rounded border-gray-300"
        />
        <span>
          ลูกค้ายินยอมให้เก็บและใช้ข้อมูลส่วนบุคคลเพื่อการซื้อขาย สัญญาเช่าซื้อ
          และการแจ้งเตือนการชำระเงิน ตาม{" "}
          <a href="/privacy-policy" target="_blank" className="text-primary-600 underline">
            นโยบายความเป็นส่วนตัว
          </a>{" "}
          (PDPA)
        </span>
      </label>

      {submitError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ชื่อ-นามสกุล <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="สมชาย ใจดี"
        />
        <FieldError message={errors.name} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          เบอร์โทรศัพท์ <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="081-234-5678"
        />
        <FieldError message={errors.phone} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          เลขบัตรประชาชน <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.id_card_number}
          onChange={(e) => set("id_card_number", e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="1234567890123"
          maxLength={13}
        />
        <FieldError message={errors.id_card_number} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="somchai@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">LINE ID</label>
          <input
            type="text"
            value={form.line_id}
            onChange={(e) => set("line_id", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="@somchai"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">ที่อยู่</label>
        <textarea
          rows={2}
          value={form.address}
          onChange={(e) => set("address", e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
          placeholder="123 หมู่ 4 ตำบล…"
        />
      </div>

      <div className="flex gap-3 pt-2">
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
          {submitting ? "กำลังเพิ่ม…" : "เพิ่มลูกค้า"}
        </button>
      </div>
    </form>
  );
}

// ─── Customers Page ───────────────────────────────────────────────────────────

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchCustomers = useCallback(
    async (currentPage: number, searchTerm: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(currentPage),
          limit: String(PAGE_SIZE),
        });
        if (searchTerm) params.set("search", searchTerm);

        const res = await apiFetch<PaginatedResponse<Customer>>(
          `/customers?${params}`
        );
        setCustomers(res.data);
        setTotal(res.total);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "ไม่สามารถโหลดข้อมูลลูกค้าได้"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchCustomers(page, search);
  }, [page, search, fetchCustomers]);

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleAddSuccess(customer: Customer) {
    setShowAddModal(false);
    router.push(`/customers/${customer.id}`);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <DashboardLayout>
      <div className="px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ลูกค้า</h1>
            <p className="text-sm text-gray-500 mt-1">
              ทั้งหมด {total} ราย
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            <span>+</span> เพิ่มลูกค้า
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="ค้นหาด้วยชื่อ เบอร์โทร หรือเลขบัตรประชาชน…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
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
                  <th className="text-left px-5 py-3 font-medium text-gray-500">ชื่อ</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">เบอร์โทร</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">เลขบัตรประชาชน</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">อีเมล</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j} className="px-5 py-3">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : customers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-12 text-center text-sm text-gray-400"
                    >
                      ไม่พบลูกค้า{" "}
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="text-primary-600 hover:underline"
                      >
                        เพิ่มลูกค้าใหม่?
                      </button>
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {customer.name}
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {customer.phone}
                      </td>
                      <td className="px-5 py-3 text-gray-500 font-mono text-xs">
                        {customer.idCardNumber}
                      </td>
                      <td className="px-5 py-3 text-gray-500">
                        {customer.email ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/customers/${customer.id}`}
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

      {/* Add Customer Modal */}
      <FormModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="เพิ่มลูกค้า"
      >
        <AddCustomerForm
          onSuccess={handleAddSuccess}
          onCancel={() => setShowAddModal(false)}
        />
      </FormModal>
    </DashboardLayout>
  );
}
