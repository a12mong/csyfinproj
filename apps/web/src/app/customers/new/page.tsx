"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/api";
import type { Customer } from "@csyfinproj/shared";

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

export default function NewCustomerPage() {
  const router = useRouter();
  const [form, setForm] = useState<NewCustomerForm>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<NewCustomerForm>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function set(field: keyof NewCustomerForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate(): boolean {
    const newErrors: Partial<NewCustomerForm> = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.phone.trim()) newErrors.phone = "Phone number is required";
    if (!form.id_card_number.trim()) {
      newErrors.id_card_number = "ID card number is required";
    } else if (form.id_card_number.replace(/\D/g, "").length !== 13) {
      newErrors.id_card_number = "ID card number must be 13 digits";
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
      const body: Record<string, string> = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        id_card_number: form.id_card_number.trim(),
      };
      if (form.email.trim()) body.email = form.email.trim();
      if (form.line_id.trim()) body.line_id = form.line_id.trim();
      if (form.address.trim()) body.address = form.address.trim();

      const res = await apiFetch<{ data: Customer }>("/customers", {
        method: "POST",
        body: JSON.stringify(body),
      });
      router.push(`/customers/${res.data.id}`);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to add customer"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="px-8 py-8 max-w-xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/customers" className="hover:text-gray-700">
            Customers
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Add Customer</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Customer</h1>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-gray-200 p-6 space-y-5"
          noValidate
        >
          {submitError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Somchai Jaidee"
            />
            <FieldError message={errors.name} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="081-234-5678"
            />
            <FieldError message={errors.phone} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ID Card Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.id_card_number}
              onChange={(e) => set("id_card_number", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="1234567890123"
              maxLength={13}
            />
            <FieldError message={errors.id_card_number} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="somchai@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              LINE ID
            </label>
            <input
              type="text"
              value={form.line_id}
              onChange={(e) => set("line_id", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="@somchai"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              rows={3}
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
              placeholder="123 Moo 4, Tambon…"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Adding…" : "Add Customer"}
            </button>
            <Link
              href="/customers"
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
