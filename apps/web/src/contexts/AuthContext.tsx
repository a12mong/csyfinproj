"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { User } from "@csyfinproj/shared";
import { getUser, setUser, removeUser } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { setFormatConfig } from "@/lib/format";

// Load display-format settings (พ.ศ./ค.ศ., ทศนิยม) once per session
function loadFormatSettings() {
  apiFetch<{ data: Array<{ key: string; value: string }> }>("/settings")
    .then((res) => {
      const get = (k: string) => res.data.find((s) => s.key === k)?.value;
      const dateFormat = get("date_format");
      const decimals = parseInt(get("decimal_places") ?? "");
      setFormatConfig({
        ...(dateFormat === "gregorian" || dateFormat === "buddhist"
          ? { dateFormat }
          : {}),
        ...(Number.isFinite(decimals) ? { decimalPlaces: decimals } : {}),
      });
    })
    .catch(() => {});
}

// ─── Permission types ──────────────────────────────────────────────────────────

export type PermissionPage =
  | "dashboard"
  | "inventory"
  | "receiving"
  | "sales"
  | "customers"
  | "contracts"
  | "finance"
  | "payments"
  | "settings";

export interface PagePermission {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export type PermissionsMap = Record<PermissionPage, PagePermission>;

// ─── Auth state ────────────────────────────────────────────────────────────────

export type ActionsMap = Record<string, boolean>;

interface AuthState {
  user: User | null;
  isLoading: boolean;
  permissions: PermissionsMap | null;
  actions: ActionsMap | null;
}

interface AuthContextValue extends AuthState {
  login: (user: User) => void;
  logout: () => void;
  hasPermission: (page: PermissionPage, action: keyof PagePermission) => boolean;
  hasAction: (page: PermissionPage, action: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Helpers ───────────────────────────────────────────────────────────────────

interface MeResponse {
  data: {
    role: string;
    permissions: Array<{ page: PermissionPage } & PagePermission>;
    actions: ActionsMap;
  };
}

async function loadPermissions(): Promise<{
  permissions: PermissionsMap;
  actions: ActionsMap;
} | null> {
  try {
    const res = await apiFetch<MeResponse>("/me");
    const map = {} as PermissionsMap;
    for (const entry of res.data.permissions) {
      map[entry.page] = {
        canView: entry.canView,
        canCreate: entry.canCreate,
        canEdit: entry.canEdit,
        canDelete: entry.canDelete,
      };
    }
    return { permissions: map, actions: res.data.actions ?? {} };
  } catch {
    return null;
  }
}

// ─── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    permissions: null,
    actions: null,
  });

  // Restore session: user object from localStorage, validate via cookie-based /me call
  useEffect(() => {
    const user = getUser();
    if (user) {
      loadFormatSettings();
      loadPermissions().then((result) => {
        if (result !== null) {
          setState({ user, isLoading: false, ...result });
        } else {
          // Cookie expired or invalid — clear stored user
          removeUser();
          setState({ user: null, isLoading: false, permissions: null, actions: null });
        }
      });
    } else {
      setState({ user: null, isLoading: false, permissions: null, actions: null });
    }
  }, []);

  function login(user: User) {
    setUser(user);
    loadFormatSettings();
    // Keep isLoading true while fetching permissions to avoid permission flash
    setState({ user, isLoading: true, permissions: null, actions: null });
    loadPermissions().then((result) => {
      setState({ user, isLoading: false, permissions: null, actions: null, ...result });
    });
  }

  function logout() {
    // Clear the HttpOnly cookie server-side
    apiFetch("/auth/logout", { method: "POST" }).catch(() => {});
    removeUser();
    setState({ user: null, isLoading: false, permissions: null, actions: null });
  }

  function hasPermission(page: PermissionPage, action: keyof PagePermission): boolean {
    if (!state.user) return false;
    if (state.user.role === "admin") return true;
    if (!state.permissions) return false;
    return state.permissions[page]?.[action] ?? false;
  }

  function hasAction(page: PermissionPage, action: string): boolean {
    if (!state.user) return false;
    if (state.user.role === "admin") return true;
    if (!state.actions) return false;
    return state.actions[`${page}.${action}`] ?? false;
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout, hasPermission, hasAction }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
