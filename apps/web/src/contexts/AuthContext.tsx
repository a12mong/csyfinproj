"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { User } from "@csyfinproj/shared";
import { getToken, setToken, removeToken, getUser, setUser, removeUser } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

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

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  permissions: PermissionsMap | null;
}

interface AuthContextValue extends AuthState {
  login: (token: string, user: User) => void;
  logout: () => void;
  hasPermission: (page: PermissionPage, action: keyof PagePermission) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function loadPermissions(): Promise<PermissionsMap | null> {
  try {
    const res = await apiFetch<{ data: Array<{ page: PermissionPage } & PagePermission> }>(
      "/me"
    );
    const map = {} as PermissionsMap;
    for (const entry of res.data) {
      map[entry.page] = {
        canView: entry.canView,
        canCreate: entry.canCreate,
        canEdit: entry.canEdit,
        canDelete: entry.canDelete,
      };
    }
    return map;
  } catch {
    return null;
  }
}

// ─── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    permissions: null,
  });

  // Restore session from localStorage and fetch permissions
  useEffect(() => {
    const token = getToken();
    const user = getUser();
    if (token && user) {
      loadPermissions().then((permissions) => {
        setState({ user, token, isLoading: false, permissions });
      });
    } else {
      setState({ user: null, token: null, isLoading: false, permissions: null });
    }
  }, []);

  function login(token: string, user: User) {
    setToken(token);
    setUser(user);
    // Keep isLoading true while fetching permissions to avoid permission flash
    setState({ user, token, isLoading: true, permissions: null });
    loadPermissions().then((permissions) => {
      setState({ user, token, isLoading: false, permissions });
    });
  }

  function logout() {
    removeToken();
    removeUser();
    setState({ user: null, token: null, isLoading: false, permissions: null });
  }

  function hasPermission(page: PermissionPage, action: keyof PagePermission): boolean {
    if (!state.user) return false;
    if (state.user.role === "admin") return true;
    if (!state.permissions) return false;
    return state.permissions[page]?.[action] ?? false;
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
