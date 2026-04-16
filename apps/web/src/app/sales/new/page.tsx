"use client";

import { useEffect, useState, useCallback, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/api";
import type {
  Customer,
  Motorcycle,
  Addon,
  SaleWithInstallments,
  PaginatedResponse,
} from "@csyfinproj/shared";

// ─── helpers ────────────────────────────────────────────────────────────────

function formatPrice(n: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(n);
}

// ─── step indicator ──────────────────────────────────────────────────────────

const STEPS = [
  "Customer",
  "Motorcycle",
  "Pricing",
  "Add-ons",
  "Confirm",
];

function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-0 mb-8">
      {STEPS.map((label, idx) => {
        const step = idx + 1;
        const done = step < current;
        const active = step === current;
        return (
          <li key={label} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                  done
                    ? "bg-primary-600 text-white"
                    : active
                    ? "bg-primary-600 text-white ring-2 ring-primary-200"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {done ? "✓" : step}
              </div>
              <span
                className={`text-xs font-medium ${
                  active ? "text-primary-700" : done ? "text-gray-600" : "text-gray-400"
                }`}
              >
                {label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className="w-8 h-px bg-gray-200 mx-2" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ─── step 1 — customer ───────────────────────────────────────────────────────

function StepCustomer({
  selected,
  onSelect,
}: {
  selected: Customer | null;
  onSelect: (c: Customer) => void;
}) {
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "10" });
      if (q) params.set("search", q);
      const res = await apiFetch<PaginatedResponse<Customer>>(`/customers?${params}`);
      setCustomers(res.data);
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch(search);
  }, [search, fetch]);

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900 mb-4">
        Select Customer
      </h2>
      <input
        type="text"
        placeholder="Search by name, phone, or ID card…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 mb-3 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
          ))
        ) : customers.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">
            No customers found.{" "}
            <Link href="/customers/new" className="text-primary-600 hover:underline">
              Add one first?
            </Link>
          </p>
        ) : (
          customers.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c)}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                selected?.id === c.id
                  ? "border-primary-500 bg-primary-50"
                  : "border-gray-200 hover:border-primary-300 hover:bg-gray-50"
              }`}
            >
              <p className="text-sm font-medium text-gray-900">{c.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {c.phone} · {c.idCardNumber}
              </p>
            </button>
          ))
        )}
      </div>
      <div className="mt-4">
        <Link
          href="/customers/new"
          className="text-xs text-primary-600 hover:underline"
        >
          + Add new customer
        </Link>
      </div>
    </div>
  );
}

// ─── step 2 — motorcycle ─────────────────────────────────────────────────────

function StepMotorcycle({
  selected,
  onSelect,
}: {
  selected: Motorcycle | null;
  onSelect: (m: Motorcycle) => void;
}) {
  const [search, setSearch] = useState("");
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMotos = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: "in_stock", limit: "20" });
      if (q) params.set("search", q);
      const res = await apiFetch<PaginatedResponse<Motorcycle>>(
        `/motorcycles?${params}`
      );
      setMotorcycles(res.data);
    } catch {
      setMotorcycles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMotos(search);
  }, [search, fetchMotos]);

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900 mb-4">
        Select Motorcycle
        <span className="ml-2 text-xs text-gray-400 font-normal">
          (in stock only)
        </span>
      </h2>
      <input
        type="text"
        placeholder="Search model, chassis, color…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 mb-3 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))
        ) : motorcycles.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">
            No motorcycles in stock.
          </p>
        ) : (
          motorcycles.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelect(m)}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                selected?.id === m.id
                  ? "border-primary-500 bg-primary-50"
                  : "border-gray-200 hover:border-primary-300 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {m.brand} {m.model} {m.year}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {m.color} · {m.chassisNumber}
                  </p>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {formatPrice(m.sellingPrice)}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ─── step 3 — pricing ────────────────────────────────────────────────────────

interface PricingForm {
  payment_method: "cash" | "installment";
  total_price: string;
  down_payment: string;
  num_installments: string;
  interest_rate: string;
  notes: string;
}

function StepPricing({
  motorcycle,
  form,
  onChange,
  errors,
}: {
  motorcycle: Motorcycle;
  form: PricingForm;
  onChange: (f: PricingForm) => void;
  errors: Partial<PricingForm>;
}) {
  const set = (field: keyof PricingForm, value: string) =>
    onChange({ ...form, [field]: value });

  const isInstallment = form.payment_method === "installment";
  const totalPrice = parseFloat(form.total_price) || 0;
  const downPayment = parseFloat(form.down_payment) || 0;
  const financeAmount = Math.max(0, totalPrice - downPayment);
  const numInstallments = parseInt(form.num_installments) || 0;
  const interestRate = parseFloat(form.interest_rate) || 0;
  const totalInterest = (financeAmount * interestRate * numInstallments) / 1200;
  const monthlyPayment =
    isInstallment && numInstallments > 0
      ? (financeAmount + totalInterest) / numInstallments
      : 0;

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900 mb-4">
        Configure Pricing
      </h2>

      <div className="space-y-5">
        {/* Payment method */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Method
          </label>
          <div className="flex gap-3">
            {(["cash", "installment"] as const).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => set("payment_method", method)}
                className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors capitalize ${
                  form.payment_method === method
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {method}
              </button>
            ))}
          </div>
        </div>

        {/* Total price */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Total Price (THB) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={1}
            value={form.total_price}
            onChange={(e) => set("total_price", e.target.value)}
            placeholder={String(motorcycle.sellingPrice)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          {errors.total_price && (
            <p className="mt-1 text-xs text-red-600">{errors.total_price}</p>
          )}
        </div>

        {/* Down payment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Down Payment (THB) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={0}
            value={form.down_payment}
            onChange={(e) => set("down_payment", e.target.value)}
            placeholder="0"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          {errors.down_payment && (
            <p className="mt-1 text-xs text-red-600">{errors.down_payment}</p>
          )}
        </div>

        {/* Installment fields */}
        {isInstallment && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  # Installments <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={form.num_installments}
                  onChange={(e) => set("num_installments", e.target.value)}
                  placeholder="12"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                {errors.num_installments && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.num_installments}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Interest Rate (% / yr)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.interest_rate}
                  onChange={(e) => set("interest_rate", e.target.value)}
                  placeholder="0"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Payment summary */}
            {financeAmount > 0 && numInstallments > 0 && (
              <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm space-y-1">
                <div className="flex justify-between text-gray-600">
                  <span>Finance amount</span>
                  <span>{formatPrice(financeAmount)}</span>
                </div>
                {totalInterest > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Total interest</span>
                    <span>{formatPrice(totalInterest)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-200">
                  <span>Monthly payment</span>
                  <span>{formatPrice(monthlyPayment)}</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
            placeholder="Optional notes…"
          />
        </div>
      </div>
    </div>
  );
}

// ─── step 4 — add-ons ────────────────────────────────────────────────────────

function StepAddons({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiFetch<{ data: Addon[] }>("/addons")
      .then((res) => setAddons(res.data.filter((a) => a.active)))
      .catch(() => setAddons([]))
      .finally(() => setLoading(false));
  }, []);

  const total = addons
    .filter((a) => selected.includes(a.id))
    .reduce((sum, a) => sum + a.price, 0);

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900 mb-1">
        Add-on Services
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Optional. Select any add-ons to include in this sale.
      </p>

      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse mb-2" />
        ))
      ) : addons.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">
          No add-ons available.
        </p>
      ) : (
        <div className="space-y-2">
          {addons.map((addon) => {
            const isSelected = selected.includes(addon.id);
            return (
              <button
                key={addon.id}
                type="button"
                onClick={() => onToggle(addon.id)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                  isSelected
                    ? "border-primary-500 bg-primary-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? "bg-primary-600 border-primary-600"
                          : "border-gray-300"
                      }`}
                    >
                      {isSelected && (
                        <span className="text-white text-xs font-bold leading-none">
                          ✓
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {addon.name}
                      </p>
                      {addon.description && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {addon.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatPrice(addon.price)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected.length > 0 && (
        <div className="mt-4 text-sm font-semibold text-gray-900 text-right">
          Add-ons total: {formatPrice(total)}
        </div>
      )}
    </div>
  );
}

// ─── step 5 — confirm ────────────────────────────────────────────────────────

function StepConfirm({
  customer,
  motorcycle,
  pricing,
  addonIds,
}: {
  customer: Customer;
  motorcycle: Motorcycle;
  pricing: PricingForm;
  addonIds: string[];
}) {
  const totalPrice = parseFloat(pricing.total_price) || 0;
  const downPayment = parseFloat(pricing.down_payment) || 0;
  const financeAmount = Math.max(0, totalPrice - downPayment);
  const numInstallments = parseInt(pricing.num_installments) || 0;
  const interestRate = parseFloat(pricing.interest_rate) || 0;

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900 mb-4">
        Confirm Sale
      </h2>
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg border border-gray-200 divide-y divide-gray-200">
          <div className="px-4 py-3">
            <p className="text-xs text-gray-500 mb-1">Customer</p>
            <p className="text-sm font-medium text-gray-900">{customer.name}</p>
            <p className="text-xs text-gray-500">{customer.phone}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-gray-500 mb-1">Motorcycle</p>
            <p className="text-sm font-medium text-gray-900">
              {motorcycle.brand} {motorcycle.model} {motorcycle.year}
            </p>
            <p className="text-xs text-gray-500">
              {motorcycle.color} · {motorcycle.chassisNumber}
            </p>
          </div>
          <div className="px-4 py-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Payment method</span>
              <span className="font-medium capitalize">
                {pricing.payment_method}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total price</span>
              <span className="font-medium">{formatPrice(totalPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Down payment</span>
              <span className="font-medium">{formatPrice(downPayment)}</span>
            </div>
            {pricing.payment_method === "installment" && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">Finance amount</span>
                  <span className="font-medium">{formatPrice(financeAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Installments</span>
                  <span className="font-medium">{numInstallments} months</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Interest rate</span>
                  <span className="font-medium">{interestRate}% / year</span>
                </div>
              </>
            )}
            {addonIds.length > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Add-ons</span>
                <span className="font-medium">{addonIds.length} selected</span>
              </div>
            )}
            {pricing.notes && (
              <div className="flex justify-between">
                <span className="text-gray-500">Notes</span>
                <span className="font-medium text-right max-w-[60%]">
                  {pricing.notes}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

const INITIAL_PRICING: PricingForm = {
  payment_method: "installment",
  total_price: "",
  down_payment: "",
  num_installments: "12",
  interest_rate: "0",
  notes: "",
};

function NewSalePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledCustomerId = searchParams.get("customer_id");

  const [step, setStep] = useState(1);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [motorcycle, setMotorcycle] = useState<Motorcycle | null>(null);
  const [pricing, setPricing] = useState<PricingForm>(INITIAL_PRICING);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [pricingErrors, setPricingErrors] = useState<Partial<PricingForm>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Pre-fill customer if coming from customer detail page
  useEffect(() => {
    if (prefilledCustomerId && !customer) {
      apiFetch<{ data: Customer }>(`/customers/${prefilledCustomerId}`)
        .then((res) => {
          setCustomer(res.data);
          setStep(2);
        })
        .catch(() => {});
    }
  }, [prefilledCustomerId, customer]);

  function toggleAddon(id: string) {
    setAddonIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function validatePricing(): boolean {
    const errors: Partial<PricingForm> = {};
    const totalPrice = parseFloat(pricing.total_price);
    if (!pricing.total_price || isNaN(totalPrice) || totalPrice <= 0) {
      errors.total_price = "Enter a valid total price";
    }
    const downPayment = parseFloat(pricing.down_payment);
    if (pricing.down_payment !== "" && (isNaN(downPayment) || downPayment < 0)) {
      errors.down_payment = "Enter a valid down payment";
    }
    if (
      pricing.payment_method === "installment" &&
      (!pricing.num_installments ||
        isNaN(parseInt(pricing.num_installments)) ||
        parseInt(pricing.num_installments) < 1)
    ) {
      errors.num_installments = "Enter a valid number of installments";
    }
    setPricingErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleNext() {
    if (step === 3 && !validatePricing()) return;
    setStep((s) => s + 1);
  }

  function handleBack() {
    setStep((s) => s - 1);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!customer || !motorcycle) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const body: Record<string, unknown> = {
        customer_id: customer.id,
        motorcycle_id: motorcycle.id,
        total_price: parseFloat(pricing.total_price),
        down_payment: parseFloat(pricing.down_payment) || 0,
        payment_method: pricing.payment_method,
        num_installments:
          pricing.payment_method === "installment"
            ? parseInt(pricing.num_installments)
            : 1,
        interest_rate:
          pricing.payment_method === "installment"
            ? parseFloat(pricing.interest_rate) || 0
            : 0,
      };
      if (addonIds.length > 0) body.addon_ids = addonIds;
      if (pricing.notes.trim()) body.notes = pricing.notes.trim();

      const res = await apiFetch<{ data: SaleWithInstallments }>("/sales", {
        method: "POST",
        body: JSON.stringify(body),
      });
      router.push(`/sales/${res.data.id}`);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to create sale"
      );
      setSubmitting(false);
    }
  }

  const canAdvance =
    (step === 1 && customer !== null) ||
    (step === 2 && motorcycle !== null) ||
    step === 3 ||
    step === 4;

  return (
    <DashboardLayout>
      <div className="px-8 py-8 max-w-2xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/sales" className="hover:text-gray-700">
            Sales
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">New Sale</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">New Sale</h1>

        <StepIndicator current={step} />

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-gray-200 p-6"
        >
          {step === 1 && (
            <StepCustomer selected={customer} onSelect={setCustomer} />
          )}
          {step === 2 && (
            <StepMotorcycle selected={motorcycle} onSelect={setMotorcycle} />
          )}
          {step === 3 && motorcycle && (
            <StepPricing
              motorcycle={motorcycle}
              form={pricing}
              onChange={setPricing}
              errors={pricingErrors}
            />
          )}
          {step === 4 && (
            <StepAddons selected={addonIds} onToggle={toggleAddon} />
          )}
          {step === 5 && customer && motorcycle && (
            <StepConfirm
              customer={customer}
              motorcycle={motorcycle}
              pricing={pricing}
              addonIds={addonIds}
            />
          )}

          {submitError && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-6 pt-5 border-t border-gray-100">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            ) : (
              <Link
                href="/sales"
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
            )}

            {step < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canAdvance}
                className="flex-1 px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Creating sale…" : "Confirm & Create Sale"}
              </button>
            )}
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

export default function NewSalePage() {
  return (
    <Suspense>
      <NewSalePageInner />
    </Suspense>
  );
}
