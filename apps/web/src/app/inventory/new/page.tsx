"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/api";
import type { Motorcycle } from "@csyfinproj/shared";

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

export default function NewMotorcyclePage() {
  const router = useRouter();
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
      router.push("/inventory");
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to add motorcycle"
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
          <Link href="/inventory" className="hover:text-gray-700">
            Inventory
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Add Motorcycle</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Add Motorcycle
        </h1>

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

          {/* Brand */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Brand
            </label>
            <input
              type="text"
              value={form.brand}
              onChange={(e) => set("brand", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Yamaha"
            />
            <FieldError message={errors.brand} />
          </div>

          {/* Model */}
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

          {/* Year */}
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

          {/* Color */}
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

          {/* Chassis Number */}
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

          {/* Engine Number */}
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

          {/* Prices */}
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

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Adding…" : "Add Motorcycle"}
            </button>
            <Link
              href="/inventory"
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
