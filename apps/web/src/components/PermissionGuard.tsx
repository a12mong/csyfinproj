"use client";

import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth, PermissionPage, PagePermission } from "@/contexts/AuthContext";

interface PermissionGuardProps {
  page: PermissionPage;
  action?: keyof PagePermission;
  children: ReactNode;
}

/**
 * Wraps page content and redirects to "/" if the authenticated user lacks
 * the required permission. Defaults to checking `canView`.
 */
export default function PermissionGuard({
  page,
  action = "canView",
  children,
}: PermissionGuardProps) {
  const { hasPermission, isLoading } = useAuth();
  const router = useRouter();

  const allowed = !isLoading && hasPermission(page, action);

  useEffect(() => {
    if (!isLoading && !hasPermission(page, action)) {
      router.replace("/");
    }
  }, [isLoading, page, action, router, hasPermission]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-gray-500">Loading…</span>
      </div>
    );
  }

  if (!allowed) return null;

  return <>{children}</>;
}
