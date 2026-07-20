"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PermissionGuard from "@/components/PermissionGuard";
import { apiFetch } from "@/lib/api";
import { confirm, toastSuccess, alertError } from "@/lib/swal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Role {
  id: string;
  name: string;
  parentId: string | null;
  isSystem: boolean;
  _count: { users: number; children: number };
}

interface PageMeta {
  page: string;
  actions: string[];
}

const PAGE_LABELS: Record<string, string> = {
  dashboard: "แดชบอร์ด",
  inventory: "คลังสินค้า",
  receiving: "รับสินค้า",
  sales: "การขาย",
  customers: "ลูกค้า",
  contracts: "สัญญา",
  finance: "การเงิน",
  payments: "รับชำระ",
  settings: "ตั้งค่า",
};

const ACTION_LABELS: Record<string, string> = {
  view: "ดู",
  edit: "แก้ไข",
  view_cost_price: "เห็นราคาทุน",
  view_selling_price: "เห็นราคาขาย",
  view_pii: "เห็นข้อมูลส่วนบุคคลเต็ม",
  send_reminder: "ส่งแจ้งเตือน",
  approve_payment: "อนุมัติ/ปฏิเสธการชำระ",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RolesSettingsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [meta, setMeta] = useState<PageMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [matrix, setMatrix] = useState<Record<string, boolean>>({});
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, metaRes] = await Promise.all([
        apiFetch<{ data: Role[] }>("/roles"),
        apiFetch<{ data: { pages: PageMeta[] } }>("/roles/meta"),
      ]);
      setRoles(rolesRes.data);
      setMeta(metaRes.data.pages);
    } catch (err) {
      alertError(err instanceof Error ? err.message : "โหลดข้อมูล role ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  async function openRole(role: Role) {
    setSelectedRole(role);
    setMatrix({});
    if (role.isSystem) return;
    setMatrixLoading(true);
    try {
      const res = await apiFetch<{ data: Record<string, boolean> }>(
        `/roles/${role.id}/permissions`
      );
      setMatrix(res.data);
    } catch (err) {
      alertError(err instanceof Error ? err.message : "โหลดสิทธิ์ไม่สำเร็จ");
    } finally {
      setMatrixLoading(false);
    }
  }

  async function handleAddRole(parent: Role | null) {
    const name = window.prompt(
      parent ? `ชื่อ sub-role ใหม่ (ใต้ ${parent.name}):` : "ชื่อ role ใหม่:"
    );
    if (!name || !name.trim()) return;
    try {
      await apiFetch("/roles", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), parent_id: parent?.id ?? null }),
      });
      toastSuccess(`สร้าง role "${name.trim()}" แล้ว`);
      fetchRoles();
    } catch (err) {
      alertError(err instanceof Error ? err.message : "สร้าง role ไม่สำเร็จ");
    }
  }

  async function handleRename(role: Role) {
    const name = window.prompt("ชื่อใหม่:", role.name);
    if (!name || !name.trim() || name.trim() === role.name) return;
    try {
      await apiFetch(`/roles/${role.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim() }),
      });
      toastSuccess("เปลี่ยนชื่อแล้ว");
      fetchRoles();
    } catch (err) {
      alertError(err instanceof Error ? err.message : "เปลี่ยนชื่อไม่สำเร็จ");
    }
  }

  async function handleDelete(role: Role) {
    const ok = await confirm({
      title: `ลบ role "${role.name}"?`,
      text: "ลบได้เฉพาะ role ที่ไม่มีผู้ใช้และไม่มี sub-role",
      confirmText: "ลบ",
      cancelText: "ยกเลิก",
      icon: "warning",
    });
    if (!ok) return;
    try {
      await apiFetch(`/roles/${role.id}`, { method: "DELETE" });
      toastSuccess("ลบ role แล้ว");
      if (selectedRole?.id === role.id) setSelectedRole(null);
      fetchRoles();
    } catch (err) {
      alertError(err instanceof Error ? err.message : "ลบไม่สำเร็จ");
    }
  }

  async function handleSaveMatrix() {
    if (!selectedRole) return;
    setSaving(true);
    try {
      const entries = meta.flatMap((pm) =>
        pm.actions.map((action) => ({
          page: pm.page,
          action,
          allow: matrix[`${pm.page}.${action}`] ?? false,
        }))
      );
      await apiFetch(`/roles/${selectedRole.id}/permissions`, {
        method: "PUT",
        body: JSON.stringify({ entries }),
      });
      toastSuccess(`บันทึกสิทธิ์ของ "${selectedRole.name}" แล้ว`);
    } catch (err) {
      alertError(err instanceof Error ? err.message : "บันทึกสิทธิ์ไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  // Build tree ordering: roots first, then children indented
  function treeRows(): Array<{ role: Role; depth: number }> {
    const byParent = new Map<string | null, Role[]>();
    for (const r of roles) {
      const key = r.parentId ?? null;
      byParent.set(key, [...(byParent.get(key) ?? []), r]);
    }
    const rows: Array<{ role: Role; depth: number }> = [];
    function walk(parentId: string | null, depth: number) {
      for (const r of byParent.get(parentId) ?? []) {
        rows.push({ role: r, depth });
        walk(r.id, depth + 1);
      }
    }
    walk(null, 0);
    return rows;
  }

  const specialActions = new Set([
    "view_cost_price",
    "view_selling_price",
    "view_pii",
    "send_reminder",
    "approve_payment",
  ]);

  return (
    <PermissionGuard page="settings">
      <DashboardLayout>
        <div className="px-8 py-8">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <a href="/settings" className="hover:text-primary-600 transition-colors">
                  ตั้งค่า
                </a>
                <span>/</span>
                <span className="text-gray-700 font-medium">Role และสิทธิ์</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Role และสิทธิ์การใช้งาน</h1>
              <p className="text-sm text-gray-500 mt-1">
                สร้าง role / sub-role (สืบทอดสิทธิ์จาก role แม่ ลึกสุด 3 ชั้น)
                และกำหนดสิทธิ์รายหน้าจอ
              </p>
            </div>
            <button
              onClick={() => handleAddRole(null)}
              className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              + เพิ่ม Role
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Role tree */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden self-start">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <h2 className="text-sm font-semibold text-gray-900">โครงสร้าง Role</h2>
              </div>
              {loading ? (
                <div className="px-5 py-6 text-sm text-gray-400">กำลังโหลด…</div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {treeRows().map(({ role, depth }) => (
                    <li
                      key={role.id}
                      className={`px-4 py-2.5 flex items-center gap-2 cursor-pointer hover:bg-gray-50 ${
                        selectedRole?.id === role.id ? "bg-primary-50" : ""
                      }`}
                      style={{ paddingLeft: `${16 + depth * 22}px` }}
                      onClick={() => openRole(role)}
                    >
                      <span className="text-gray-300 text-xs">{depth > 0 ? "└" : ""}</span>
                      <span className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-900">{role.name}</span>
                        {role.isSystem && (
                          <span className="ml-2 inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-900 text-white">
                            ระบบ
                          </span>
                        )}
                        <span className="block text-[11px] text-gray-400">
                          ผู้ใช้ {role._count.users} คน
                          {role._count.children > 0 ? ` · sub-role ${role._count.children}` : ""}
                        </span>
                      </span>
                      <span className="flex gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {depth < 2 && (
                          <button
                            onClick={() => handleAddRole(role)}
                            title="เพิ่ม sub-role"
                            className="text-xs text-primary-600 hover:underline"
                          >
                            +sub
                          </button>
                        )}
                        {!role.isSystem && (
                          <>
                            <button
                              onClick={() => handleRename(role)}
                              className="text-xs text-gray-500 hover:underline"
                            >
                              แก้ชื่อ
                            </button>
                            <button
                              onClick={() => handleDelete(role)}
                              className="text-xs text-red-500 hover:underline"
                            >
                              ลบ
                            </button>
                          </>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Permission matrix */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden self-start">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">
                  {selectedRole ? `สิทธิ์ของ "${selectedRole.name}"` : "เลือก role เพื่อกำหนดสิทธิ์"}
                </h2>
                {selectedRole && !selectedRole.isSystem && (
                  <button
                    onClick={handleSaveMatrix}
                    disabled={saving || matrixLoading}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? "กำลังบันทึก…" : "บันทึกสิทธิ์"}
                  </button>
                )}
              </div>

              {!selectedRole ? (
                <div className="px-5 py-12 text-center text-sm text-gray-400">
                  คลิก role จากรายการด้านซ้าย
                </div>
              ) : selectedRole.isSystem ? (
                <div className="px-5 py-12 text-center text-sm text-gray-500">
                  🔒 Role ระบบ (Admin) มีสิทธิ์ทุกอย่างเสมอ แก้ไขไม่ได้
                </div>
              ) : matrixLoading ? (
                <div className="px-5 py-12 text-center text-sm text-gray-400">กำลังโหลดสิทธิ์…</div>
              ) : (
                <div className="p-5 space-y-4">
                  <p className="text-[11px] text-gray-400">
                    ค่าเริ่มต้นของ sub-role สืบทอดจาก role แม่ — เมื่อบันทึกแล้วจะเป็นสิทธิ์ของ
                    role นี้เอง
                  </p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-400">
                        <th className="text-left py-2 font-medium">หน้าจอ</th>
                        <th className="text-center py-2 font-medium w-16">ดู</th>
                        <th className="text-center py-2 font-medium w-16">แก้ไข</th>
                        <th className="text-left py-2 font-medium">สิทธิ์พิเศษ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {meta.map((pm) => (
                        <tr key={pm.page}>
                          <td className="py-2.5 font-medium text-gray-800">
                            {PAGE_LABELS[pm.page] ?? pm.page}
                          </td>
                          {["view", "edit"].map((action) => (
                            <td key={action} className="py-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={matrix[`${pm.page}.${action}`] ?? false}
                                onChange={(e) =>
                                  setMatrix((prev) => ({
                                    ...prev,
                                    [`${pm.page}.${action}`]: e.target.checked,
                                  }))
                                }
                                className="rounded border-gray-300"
                              />
                            </td>
                          ))}
                          <td className="py-2.5">
                            <div className="flex flex-wrap gap-3">
                              {pm.actions
                                .filter((a) => specialActions.has(a))
                                .map((action) => (
                                  <label
                                    key={action}
                                    className="inline-flex items-center gap-1.5 text-xs text-gray-600"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={matrix[`${pm.page}.${action}`] ?? false}
                                      onChange={(e) =>
                                        setMatrix((prev) => ({
                                          ...prev,
                                          [`${pm.page}.${action}`]: e.target.checked,
                                        }))
                                      }
                                      className="rounded border-gray-300"
                                    />
                                    {ACTION_LABELS[action] ?? action}
                                  </label>
                                ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </PermissionGuard>
  );
}
