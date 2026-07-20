"use client";

import { useEffect, useState, useCallback, FormEvent } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import FormModal from "@/components/FormModal";
import { apiFetch } from "@/lib/api";
import { toastSuccess, alertError } from "@/lib/swal";
import { formatPrice, TH } from "@/lib/format";
import type { Motorcycle, PaginatedResponse, Addon } from "@csyfinproj/shared";

const STATUS_OPTIONS = [
  { value: "", label: "ทุกสถานะ" },
  { value: "in_stock", label: TH.motorcycleStatus.in_stock },
  { value: "reserved", label: TH.motorcycleStatus.reserved },
  { value: "sold", label: TH.motorcycleStatus.sold },
];

const ADDON_TYPE_TH: Record<string, string> = {
  part: "อะไหล่",
  accessory: "อุปกรณ์เสริม",
  service: "บริการ",
};

const PAGE_SIZE = 20;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600">{message}</p>;
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
    if (!form.brand.trim()) newErrors.brand = "กรุณากรอกยี่ห้อ";
    if (!form.model.trim()) newErrors.model = "กรุณากรอกรุ่น";
    const year = parseInt(form.year);
    if (!form.year || isNaN(year) || year < 1900 || year > 2100) {
      newErrors.year = "กรุณากรอกปี ค.ศ. ที่ถูกต้อง (เช่น 2024)";
    }
    if (!form.chassis_number.trim())
      newErrors.chassis_number = "กรุณากรอกเลขตัวถัง";
    if (!form.engine_number.trim())
      newErrors.engine_number = "กรุณากรอกเลขเครื่องยนต์";
    if (!form.color.trim()) newErrors.color = "กรุณากรอกสี";
    const costPrice = parseFloat(form.cost_price);
    if (!form.cost_price || isNaN(costPrice) || costPrice <= 0) {
      newErrors.cost_price = "กรุณากรอกราคาทุนที่ถูกต้อง";
    }
    const sellingPrice = parseFloat(form.selling_price);
    if (!form.selling_price || isNaN(sellingPrice) || sellingPrice <= 0) {
      newErrors.selling_price = "กรุณากรอกราคาขายที่ถูกต้อง";
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
      toastSuccess("เพิ่มรถเรียบร้อยแล้ว");
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "เพิ่มรถไม่สำเร็จ";
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
          <label className="block text-sm font-medium text-gray-700 mb-1">ยี่ห้อ</label>
          <input
            type="text"
            value={form.brand}
            onChange={(e) => set("brand", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
            placeholder="Yamaha"
          />
          <FieldError message={errors.brand} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            รุ่น <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.model}
            onChange={(e) => set("model", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
            placeholder="NMAX 155"
          />
          <FieldError message={errors.model} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ปี <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={form.year}
            onChange={(e) => set("year", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
            placeholder="2024"
            min={1900}
            max={2100}
          />
          <FieldError message={errors.year} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            สี <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.color}
            onChange={(e) => set("color", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
            placeholder="เช่น ดำ"
          />
          <FieldError message={errors.color} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          เลขตัวถัง <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.chassis_number}
          onChange={(e) => set("chassis_number", e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
          placeholder="SG5EJ-000001"
        />
        <FieldError message={errors.chassis_number} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          เลขเครื่องยนต์ <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.engine_number}
          onChange={(e) => set("engine_number", e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
          placeholder="G3C9E-000001"
        />
        <FieldError message={errors.engine_number} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ราคาทุน (บาท) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={form.cost_price}
            onChange={(e) => set("cost_price", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
            placeholder="70000"
            min={1}
            step={0.01}
          />
          <FieldError message={errors.cost_price} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ราคาขาย (บาท) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={form.selling_price}
            onChange={(e) => set("selling_price", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
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
          {submitting ? "กำลังเพิ่ม…" : "เพิ่มรถ"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          ยกเลิก
        </button>
      </div>
    </form>
  );
}

// ─── Add/Edit Addon Form ──────────────────────────────────────────────────────

interface AddonFormState {
  type: "part" | "accessory" | "service";
  sku: string;
  name: string;
  description: string;
  cost_price: string;
  price: string;
  stock_qty: string;
}

const INITIAL_ADDON_FORM = (typeLimit?: "part" | "accessory" | "service"): AddonFormState => ({
  type: typeLimit ?? "part",
  sku: "",
  name: "",
  description: "",
  cost_price: "",
  price: "",
  stock_qty: "",
});

interface AddonFormProps {
  addon?: Addon | null;
  typeLimit?: "part" | "accessory" | "service";
  onSuccess: () => void;
  onCancel: () => void;
}

function AddonForm({ addon, typeLimit, onSuccess, onCancel }: AddonFormProps) {
  const [form, setForm] = useState<AddonFormState>(() => {
    if (addon) {
      return {
        type: addon.type,
        sku: addon.sku ?? "",
        name: addon.name,
        description: addon.description ?? "",
        cost_price: String(addon.costPrice),
        price: String(addon.price),
        stock_qty: String(addon.stockQty),
      };
    }
    return INITIAL_ADDON_FORM(typeLimit);
  });

  const [errors, setErrors] = useState<Partial<AddonFormState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function set(field: keyof AddonFormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate(): boolean {
    const newErrors: Partial<AddonFormState> = {};
    if (!form.name.trim()) newErrors.name = "กรุณากรอกชื่อ";

    const price = parseFloat(form.price);
    if (!form.price || isNaN(price) || price < 0) {
      newErrors.price = "กรุณากรอกราคาขายที่ถูกต้อง";
    }

    if (form.type !== "service") {
      const costPrice = parseFloat(form.cost_price);
      if (form.cost_price && (isNaN(costPrice) || costPrice < 0)) {
        newErrors.cost_price = "กรุณากรอกราคาทุนที่ถูกต้อง";
      }

      const stockQty = parseInt(form.stock_qty);
      if (form.stock_qty && (isNaN(stockQty) || stockQty < 0)) {
        newErrors.stock_qty = "กรุณากรอกจำนวนสต็อกที่ถูกต้อง";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError(null);

    const body: any = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price: parseFloat(form.price),
      type: form.type,
    };

    if (form.type !== "service") {
      body.sku = form.sku.trim() || undefined;
      body.cost_price = form.cost_price ? parseFloat(form.cost_price) : 0;
      // In edit mode we do not pass stock_qty to prevent overwrite (it should use inline adjustments)
      if (!addon) {
        body.stock_qty = form.stock_qty ? parseInt(form.stock_qty) : 0;
      }
    } else {
      body.sku = null;
      body.cost_price = 0;
      body.stock_qty = 0;
    }

    try {
      if (addon) {
        await apiFetch(`/addons/${addon.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        toastSuccess("แก้ไขรายการสินค้าเรียบร้อยแล้ว");
      } else {
        await apiFetch("/addons", {
          method: "POST",
          body: JSON.stringify(body),
        });
        toastSuccess("เพิ่มรายการสินค้าเรียบร้อยแล้ว");
      }
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "บันทึกรายการไม่สำเร็จ";
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

      {!typeLimit && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ประเภท</label>
          <select
            value={form.type}
            onChange={(e) => set("type", e.target.value as any)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
          >
            <option value="part">อะไหล่</option>
            <option value="accessory">อุปกรณ์เสริม</option>
            <option value="service">รายการบริการ</option>
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ชื่อ <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
            placeholder={form.type === "service" ? "เช่น พ.ร.บ." : "เช่น หมวกกันน็อก รุ่น X"}
          />
          <FieldError message={errors.name} />
        </div>

        {form.type !== "service" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
            <input
              type="text"
              value={form.sku}
              onChange={(e) => set("sku", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
              placeholder="SKU-12345"
            />
            <FieldError message={errors.sku} />
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด</label>
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
          placeholder="กรอกรายละเอียดสินค้า…"
          rows={3}
        />
        <FieldError message={errors.description} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {form.type !== "service" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ราคาทุน (บาท)</label>
            <input
              type="number"
              value={form.cost_price}
              onChange={(e) => set("cost_price", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
              placeholder="500"
              min={0}
              step={0.01}
            />
            <FieldError message={errors.cost_price} />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ราคาขาย (บาท) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={form.price}
            onChange={(e) => set("price", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
            placeholder="650"
            min={0}
            step={0.01}
          />
          <FieldError message={errors.price} />
        </div>

        {form.type !== "service" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนสต็อก</label>
            <input
              type="number"
              value={form.stock_qty}
              disabled={!!addon} // Don't allow changing stock qty via text edit in Edit mode; use adjustments
              onChange={(e) => set("stock_qty", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white disabled:bg-gray-100"
              placeholder="10"
              min={0}
            />
            <FieldError message={errors.stock_qty} />
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? "กำลังบันทึก…" : addon ? "บันทึกการแก้ไข" : "เพิ่มรายการ"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          ยกเลิก
        </button>
      </div>
    </form>
  );
}

// ─── Inventory Page ───────────────────────────────────────────────────────────

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<"motorcycles" | "addons" | "services">("motorcycles");

  // Motorcycles State
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [totalMotorcycles, setTotalMotorcycles] = useState(0);
  const [motoPage, setMotoPage] = useState(1);
  const [motoSearch, setMotoSearch] = useState("");
  const [motoStatusFilter, setMotoStatusFilter] = useState("in_stock");
  const [motoSortBy, setMotoSortBy] = useState("createdAt");
  const [motoSortOrder, setMotoSortOrder] = useState("desc");
  const [motoLoading, setMotoLoading] = useState(true);
  const [motoError, setMotoError] = useState<string | null>(null);
  const [showAddMotoModal, setShowAddMotoModal] = useState(false);

  // Addons & Services State
  const [addons, setAddons] = useState<Addon[]>([]);
  const [addonsLoading, setAddonsLoading] = useState(false);
  const [addonsSearch, setAddonsSearch] = useState("");
  const [addonsError, setAddonsError] = useState<string | null>(null);
  const [showAddAddonModal, setShowAddAddonModal] = useState(false);
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null);

  // Fetch Motorcycles
  const fetchMotorcycles = useCallback(
    async (currentPage: number, searchTerm: string, status: string, sortBy: string, sortOrder: string) => {
      setMotoLoading(true);
      setMotoError(null);
      try {
        const params = new URLSearchParams({
          page: String(currentPage),
          limit: String(PAGE_SIZE),
        });
        if (searchTerm) params.set("search", searchTerm);
        if (status) params.set("status", status);
        if (sortBy) params.set("sort_by", sortBy);
        if (sortOrder) params.set("sort_order", sortOrder);

        const res = await apiFetch<PaginatedResponse<Motorcycle>>(
          `/motorcycles?${params}`
        );
        setMotorcycles(res.data);
        setTotalMotorcycles(res.total);
      } catch (err) {
        setMotoError(
          err instanceof Error ? err.message : "โหลดข้อมูลรถไม่สำเร็จ"
        );
      } finally {
        setMotoLoading(false);
      }
    },
    []
  );

  // Fetch Addons
  const fetchAddons = useCallback(async (searchQuery?: string) => {
    setAddonsLoading(true);
    setAddonsError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      
      const res = await apiFetch<{ data: Addon[] }>(`/addons?${params}`);
      setAddons(res.data);
    } catch (err) {
      setAddonsError(
        err instanceof Error ? err.message : "โหลดข้อมูลสินค้าไม่สำเร็จ"
      );
    } finally {
      setAddonsLoading(false);
    }
  }, []);

  // Sync Motorcycles
  useEffect(() => {
    if (activeTab === "motorcycles") {
      fetchMotorcycles(motoPage, motoSearch, motoStatusFilter, motoSortBy, motoSortOrder);
    }
  }, [motoPage, motoSearch, motoStatusFilter, motoSortBy, motoSortOrder, activeTab, fetchMotorcycles]);

  // Sync Addons
  useEffect(() => {
    if (activeTab === "addons" || activeTab === "services") {
      fetchAddons(addonsSearch);
    }
  }, [addonsSearch, activeTab, fetchAddons]);

  // Handlers for Motorcycles
  function handleMotoSearch(value: string) {
    setMotoSearch(value);
    setMotoPage(1);
  }

  function handleMotoStatusFilter(value: string) {
    setMotoStatusFilter(value);
    setMotoPage(1);
  }

  function handleAddMotoSuccess() {
    setShowAddMotoModal(false);
    fetchMotorcycles(motoPage, motoSearch, motoStatusFilter, motoSortBy, motoSortOrder);
  }

  // Handlers for Addons
  async function handleQuickStockAdjust(addon: Addon, change: number) {
    const newQty = addon.stockQty + change;
    if (newQty < 0) return;
    try {
      await apiFetch(`/addons/${addon.id}`, {
        method: "PATCH",
        body: JSON.stringify({ stock_qty: newQty }),
      });
      toastSuccess(`อัปเดตสต็อกของ "${addon.name}" เรียบร้อยแล้ว`);
      fetchAddons(addonsSearch);
    } catch (err) {
      alertError(err instanceof Error ? err.message : "ปรับสต็อกไม่สำเร็จ");
    }
  }

  async function handleSetStock(addon: Addon) {
    const valueStr = prompt(`กรอกจำนวนสต็อกใหม่ของ ${addon.name}:`, String(addon.stockQty));
    if (valueStr === null) return;
    const value = parseInt(valueStr);
    if (isNaN(value) || value < 0) {
      alertError("กรุณากรอกจำนวนเต็มที่ไม่ติดลบ");
      return;
    }
    try {
      await apiFetch(`/addons/${addon.id}`, {
        method: "PATCH",
        body: JSON.stringify({ stock_qty: value }),
      });
      toastSuccess(`อัปเดตสต็อกของ "${addon.name}" เรียบร้อยแล้ว`);
      fetchAddons(addonsSearch);
    } catch (err) {
      alertError(err instanceof Error ? err.message : "อัปเดตสต็อกไม่สำเร็จ");
    }
  }

  function handleAddonSuccess() {
    setShowAddAddonModal(false);
    setEditingAddon(null);
    fetchAddons(addonsSearch);
  }

  const totalMotoPages = Math.max(1, Math.ceil(totalMotorcycles / PAGE_SIZE));

  // Filter addons based on active tab
  const filteredParts = addons.filter(
    (a) => a.type === "part" || a.type === "accessory"
  );
  const filteredServices = addons.filter((a) => a.type === "service");

  return (
    <DashboardLayout>
      <div className="px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">คลังสินค้า</h1>
            <p className="text-sm text-gray-500 mt-1">
              {activeTab === "motorcycles"
                ? `รถทั้งหมด ${totalMotorcycles} คัน`
                : activeTab === "addons"
                ? `อะไหล่/อุปกรณ์เสริม ${filteredParts.length} รายการ`
                : `รายการบริการ ${filteredServices.length} รายการ`}
            </p>
          </div>

          <div>
            {activeTab === "motorcycles" ? (
              <button
                onClick={() => setShowAddMotoModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
              >
                <span>+</span> เพิ่มรถ
              </button>
            ) : activeTab === "addons" ? (
              <button
                onClick={() => {
                  setEditingAddon(null);
                  setShowAddAddonModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
              >
                <span>+</span> เพิ่มอะไหล่/อุปกรณ์เสริม
              </button>
            ) : (
              <button
                onClick={() => {
                  setEditingAddon(null);
                  setShowAddAddonModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
              >
                <span>+</span> เพิ่มรายการบริการ
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab("motorcycles")}
            className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "motorcycles"
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            รถจักรยานยนต์
          </button>
          <button
            onClick={() => setActiveTab("addons")}
            className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "addons"
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            อะไหล่และอุปกรณ์เสริม
          </button>
          <button
            onClick={() => setActiveTab("services")}
            className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "services"
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            รายการบริการและของแถม
          </button>
        </div>

        {/* ─── TAB 1: Motorcycles ────────────────────────────────────────────── */}
        {activeTab === "motorcycles" && (
          <>
            {/* Filters & Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              {/* Status Sub-tabs (Pills) */}
              <div className="flex bg-gray-100 p-1 rounded-lg self-start">
                <button
                  onClick={() => handleMotoStatusFilter("in_stock")}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    motoStatusFilter === "in_stock"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {TH.motorcycleStatus.in_stock}
                </button>
                <button
                  onClick={() => handleMotoStatusFilter("reserved")}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    motoStatusFilter === "reserved"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {TH.motorcycleStatus.reserved}
                </button>
                <button
                  onClick={() => handleMotoStatusFilter("sold")}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    motoStatusFilter === "sold"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {TH.motorcycleStatus.sold}
                </button>
                <button
                  onClick={() => handleMotoStatusFilter("")}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    motoStatusFilter === ""
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  ทั้งหมด
                </button>
              </div>

              {/* Search & Sort */}
              <div className="flex flex-1 flex-col sm:flex-row gap-3 lg:justify-end w-full lg:w-auto">
                <input
                  type="text"
                  placeholder="ค้นหารุ่น เลขตัวถัง สี…"
                  value={motoSearch}
                  onChange={(e) => handleMotoSearch(e.target.value)}
                  className="flex-1 max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                />

                <select
                  value={`${motoSortBy}:${motoSortOrder}`}
                  onChange={(e) => {
                    const [by, order] = e.target.value.split(":");
                    setMotoSortBy(by);
                    setMotoSortOrder(order);
                    setMotoPage(1);
                  }}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                >
                  <option value="createdAt:desc">รับเข้าล่าสุด</option>
                  <option value="createdAt:asc">รับเข้าเก่าสุด (ตามวันที่รับ)</option>
                  <option value="model:asc">ชื่อรุ่น (ก-ฮ)</option>
                  <option value="sellingPrice:asc">ราคา: ต่ำไปสูง</option>
                  <option value="sellingPrice:desc">ราคา: สูงไปต่ำ</option>
                </select>
              </div>
            </div>

            {motoError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {motoError}
              </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-5 py-3 font-medium text-gray-500">รุ่น</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">ปี</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">สี</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">เลขตัวถัง</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">เลขเครื่องยนต์</th>
                      <th className="text-right px-5 py-3 font-medium text-gray-500">ราคาทุน</th>
                      <th className="text-right px-5 py-3 font-medium text-gray-500">ราคาขาย</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">สถานะ</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {motoLoading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i} className="border-b border-gray-50">
                          {Array.from({ length: 9 }).map((__, j) => (
                            <td key={j} className="px-5 py-3">
                              <div className="h-4 bg-gray-100 rounded animate-pulse" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : motorcycles.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-5 py-12 text-center text-sm text-gray-400"
                        >
                          ไม่พบข้อมูลรถ{" "}
                          <button
                            onClick={() => setShowAddMotoModal(true)}
                            className="text-primary-600 hover:underline"
                          >
                            เพิ่มรถใหม่?
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
                            {moto.chassisNumber || "-"}
                          </td>
                          <td className="px-5 py-3 text-gray-500 font-mono text-xs">
                            {moto.engineNumber || "-"}
                          </td>
                          <td className="px-5 py-3 text-right text-gray-900 font-medium">
                            {formatPrice(Number(moto.costPrice ?? 0))}
                          </td>
                          <td className="px-5 py-3 text-right text-gray-900 font-medium">
                            {formatPrice(Number(moto.sellingPrice ?? 0))}
                          </td>
                          <td className="px-5 py-3">
                            <StatusBadge status={moto.status} />
                          </td>
                          <td className="px-5 py-3 text-right">
                            <Link
                              href={`/inventory/${moto.id}`}
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
              {!motoLoading && totalMotoPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
                  <span className="text-xs text-gray-500">
                    หน้า {motoPage} จาก {totalMotoPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={motoPage <= 1}
                      onClick={() => setMotoPage((p) => p - 1)}
                      className="px-3 py-1.5 text-xs rounded-md border border-gray-300 text-gray-600 disabled:opacity-40 hover:bg-white transition-colors bg-white"
                    >
                      ก่อนหน้า
                    </button>
                    <button
                      disabled={motoPage >= totalMotoPages}
                      onClick={() => setMotoPage((p) => p + 1)}
                      className="px-3 py-1.5 text-xs rounded-md border border-gray-300 text-gray-600 disabled:opacity-40 hover:bg-white transition-colors bg-white"
                    >
                      ถัดไป
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ─── TAB 2: Parts & Accessories ────────────────────────────────────── */}
        {activeTab === "addons" && (
          <>
            {/* Search */}
            <div className="flex gap-3 mb-6">
              <input
                type="text"
                placeholder="ค้นหา SKU ชื่อ รายละเอียด…"
                value={addonsSearch}
                onChange={(e) => setAddonsSearch(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
              />
            </div>

            {addonsError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {addonsError}
              </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-5 py-3 font-medium text-gray-500">SKU</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">ชื่อ</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">ประเภท</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">รายละเอียด</th>
                      <th className="text-right px-5 py-3 font-medium text-gray-500">ราคาทุน</th>
                      <th className="text-right px-5 py-3 font-medium text-gray-500">ราคาขาย</th>
                      <th className="text-center px-5 py-3 font-medium text-gray-500" style={{ width: "180px" }}>จำนวนสต็อก</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {addonsLoading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i} className="border-b border-gray-50">
                          {Array.from({ length: 8 }).map((__, j) => (
                            <td key={j} className="px-5 py-3">
                              <div className="h-4 bg-gray-100 rounded animate-pulse" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : filteredParts.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-5 py-12 text-center text-sm text-gray-400"
                        >
                          ไม่พบอะไหล่หรืออุปกรณ์เสริม{" "}
                          <button
                            onClick={() => {
                              setEditingAddon(null);
                              setShowAddAddonModal(true);
                            }}
                            className="text-primary-600 hover:underline"
                          >
                            เพิ่มรายการใหม่?
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredParts.map((addon) => (
                        <tr
                          key={addon.id}
                          className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-5 py-3 text-gray-500 font-mono text-xs">
                            {addon.sku || "-"}
                          </td>
                          <td className="px-5 py-3 font-medium text-gray-900">
                            {addon.name}
                          </td>
                          <td className="px-5 py-3 text-gray-600 capitalize">
                            {ADDON_TYPE_TH[addon.type] ?? addon.type}
                          </td>
                          <td className="px-5 py-3 text-gray-500 max-w-xs truncate">
                            {addon.description || "-"}
                          </td>
                          <td className="px-5 py-3 text-right text-gray-900">
                            {formatPrice(addon.costPrice)}
                          </td>
                          <td className="px-5 py-3 text-right text-gray-900 font-medium">
                            {formatPrice(addon.price)}
                          </td>
                          <td className="px-5 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleQuickStockAdjust(addon, -1)}
                                disabled={addon.stockQty <= 0}
                                className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent text-xs"
                                title="ลดสต็อก 1 หน่วย"
                              >
                                -
                              </button>
                              <button
                                onClick={() => handleSetStock(addon)}
                                className="px-2 py-0.5 min-w-[32px] text-center font-semibold rounded bg-gray-100 hover:bg-gray-200 text-gray-900 text-xs"
                                title="คลิกเพื่อกำหนดจำนวนสต็อกเอง"
                              >
                                {addon.stockQty}
                              </button>
                              <button
                                onClick={() => handleQuickStockAdjust(addon, 1)}
                                className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50 text-xs"
                                title="เพิ่มสต็อก 1 หน่วย"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button
                              onClick={() => {
                                setEditingAddon(addon);
                                setShowAddAddonModal(true);
                              }}
                              className="text-primary-600 hover:text-primary-700 text-xs font-medium"
                            >
                              แก้ไข
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ─── TAB 3: Service Items ─────────────────────────────────────────── */}
        {activeTab === "services" && (
          <>
            {/* Search */}
            <div className="flex gap-3 mb-6">
              <input
                type="text"
                placeholder="ค้นหาชื่อ รายละเอียด…"
                value={addonsSearch}
                onChange={(e) => setAddonsSearch(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
              />
            </div>

            {addonsError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {addonsError}
              </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-5 py-3 font-medium text-gray-500">ชื่อ</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">รายละเอียด</th>
                      <th className="text-right px-5 py-3 font-medium text-gray-500">ราคาขาย</th>
                      <th className="text-center px-5 py-3 font-medium text-gray-500">สถานะ</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {addonsLoading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i} className="border-b border-gray-50">
                          {Array.from({ length: 5 }).map((__, j) => (
                            <td key={j} className="px-5 py-3">
                              <div className="h-4 bg-gray-100 rounded animate-pulse" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : filteredServices.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-12 text-center text-sm text-gray-400"
                        >
                          ไม่พบรายการบริการ{" "}
                          <button
                            onClick={() => {
                              setEditingAddon(null);
                              setShowAddAddonModal(true);
                            }}
                            className="text-primary-600 hover:underline"
                          >
                            เพิ่มรายการใหม่?
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredServices.map((addon) => (
                        <tr
                          key={addon.id}
                          className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-5 py-3 font-medium text-gray-900">
                            {addon.name}
                          </td>
                          <td className="px-5 py-3 text-gray-500 max-w-md truncate">
                            {addon.description || "-"}
                          </td>
                          <td className="px-5 py-3 text-right text-gray-900 font-medium">
                            {formatPrice(addon.price)}
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${addon.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                              {addon.active ? "ใช้งาน" : "ปิดใช้งาน"}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button
                              onClick={() => {
                                setEditingAddon(addon);
                                setShowAddAddonModal(true);
                              }}
                              className="text-primary-600 hover:text-primary-700 text-xs font-medium"
                            >
                              แก้ไข
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add Motorcycle Modal */}
      <FormModal
        open={showAddMotoModal}
        onClose={() => setShowAddMotoModal(false)}
        title="เพิ่มรถ"
        maxWidth="max-w-xl"
      >
        <AddMotorcycleForm
          onSuccess={handleAddMotoSuccess}
          onCancel={() => setShowAddMotoModal(false)}
        />
      </FormModal>

      {/* Add/Edit Addon Modal */}
      <FormModal
        open={showAddAddonModal}
        onClose={() => {
          setShowAddAddonModal(false);
          setEditingAddon(null);
        }}
        title={editingAddon ? "แก้ไขรายการสินค้า" : activeTab === "addons" ? "เพิ่มอะไหล่/อุปกรณ์เสริม" : "เพิ่มรายการบริการ"}
        maxWidth="max-w-xl"
      >
        <AddonForm
          addon={editingAddon}
          typeLimit={editingAddon ? undefined : activeTab === "addons" ? undefined : "service"}
          onSuccess={handleAddonSuccess}
          onCancel={() => {
            setShowAddAddonModal(false);
            setEditingAddon(null);
          }}
        />
      </FormModal>
    </DashboardLayout>
  );
}
