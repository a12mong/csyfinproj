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

            {/* Roles & Permissions Card */}
            <Link
              href="/settings/roles"
              className="group relative rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:border-primary-300 hover:shadow-md transition-all"
            >
              <div className="mb-4 w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-amber-600"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h2 className="text-sm font-semibold text-gray-900 mb-1">Role และสิทธิ์</h2>
              <p className="text-sm text-gray-500">
                สร้าง role / sub-role และกำหนดสิทธิ์การใช้งานรายหน้าจอ
              </p>
              <span className="mt-4 inline-flex items-center text-xs font-medium text-amber-600 group-hover:text-amber-700">
                จัดการสิทธิ์
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

            {/* System Settings Card */}
            <Link
              href="/settings/system"
              className="group relative rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:border-primary-300 hover:shadow-md transition-all"
            >
              <div className="mb-4 w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-sm font-semibold text-gray-900 mb-1">ตั้งค่าระบบ</h2>
              <p className="text-sm text-gray-500">
                รูปแบบวันที่/ทศนิยม และนโยบายเก็บข้อมูล (PDPA)
              </p>
              <span className="mt-4 inline-flex items-center text-xs font-medium text-slate-600 group-hover:text-slate-700">
                ตั้งค่า
                <svg xmlns="http://www.w3.org/2000/svg" className="ml-1 h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </span>
            </Link>

            {/* Audit Logs Card */}
            <Link
              href="/settings/audit-logs"
              className="group relative rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:border-primary-300 hover:shadow-md transition-all"
            >
              <div className="mb-4 w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-sm font-semibold text-gray-900 mb-1">ประวัติการใช้งาน</h2>
              <p className="text-sm text-gray-500">
                Audit log ทุกการกระทำในระบบ พร้อมปกปิดข้อมูลส่วนบุคคล
              </p>
              <span className="mt-4 inline-flex items-center text-xs font-medium text-indigo-600 group-hover:text-indigo-700">
                ดูประวัติ
                <svg xmlns="http://www.w3.org/2000/svg" className="ml-1 h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
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
