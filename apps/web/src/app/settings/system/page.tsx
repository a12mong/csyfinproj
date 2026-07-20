"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PermissionGuard from "@/components/PermissionGuard";
import { apiFetch } from "@/lib/api";
import { toastSuccess, alertError } from "@/lib/swal";

interface SettingRow {
  key: string;
  label: string;
  description: string;
  value: string;
}

// Keys managed on this page (LINE OA is on the LINE settings page)
const SYSTEM_KEYS = [
  "date_format",
  "decimal_places",
  "audit_retention_days",
  "customer_erasure_lock_years",
];

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<SettingRow[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ data: SettingRow[] }>("/settings")
      .then((res) => {
        const rows = res.data.filter((s) => SYSTEM_KEYS.includes(s.key));
        setSettings(rows);
        setValues(Object.fromEntries(rows.map((r) => [r.key, r.value])));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function save(key: string) {
    setSavingKey(key);
    try {
      await apiFetch(`/settings/${key}`, {
        method: "PUT",
        body: JSON.stringify({ value: values[key] ?? "" }),
      });
      toastSuccess("บันทึกแล้ว");
    } catch (err) {
      alertError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSavingKey(null);
    }
  }

  function inputFor(row: SettingRow) {
    const v = values[row.key] ?? "";
    const set = (val: string) => setValues((prev) => ({ ...prev, [row.key]: val }));

    if (row.key === "date_format") {
      return (
        <select
          value={v || "buddhist"}
          onChange={(e) => set(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-primary-500 focus:outline-none"
        >
          <option value="buddhist">พ.ศ. (เช่น 20 ก.ค. 2569)</option>
          <option value="gregorian">ค.ศ. (เช่น 20 ก.ค. 2026)</option>
        </select>
      );
    }
    if (row.key === "decimal_places") {
      return (
        <select
          value={v || "2"}
          onChange={(e) => set(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-primary-500 focus:outline-none"
        >
          <option value="0">0 ตำแหน่ง (฿1,234)</option>
          <option value="2">2 ตำแหน่ง (฿1,234.56)</option>
        </select>
      );
    }
    return (
      <input
        type="number"
        min={1}
        value={v}
        placeholder={row.key === "audit_retention_days" ? "365" : "5"}
        onChange={(e) => set(e.target.value)}
        className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
      />
    );
  }

  return (
    <PermissionGuard page="settings">
      <DashboardLayout>
        <div className="px-8 py-8 max-w-3xl">
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <a href="/settings" className="hover:text-primary-600 transition-colors">
                ตั้งค่า
              </a>
              <span>/</span>
              <span className="text-gray-700 font-medium">ระบบ</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">ตั้งค่าระบบ</h1>
            <p className="text-sm text-gray-500 mt-1">
              รูปแบบการแสดงผล และนโยบายการเก็บข้อมูล (PDPA)
            </p>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-400">
              กำลังโหลด…
            </div>
          ) : (
            <div className="space-y-4">
              {settings.map((row) => (
                <div
                  key={row.key}
                  className="bg-white rounded-xl border border-gray-200 p-5 flex flex-wrap items-center gap-4"
                >
                  <div className="flex-1 min-w-[240px]">
                    <p className="text-sm font-semibold text-gray-900">{row.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{row.description}</p>
                  </div>
                  {inputFor(row)}
                  <button
                    onClick={() => save(row.key)}
                    disabled={savingKey === row.key}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
                  >
                    {savingKey === row.key ? "กำลังบันทึก…" : "บันทึก"}
                  </button>
                </div>
              ))}
              <p className="text-[11px] text-gray-400">
                รูปแบบวันที่/ทศนิยมมีผลทันทีหลังรีเฟรชหน้าจอ · audit log
                เก่ากว่ากำหนดจะถูกลบอัตโนมัติวันละครั้ง
              </p>
            </div>
          )}
        </div>
      </DashboardLayout>
    </PermissionGuard>
  );
}
