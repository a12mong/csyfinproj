"use client";

import { useEffect, useState, useCallback, FormEvent } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import FormModal from "@/components/FormModal";
import PermissionGuard from "@/components/PermissionGuard";
import { useAuth } from "@/contexts/AuthContext";
import type { PermissionPage, PagePermission } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { toastSuccess, alertError, confirm } from "@/lib/swal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserDto {
  id: string;
  email: string;
  name: string;
  role: "admin" | "staff" | "viewer";
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ListResponse {
  data: UserDto[];
  total: number;
  page: number;
  limit: number;
}

interface PermissionEntry {
  page: PermissionPage;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const ROLE_OPTIONS = [
  { value: "", label: "All roles" },
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
  { value: "viewer", label: "Viewer" },
];

const ACTIVE_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

const ROLE_STYLES: Record<string, string> = {
  admin: "bg-purple-50 text-purple-700",
  staff: "bg-blue-50 text-blue-700",
  viewer: "bg-gray-100 text-gray-600",
};

const PERMISSION_PAGES: PermissionPage[] = [
  "dashboard",
  "inventory",
  "receiving",
  "sales",
  "customers",
  "finance",
  "payments",
  "settings",
];

const PAGE_LABELS: Record<PermissionPage, string> = {
  dashboard: "Dashboard",
  inventory: "Inventory",
  receiving: "Receiving",
  sales: "Sales",
  customers: "Customers",
  finance: "Finance",
  payments: "Payments",
  settings: "Settings",
};

const PERMISSION_ACTIONS: { key: keyof PagePermission; label: string }[] = [
  { key: "canView", label: "View" },
  { key: "canCreate", label: "Create" },
  { key: "canEdit", label: "Edit" },
  { key: "canDelete", label: "Delete" },
];

// ─── Create User Form ─────────────────────────────────────────────────────────

interface CreateUserFormProps {
  onSuccess: (user: UserDto) => void;
  onCancel: () => void;
}

function CreateUserForm({ onSuccess, onCancel }: CreateUserFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "staff" | "viewer">("staff");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch<{ data: UserDto }>("/users", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, role }),
      });
      toastSuccess("User created successfully");
      onSuccess(res.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create user";
      setError(msg);
      alertError(msg);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          required
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Password <span className="text-red-500">*</span>
        </label>
        <input
          required
          type="password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min. 8 characters"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Role <span className="text-red-500">*</span>
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as typeof role)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
          <option value="viewer">Viewer</option>
        </select>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 px-5 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? "Creating…" : "Create User"}
        </button>
      </div>
    </form>
  );
}

// ─── Edit User Form ───────────────────────────────────────────────────────────

interface EditUserFormProps {
  user: UserDto;
  onSuccess: (user: UserDto) => void;
  onCancel: () => void;
}

function EditUserForm({ user, onSuccess, onCancel }: EditUserFormProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "permissions">("profile");

  // Profile state
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<"admin" | "staff" | "viewer">(user.role);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Permissions state
  const [permissions, setPermissions] = useState<PermissionEntry[]>([]);
  const [permsLoading, setPermsLoading] = useState(false);
  const [permsSubmitting, setPermsSubmitting] = useState(false);
  const [permsError, setPermsError] = useState<string | null>(null);

  // Load permissions when permissions tab is opened
  useEffect(() => {
    if (activeTab !== "permissions") return;
    setPermsLoading(true);
    setPermsError(null);
    apiFetch<{ data: PermissionEntry[] }>(`/users/${user.id}/permissions`)
      .then((res) => setPermissions(res.data))
      .catch((err) => setPermsError(err instanceof Error ? err.message : "Failed to load permissions"))
      .finally(() => setPermsLoading(false));
  }, [activeTab, user.id]);

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileSubmitting(true);
    try {
      const res = await apiFetch<{ data: UserDto }>(`/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim(), email: email.trim(), role }),
      });
      toastSuccess("User updated successfully");
      onSuccess(res.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update user";
      setProfileError(msg);
      alertError(msg);
      setProfileSubmitting(false);
    }
  }

  function togglePermission(page: PermissionPage, action: keyof PagePermission) {
    setPermissions((prev) =>
      prev.map((entry) =>
        entry.page === page ? { ...entry, [action]: !entry[action] } : entry
      )
    );
  }

  async function handlePermissionsSubmit(e: FormEvent) {
    e.preventDefault();
    setPermsError(null);
    setPermsSubmitting(true);
    try {
      await apiFetch(`/users/${user.id}/permissions`, {
        method: "PUT",
        body: JSON.stringify({ permissions }),
      });
      toastSuccess("Permissions updated successfully");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update permissions";
      setPermsError(msg);
      alertError(msg);
    } finally {
      setPermsSubmitting(false);
    }
  }

  const isAdmin = user.role === "admin";

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        {(["profile", "permissions"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-primary-600 text-primary-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>

          {profileError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {profileError}
            </div>
          )}

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={profileSubmitting}
              className="flex-1 px-5 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {profileSubmitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      )}

      {/* Permissions Tab */}
      {activeTab === "permissions" && (
        <form onSubmit={handlePermissionsSubmit}>
          {isAdmin && (
            <div className="mb-4 rounded-md border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-700">
              Admin users have full access to all pages. Permissions cannot be customised.
            </div>
          )}

          {permsLoading ? (
            <div className="space-y-2 mb-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : permsError ? (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {permsError}
            </div>
          ) : (
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 pr-4 font-medium text-gray-600 w-32">Page</th>
                    {PERMISSION_ACTIONS.map((a) => (
                      <th key={a.key} className="text-center py-2 px-3 font-medium text-gray-600">
                        {a.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERMISSION_PAGES.map((page) => {
                    const entry = permissions.find((p) => p.page === page);
                    return (
                      <tr key={page} className="border-b border-gray-50">
                        <td className="py-2 pr-4 text-gray-700 capitalize">
                          {PAGE_LABELS[page]}
                        </td>
                        {PERMISSION_ACTIONS.map(({ key }) => {
                          const checked = isAdmin ? true : (entry?.[key] ?? false);
                          return (
                            <td key={key} className="text-center py-2 px-3">
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={isAdmin || !entry}
                                onChange={() => togglePermission(page, key)}
                                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {permsError && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {permsError}
            </div>
          )}

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={permsSubmitting || isAdmin || permsLoading}
              className="flex-1 px-5 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {permsSubmitting ? "Saving…" : "Save Permissions"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ─── Users Page ───────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { user: currentUser, isLoading: authLoading } = useAuth();

  const [users, setUsers] = useState<UserDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDto | null>(null);

  const fetchUsers = useCallback(
    async (
      currentPage: number,
      searchVal: string,
      role: string,
      active: string
    ) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: String(currentPage), limit: String(PAGE_SIZE) });
        if (searchVal) params.set("search", searchVal);
        if (role) params.set("role", role);
        if (active) params.set("active", active);
        const res = await apiFetch<ListResponse>(`/users?${params}`);
        setUsers(res.data);
        setTotal(res.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load users");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (authLoading || !currentUser) return;
    fetchUsers(page, search, roleFilter, activeFilter);
  }, [page, search, roleFilter, activeFilter, fetchUsers, authLoading, currentUser]);

  async function handleDeactivate(u: UserDto) {
    const ok = await confirm({
      title: `Deactivate ${u.name}?`,
      text: "This user will no longer be able to sign in.",
      confirmText: "Deactivate",
      cancelText: "Cancel",
      icon: "warning",
    });
    if (!ok) return;
    try {
      await apiFetch(`/users/${u.id}`, { method: "DELETE" });
      toastSuccess(`${u.name} has been deactivated`);
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, active: false } : x))
      );
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Failed to deactivate user");
    }
  }

  async function handleReactivate(u: UserDto) {
    const ok = await confirm({
      title: `Reactivate ${u.name}?`,
      text: "This user will be able to sign in again.",
      confirmText: "Reactivate",
      cancelText: "Cancel",
      icon: "question",
    });
    if (!ok) return;
    try {
      await apiFetch(`/users/${u.id}/reactivate`, { method: "PATCH" });
      toastSuccess(`${u.name} has been reactivated`);
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, active: true } : x))
      );
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Failed to reactivate user");
    }
  }

  function handleCreateSuccess(newUser: UserDto) {
    setShowCreateModal(false);
    setUsers((prev) => [newUser, ...prev]);
    setTotal((t) => t + 1);
  }

  function handleEditSuccess(updated: UserDto) {
    setEditingUser(null);
    setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <PermissionGuard page="settings">
      <DashboardLayout>
        <div className="px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <a href="/settings" className="hover:text-primary-600 transition-colors">
                  Settings
                </a>
                <span>/</span>
                <span className="text-gray-700 font-medium">Users</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
              <p className="text-sm text-gray-500 mt-1">
                {total} user{total !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              <span>+</span> New User
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 w-60"
            />
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {ACTIVE_OPTIONS.map((opt) => (
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
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Name</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Email</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Role</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Created</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        {Array.from({ length: 6 }).map((__, j) => (
                          <td key={j} className="px-5 py-3">
                            <div className="h-4 bg-gray-100 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : users.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-12 text-center text-sm text-gray-400"
                      >
                        No users found.{" "}
                        <button
                          onClick={() => setShowCreateModal(true)}
                          className="text-primary-600 hover:underline"
                        >
                          Create one?
                        </button>
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr
                        key={u.id}
                        className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-5 py-3 font-medium text-gray-900">
                          {u.name}
                          {currentUser && u.id === currentUser.id && (
                            <span className="ml-2 text-xs text-gray-400">(you)</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-gray-600">{u.email}</td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                              ROLE_STYLES[u.role] ?? "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                u.active ? "bg-green-500" : "bg-gray-400"
                              }`}
                            />
                            <span className={u.active ? "text-green-700" : "text-gray-500"}>
                              {u.active ? "Active" : "Inactive"}
                            </span>
                          </span>
                        </td>
                        <td className="px-5 py-3 text-gray-500 text-xs">
                          {new Date(u.createdAt).toLocaleDateString("th-TH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => setEditingUser(u)}
                              className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
                            >
                              Edit
                            </button>
                            {currentUser && u.id !== currentUser.id && (
                              <>
                                {u.active ? (
                                  <button
                                    onClick={() => handleDeactivate(u)}
                                    className="text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
                                  >
                                    Deactivate
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleReactivate(u)}
                                    className="text-xs font-medium text-green-600 hover:text-green-700 transition-colors"
                                  >
                                    Reactivate
                                  </button>
                                )}
                              </>
                            )}
                          </div>
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

        {/* Create User Modal */}
        <FormModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="New User"
        >
          <CreateUserForm
            onSuccess={handleCreateSuccess}
            onCancel={() => setShowCreateModal(false)}
          />
        </FormModal>

        {/* Edit User Modal */}
        <FormModal
          open={!!editingUser}
          onClose={() => setEditingUser(null)}
          title="Edit User"
        >
          {editingUser && (
            <EditUserForm
              user={editingUser}
              onSuccess={handleEditSuccess}
              onCancel={() => setEditingUser(null)}
            />
          )}
        </FormModal>
      </DashboardLayout>
    </PermissionGuard>
  );
}
