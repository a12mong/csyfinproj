"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ProtectedRoute from "./ProtectedRoute";
import { useAuth, PermissionPage } from "@/contexts/AuthContext";

// Cache the runtime env for the lifetime of the page load — it never changes
let cachedEnv: string | null = null;

function useRuntimeEnv(): string | null {
  const [env, setEnv] = useState<string | null>(cachedEnv);
  useEffect(() => {
    if (cachedEnv) return;
    fetch("/runtime-env")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { env?: string } | null) => {
        if (data?.env) {
          cachedEnv = data.env;
          setEnv(data.env);
        }
      })
      .catch(() => {});
  }, []);
  return env;
}

interface NavItem {
  href: string;
  label: string;
  exact: boolean;
  page: PermissionPage;
}

const navItems: NavItem[] = [
  { href: "/", label: "แดชบอร์ด", exact: true, page: "dashboard" },
  { href: "/inventory", label: "คลังสินค้า", exact: false, page: "inventory" },
  { href: "/receiving", label: "รับสินค้า", exact: false, page: "receiving" },
  { href: "/sales", label: "การขาย", exact: false, page: "sales" },
  { href: "/customers", label: "ลูกค้า", exact: false, page: "customers" },
  { href: "/contracts", label: "สัญญา", exact: false, page: "contracts" },
  { href: "/finance", label: "การเงิน", exact: false, page: "finance" },
  { href: "/payments", label: "รับชำระ", exact: false, page: "payments" },
];

const adminNavItems: NavItem[] = [
  { href: "/settings", label: "ตั้งค่า", exact: false, page: "settings" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, hasPermission } = useAuth();
  const runtimeEnv = useRuntimeEnv();
  const isDevEnv = runtimeEnv === "dev";

  function handleLogout() {
    logout();
    router.push("/login");
  }

  const visibleNavItems = navItems.filter((item) => hasPermission(item.page, "canView"));
  const visibleAdminItems = adminNavItems.filter((item) => hasPermission(item.page, "canView"));
  const showAdminSection = visibleAdminItems.length > 0;

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-gray-50">
        {/* Sidebar */}
        <aside className="w-60 shrink-0 bg-white border-r border-gray-200 flex flex-col">
          {/* Logo */}
          <div className="px-6 py-5 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">Y</span>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 leading-tight flex items-center gap-1.5">
                  CSYFinproj
                  {isDevEnv && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold tracking-wide leading-none">
                      DEV
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-400">Yamaha Sales</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {visibleNavItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary-50 text-primary-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            {showAdminSection && (
              <>
                <div className="pt-3 pb-1">
                  <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    ผู้ดูแลระบบ
                  </p>
                </div>
                {visibleAdminItems.map((item) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-primary-50 text-primary-700"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          {/* User / Logout */}
          <div className="px-3 py-4 border-t border-gray-200">
            {user?.email && (
              <p className="px-3 text-xs text-gray-400 mb-2 truncate">{user.email}</p>
            )}
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
            >
              ออกจากระบบ
            </button>
          </div>
        </aside>

        {/* Page content */}
        <main className="flex-1 min-w-0 overflow-auto">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
