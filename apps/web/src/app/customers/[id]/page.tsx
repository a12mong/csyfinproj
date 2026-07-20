"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/api";
import { confirm as swalConfirm, toastSuccess, alertError } from "@/lib/swal";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
import { formatPrice, formatDate, TH } from "@/lib/format";
import type { CustomerWithDebtSummary, Sale, PaginatedResponse } from "@csyfinproj/shared";

const SALE_STATUS_STYLES: Record<string, string> = {
  active: "bg-blue-50 text-blue-700",
  completed: "bg-green-50 text-green-700",
  defaulted: "bg-red-50 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function CustomerDetailPage() {
  const { user: authUser, hasPermission } = useAuth();
  const canEditCustomer = hasPermission("customers", "canEdit");

  // Identity documents (PDPA-protected, blurred server-side without permission)
  const [docVersion, setDocVersion] = useState(0);
  const [docMissing, setDocMissing] = useState<Record<string, boolean>>({});
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  async function handleDocUpload(type: "id_card" | "selfie", file: File) {
    setUploadingDoc(type);
    try {
      const fd = new FormData();
      fd.append(type === "id_card" ? "id_card_image" : "id_card_selfie", file);
      const res = await fetch(`${API_BASE_URL}/customers/${params.id}/documents`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || res.statusText);
      }
      toastSuccess("อัปโหลดรูปเรียบร้อยแล้ว");
      setDocMissing((prev) => ({ ...prev, [type]: false }));
      setDocVersion((v) => v + 1);
    } catch (err) {
      alertError(err instanceof Error ? err.message : "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setUploadingDoc(null);
    }
  }
  const params = useParams<{ id: string }>();

  async function handleAnonymize() {
    const ok = await swalConfirm({
      title: "ปกปิดข้อมูลลูกค้า (PDPA)?",
      text: "ชื่อ เบอร์โทร เลขบัตร และข้อมูลติดต่อจะถูกลบถาวร (ยอดการเงินคงอยู่) — ระบบจะปฏิเสธหากยังอยู่ในช่วงเก็บข้อมูลตามนโยบาย",
      confirmText: "ยืนยันปกปิดข้อมูล",
      cancelText: "ยกเลิก",
      icon: "warning",
    });
    if (!ok) return;
    try {
      await apiFetch(`/customers/${params.id}/anonymize`, { method: "POST" });
      toastSuccess("ปกปิดข้อมูลลูกค้าแล้ว");
      window.location.reload();
    } catch (err) {
      alertError(err instanceof Error ? err.message : "ไม่สามารถปกปิดข้อมูลได้");
    }
  }
  const [customer, setCustomer] = useState<CustomerWithDebtSummary | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState(false);
  const [sendingGreeting, setSendingGreeting] = useState(false);
  const [windowOrigin, setWindowOrigin] = useState("http://localhost:3000");
  const [linkCode, setLinkCode] = useState<{
    code: string;
    expires_at: string;
    oa_basic_id: string | null;
  } | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);

  async function generateLinkCode() {
    setGeneratingCode(true);
    try {
      const res = await apiFetch<{
        data: { code: string; expires_at: string; oa_basic_id: string | null };
      }>(`/customers/${params.id}/line-link-code`, { method: "POST" });
      setLinkCode(res.data);
    } catch (err) {
      alertError(err instanceof Error ? err.message : "ไม่สามารถสร้างรหัสเชื่อมต่อได้");
    } finally {
      setGeneratingCode(false);
    }
  }

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [customerRes, salesRes] = await Promise.all([
          apiFetch<{ data: CustomerWithDebtSummary }>(`/customers/${params.id}`),
          apiFetch<PaginatedResponse<Sale>>(`/sales?customer_id=${params.id}&limit=50`),
        ]);
        setCustomer(customerRes.data);
        setSales(salesRes.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "ไม่สามารถโหลดข้อมูลลูกค้าได้");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params.id]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWindowOrigin(window.location.origin);
    }
  }, []);

  // Auto-generate a link code when viewing an unlinked customer
  useEffect(() => {
    if (customer && !customer.isLineLinked && !linkCode && !generatingCode) {
      generateLinkCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.isLineLinked]);

  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    let attempts = 0;
    if (customer && !customer.isLineLinked) {
      pollInterval = setInterval(async () => {
        // Stop polling after ~5 minutes; staff can refresh the page to resume
        if (++attempts > 100) {
          clearInterval(pollInterval);
          return;
        }
        try {
          const res = await apiFetch<{ isLineLinked: boolean; lineId: string | null; linePictureUrl: string | null }>(
            `/customers/${params.id}/link-status`
          );
          if (res.isLineLinked) {
            setCustomer((prev) =>
              prev
                ? {
                    ...prev,
                    isLineLinked: true,
                    lineId: res.lineId ?? undefined,
                    linePictureUrl: res.linePictureUrl,
                  }
                : null
            );
          }
        } catch (err) {
          console.error("Error polling LINE link status:", err);
        }
      }, 3000);
    }
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [customer?.isLineLinked, params.id]);

  async function handleUnlink() {
    const ok = await swalConfirm({
      title: "ต้องการยกเลิกการเชื่อมต่อบัญชี LINE ของลูกค้ารายนี้ใช่หรือไม่?",
      icon: "warning",
    });
    if (!ok) {
      return;
    }
    setUnlinking(true);
    try {
      await apiFetch(`/customers/${params.id}/unlink-line`, { method: "POST" });
      setCustomer((prev) =>
        prev
          ? {
              ...prev,
              isLineLinked: false,
              lineId: undefined,
              linePictureUrl: undefined,
            }
          : null
      );
    } catch (err) {
      alertError(err instanceof Error ? err.message : "ไม่สามารถยกเลิกการเชื่อมต่อบัญชี LINE ได้");
    } finally {
      setUnlinking(false);
    }
  }

  async function handleSendGreeting() {
    setSendingGreeting(true);
    try {
      await apiFetch("/notifications/send-greeting", {
        method: "POST",
        body: JSON.stringify({ customer_id: params.id }),
      });
      toastSuccess("ส่งข้อความทักทายเรียบร้อยแล้ว!");
    } catch (err) {
      alertError(err instanceof Error ? err.message : "ไม่สามารถส่งข้อความทักทายได้");
    } finally {
      setSendingGreeting(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="px-8 py-8">
          <div className="h-8 w-48 bg-gray-100 rounded animate-pulse mb-4" />
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-6 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !customer) {
    return (
      <DashboardLayout>
        <div className="px-8 py-8">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error ?? "ไม่พบลูกค้า"}
          </div>
          <Link
            href="/customers"
            className="mt-4 inline-block text-sm text-primary-600 hover:underline"
          >
            ← กลับไปหน้าลูกค้า
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="px-8 py-6 max-w-3xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/customers" className="hover:text-gray-700 transition-colors">
            ลูกค้า
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{customer.name}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
            <p className="text-sm text-gray-500 mt-1">{customer.phone}</p>
          </div>
          <Link
            href={`/sales?open=new&customer_id=${customer.id}`}
            className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
          >
            + สร้างรายการขาย
          </Link>
        </div>

        {/* Debt Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">ยอดหนี้รวม</p>
            <p className="text-xl font-bold text-gray-900">
              {formatPrice(customer.totalDebt)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">ยอดที่ชำระแล้ว</p>
            <p className="text-xl font-bold text-green-600">
              {formatPrice(customer.paidAmount)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">เกินกำหนด</p>
            <p className={`text-xl font-bold ${customer.overdueCount > 0 ? "text-red-600" : "text-gray-900"}`}>
              {customer.overdueCount} งวด
            </p>
          </div>
        </div>

        {/* Customer Info */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100 mb-6">
          {[
            { label: "ชื่อ-นามสกุล", value: customer.name },
            { label: "เบอร์โทรศัพท์", value: customer.phone },
            { label: "เลขบัตรประชาชน", value: <span className="font-mono text-xs">{customer.idCardNumber}</span> },
            { label: "อีเมล", value: customer.email ?? "—" },
            { label: "LINE ID", value: customer.lineId ?? "—" },
            { label: "ที่อยู่", value: customer.address ?? "—" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-6 py-4">
              <span className="text-sm text-gray-500">{label}</span>
              <span className="text-sm text-gray-900">{value}</span>
            </div>
          ))}
        </div>

        {/* Identity documents (PDPA) */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-semibold text-gray-900">เอกสารยืนยันตัวตน</h2>
            <span className="text-[11px] text-gray-400">
              🔒 เบลออัตโนมัติหากไม่มีสิทธิ์ดูข้อมูลส่วนบุคคล (PDPA)
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            รูปบัตรประชาชน และรูปถ่ายลูกค้าคู่กับบัตรประชาชน
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(
              [
                { type: "id_card" as const, label: "รูปบัตรประชาชน" },
                { type: "selfie" as const, label: "รูปถ่ายคู่บัตรประชาชน" },
              ]
            ).map(({ type, label }) => (
              <div key={type} className="border border-gray-200 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-600 mb-2">{label}</p>
                {docMissing[type] ? (
                  <div className="h-40 flex items-center justify-center bg-gray-50 rounded-lg text-xs text-gray-400">
                    ยังไม่มีรูป
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`${API_BASE_URL}/customers/${params.id}/documents/${type}?v=${docVersion}`}
                    alt={label}
                    className="h-40 w-full object-contain bg-gray-50 rounded-lg"
                    onError={() => setDocMissing((prev) => ({ ...prev, [type]: true }))}
                  />
                )}
                {canEditCustomer && (
                  <label className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 cursor-pointer">
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      className="hidden"
                      disabled={uploadingDoc !== null}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleDocUpload(type, f);
                        e.target.value = "";
                      }}
                    />
                    {uploadingDoc === type ? "กำลังอัปโหลด…" : "📷 อัปโหลด/เปลี่ยนรูป"}
                  </label>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* LINE Connection Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6 animate-fadeIn">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#06C755] text-white text-[10px] font-black">LINE</span>
            การเชื่อมต่อบัญชี LINE
          </h2>
          
          {customer.isLineLinked ? (
            <div className="flex items-start gap-4">
              {customer.linePictureUrl ? (
                <img
                  src={customer.linePictureUrl}
                  alt="LINE profile"
                  className="h-12 w-12 rounded-full object-cover shrink-0 border border-green-200 shadow-sm"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-[#06C755] shrink-0 border border-green-100">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}
              <div className="flex-1 space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-800">เชื่อมต่อแล้ว</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                    ใช้งานอยู่
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  บัญชีลูกค้ารายนี้เชื่อมต่อกับบัญชี LINE เรียบร้อยแล้ว
                </p>
                <div className="mt-2 font-mono text-xs text-gray-600 bg-gray-50 rounded-lg p-2 max-w-md truncate flex justify-between items-center border border-gray-100">
                  <span className="truncate flex-1">LINE ID: {customer.lineId}</span>
                  <button
                    onClick={handleUnlink}
                    disabled={unlinking}
                    className="text-red-600 hover:text-red-700 font-semibold text-xs ml-4 shrink-0 transition-colors"
                  >
                    {unlinking ? "กำลังยกเลิกการเชื่อมต่อ..." : "ยกเลิกการเชื่อมต่อ"}
                  </button>
                </div>
                <div className="pt-2">
                  <button
                    onClick={handleSendGreeting}
                    disabled={sendingGreeting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#06C755] hover:bg-[#05b04b] text-white text-xs font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50"
                  >
                    💬 {sendingGreeting ? "กำลังส่ง..." : "ส่งข้อความทักทาย"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-800">ยังไม่เชื่อมต่อ</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                    รอเชื่อมต่อ
                  </span>
                </div>

                {linkCode?.oa_basic_id ? (
                  <>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      วิธีเชื่อมต่อ (ไม่ต้อง Login LINE):
                    </p>
                    <ol className="text-xs text-gray-600 leading-relaxed list-decimal pl-4 space-y-1">
                      <li>ให้ลูกค้าสแกน QR ด้วยกล้องมือถือหรือแอปใดก็ได้</li>
                      <li>ระบบจะเปิด LINE ไปที่แชท OA ของร้าน พร้อมข้อความรหัสพิมพ์ไว้ให้แล้ว
                        (ถ้ายังไม่ได้เป็นเพื่อน LINE จะให้กด Add Friend ก่อน)</li>
                      <li>ลูกค้ากด <b>ส่ง</b> — ระบบเชื่อมต่อให้อัตโนมัติทันที</li>
                    </ol>
                    <div className="flex items-center gap-3 pt-1">
                      <div className="font-mono text-lg font-bold tracking-[0.3em] bg-gray-900 text-white rounded-lg px-4 py-2">
                        {linkCode.code}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        <p>รหัสหมดอายุ {formatDate(linkCode.expires_at)}</p>
                        <button
                          onClick={generateLinkCode}
                          disabled={generatingCode}
                          className="text-primary-600 hover:underline font-medium disabled:opacity-50"
                        >
                          {generatingCode ? "กำลังสร้าง…" : "สร้างรหัสใหม่"}
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      หากสแกนไม่ได้: ให้ลูกค้า Add Friend LINE OA ({linkCode.oa_basic_id}) แล้วพิมพ์{" "}
                      <span className="font-mono">LINK {linkCode.code}</span> ส่งเข้ามาในแชท
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      เชื่อมต่อบัญชี LINE ของลูกค้าเพื่อให้ลูกค้ารับการแจ้งเตือนการชำระเงิน
                      การแจ้งเตือนค่างวด และส่งสลิปการชำระเงินอัตโนมัติผ่าน LINE Official Account
                      ของร้านได้
                    </p>
                    {linkCode && !linkCode.oa_basic_id && (
                      <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                        ⚠ ยังไม่ได้ตั้งค่า <span className="font-mono">LINE_OA_BASIC_ID</span> ใน
                        API .env — ระบบจึงใช้วิธีเชื่อมต่อแบบ LINE Login (LIFF) ชั่วคราว
                      </p>
                    )}
                  </>
                )}

                <div className="pt-1">
                  <p className="text-[11px] font-medium text-gray-400 mb-1">
                    วิธีสำรอง — LINE Login (LIFF):
                  </p>
                  <a
                    href={`/customers/link-line/${customer.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-[11px] font-medium text-primary-600 hover:underline break-all bg-primary-50 px-2 py-1 rounded-lg transition-all"
                  >
                    {`${windowOrigin}/customers/link-line/${customer.id}`}
                  </a>
                </div>
              </div>

              <div className="shrink-0 flex flex-col items-center p-3 border border-gray-100 bg-gray-50/50 rounded-xl text-center space-y-2">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                    linkCode?.oa_basic_id
                      ? `https://line.me/R/oaMessage/${encodeURIComponent(linkCode.oa_basic_id)}/?${encodeURIComponent(`LINK ${linkCode.code}`)}`
                      : `${windowOrigin}/customers/link-line/${customer.id}`
                  )}`}
                  alt="LINE Link QR Code"
                  className="w-[150px] h-[150px] bg-white rounded-lg shadow-sm border border-gray-100"
                />
                <p className="text-[10px] text-gray-400 font-medium max-w-[150px]">
                  {linkCode?.oa_basic_id
                    ? "สแกนด้วยกล้อง → เปิด LINE → กดส่ง"
                    : "สแกนเพื่อเชื่อมต่อบัญชี LINE"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sales History */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">
            ประวัติการซื้อ
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({sales.length})
            </span>
          </h2>

          {sales.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-10 text-center text-sm text-gray-400">
              ยังไม่มีรายการขาย{" "}
              <Link
                href={`/sales?open=new&customer_id=${customer.id}`}
                className="text-primary-600 hover:underline"
              >
                สร้างรายการใหม่?
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 font-medium text-gray-500">
                      วันที่
                    </th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">
                      วิธีชำระ
                    </th>
                    <th className="text-right px-5 py-3 font-medium text-gray-500">
                      ยอดรวม
                    </th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">
                      สถานะ
                    </th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr
                      key={sale.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-5 py-3 text-gray-600">
                        {formatDate(sale.saleDate)}
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {TH.paymentMethod[sale.paymentMethod] ?? sale.paymentMethod}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-gray-900">
                        {formatPrice(sale.totalPrice)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            SALE_STATUS_STYLES[sale.status] ?? "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {TH.saleStatus[sale.status] ?? sale.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/sales/${sale.id}`}
                          className="text-primary-600 hover:text-primary-700 text-xs font-medium"
                        >
                          ดูรายละเอียด
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Link
            href="/customers"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← กลับไปหน้าลูกค้า
          </Link>
          {authUser?.role === "admin" && (
            <button
              onClick={handleAnonymize}
              className="text-xs text-red-600 hover:text-red-700 hover:underline"
            >
              ปกปิดข้อมูลลูกค้า (PDPA)
            </button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
