"use client";

import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import PermissionGuard from "@/components/PermissionGuard";

export default function SettingsPage() {
  return (
    <PermissionGuard page="settings">
      <DashboardLayout>
        <div className="px-8 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your system configuration</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* User Management Card */}
            <Link
              href="/settings/users"
              className="group relative rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:border-primary-300 hover:shadow-md transition-all"
            >
              <div className="mb-4 w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-primary-600"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
              </div>
              <h2 className="text-sm font-semibold text-gray-900 mb-1">User Management</h2>
              <p className="text-sm text-gray-500">
                Create, edit, and manage user accounts and roles.
              </p>
              <span className="mt-4 inline-flex items-center text-xs font-medium text-primary-600 group-hover:text-primary-700">
                Manage users
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="ml-1 h-3.5 w-3.5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </Link>

            {/* LINE Settings Card */}
            <Link
              href="/settings/line"
              className="group relative rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:border-primary-300 hover:shadow-md transition-all"
            >
              <div className="mb-4 w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-green-600"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                  <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                </svg>
              </div>
              <h2 className="text-sm font-semibold text-gray-900 mb-1">LINE Settings</h2>
              <p className="text-sm text-gray-500">
                Configure LINE integration, webhook, and notification settings.
              </p>
              <span className="mt-4 inline-flex items-center text-xs font-medium text-green-600 group-hover:text-green-700">
                Configure LINE
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="ml-1 h-3.5 w-3.5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    </PermissionGuard>
  );
}
