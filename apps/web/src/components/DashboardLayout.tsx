"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ProtectedRoute from "./ProtectedRoute";
import { useAuth, PermissionPage } from "@/contexts/AuthContext";

interface NavItem {
  href: string;
  label: string;
  exact: boolean;
  page: PermissionPage;
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", exact: true, page: "dashboard" },
  { href: "/inventory", label: "Inventory", exact: false, page: "inventory" },
  { href: "/receiving", label: "Receiving", exact: false, page: "receiving" },
  { href: "/sales", label: "Sales", exact: false, page: "sales" },
  { href: "/customers", label: "Customers", exact: false, page: "customers" },
  { href: "/finance", label: "Finance", exact: false, page: "finance" },
  { href: "/payments", label: "Payments", exact: false, page: "payments" },
];

const adminNavItems: NavItem[] = [
  { href: "/settings", label: "Settings", exact: false, page: "settings" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, hasPermission } = useAuth();

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
                <p className="text-sm font-bold text-gray-900 leading-tight">CSYFinproj</p>
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
                    Admin
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
              Sign out
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
