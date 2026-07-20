"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/api";
import { formatPrice, formatDate, TH, installmentStatusLabel, isAdvancePartial } from "@/lib/format";
import type { SaleWithInstallments, Installment, Payment } from "@csyfinproj/shared";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

// ─── installment status badge ─────────────────────────────────────────────────

const INSTALLMENT_STATUS_STYLES: Record<Installment["status"], string> = {
  pending: "bg-yellow-50 text-yellow-700",
  paid: "bg-green-50 text-green-700",
  overdue: "bg-red-50 text-red-700",
  partially_paid: "bg-orange-50 text-orange-700",
};

function InstallmentBadge({
  status,
  dueDate,
}: {
  status: Installment["status"];
  dueDate?: string;
}) {
  const advance = isAdvancePartial(status, dueDate);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        advance
          ? "bg-sky-50 text-sky-700"
          : INSTALLMENT_STATUS_STYLES[status] ?? "bg-gray-100 text-gray-500"
      }`}
    >
      {installmentStatusLabel(status, dueDate)}
    </span>
  );
}

// ─── sale status badge ────────────────────────────────────────────────────────

const SALE_STATUS_STYLES: Record<string, string> = {
  active: "bg-blue-50 text-blue-700",
  completed: "bg-green-50 text-green-700",
  defaulted: "bg-red-50 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

// ─── page ─────────────────────────────────────────────────────────────────────

export default function SaleDetailPage() {
  const params = useParams<{ id: string }>();
  const [sale, setSale] = useState<SaleWithInstallments | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSale() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<{ data: SaleWithInstallments }>(
          `/sales/${params.id}`
        );
        setSale(res.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "ไม่สามารถโหลดข้อมูลรายการขายได้");
      } finally {
        setLoading(false);
      }
    }
    fetchSale();
  }, [params.id]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="px-8 py-8">
          <div className="h-8 w-48 bg-gray-100 rounded animate-pulse mb-4" />
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-6 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !sale) {
    return (
      <DashboardLayout>
        <div className="px-8 py-8">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error ?? "ไม่พบรายการขาย"}
          </div>
          <Link
            href="/sales"
            className="mt-4 inline-block text-sm text-primary-600 hover:underline"
          >
            ← กลับไปหน้ารายการขาย
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const isInstallment = sale.paymentMethod === "installment";
  const isFinanceCompany = sale.paymentMethod === "finance_company";
  const isCash = sale.paymentMethod === "cash";

  const paidCount = sale.installments.filter((i) => i.status === "paid").length;
  const overdueCount = sale.installments.filter(
    (i) => i.status === "overdue"
  ).length;
  const totalPaid = sale.installments.reduce(
    (sum, i) => sum + i.amountPaid,
    0
  );
  const remaining = sale.financeAmount - totalPaid;

  return (
    <DashboardLayout>
      <div className="px-8 py-6 max-w-3xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/sales" className="hover:text-gray-700 transition-colors">
            รายการขาย
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">
            {formatDate(sale.saleDate)}
          </span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {sale.motorcycle.brand} {sale.motorcycle.model}{" "}
              {sale.motorcycle.year}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm text-gray-500">
                {formatDate(sale.saleDate)}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  SALE_STATUS_STYLES[sale.status] ?? "bg-gray-100 text-gray-500"
                }`}
              >
                {TH.saleStatus[sale.status] ?? sale.status}
              </span>
            </div>
          </div>
        </div>

        {/* Cash completed notice */}
        {isCash && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
            <span className="text-green-600">✓</span>
            <p className="text-sm text-green-700">
              รายการขายเงินสดนี้เสร็จสิ้นทันทีเมื่อสร้าง
            </p>
          </div>
        )}

        {/* Finance company notice */}
        {isFinanceCompany && (
          <div className="mb-6 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
            <p className="text-sm text-blue-700">
              รายการขายนี้เป็นรายการขายผ่านบริษัทไฟแนนซ์ <strong>{sale.financeCompanyName ?? "บริษัทไฟแนนซ์"}</strong>
            </p>
          </div>
        )}

        {/* Linked contract notice */}
        {(sale as any).linkedContract && (
          <div className="mb-6 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center justify-between shadow-sm">
            <p className="text-sm text-emerald-800">
              รายการขายนี้เชื่อมโยงกับสัญญาเช่าซื้อเลขที่: <strong>{(sale as any).linkedContract.contractNumber}</strong> (สถานะ: <span className="font-semibold">{TH.contractStatus[(sale as any).linkedContract.status] ?? (sale as any).linkedContract.status}</span>)
            </p>
            <Link
              href={`/contracts/${(sale as any).linkedContract.id}`}
              className="text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition-colors border border-emerald-200"
            >
              ไปหน้าสัญญา →
            </Link>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">ราคารวม</p>
            <p className="text-lg font-bold text-gray-900">
              {formatPrice(sale.totalPrice)}
            </p>
            {Number((sale as unknown as { discountAmount?: number }).discountAmount) > 0 && (
              <p className="text-xs text-green-700 mt-0.5">
                ส่วนลด -{formatPrice(Number((sale as unknown as { discountAmount?: number }).discountAmount))}
              </p>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">เงินดาวน์</p>
            <p className="text-lg font-bold text-gray-900">
              {formatPrice(sale.downPayment)}
            </p>
          </div>
          {!isCash && (
            <>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <p className="text-xs text-gray-500 mb-1">ยอดจัดไฟแนนซ์</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatPrice(sale.financeAmount)}
                </p>
              </div>
              {isInstallment && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <p className="text-xs text-gray-500 mb-1">คงเหลือ</p>
                  <p
                    className={`text-lg font-bold ${
                      remaining > 0 ? "text-gray-900" : "text-green-600"
                    }`}
                  >
                    {formatPrice(Math.max(0, remaining))}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Info sections */}
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {/* Customer */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              ลูกค้า
            </p>
            <p className="text-sm font-semibold text-gray-900">
              {sale.customer.name}
            </p>
            <p className="text-sm text-gray-500 mt-1">{sale.customer.phone}</p>
            {sale.customer.email && (
              <p className="text-sm text-gray-500">{sale.customer.email}</p>
            )}
            <Link
              href={`/customers/${sale.customer.id}`}
              className="mt-2 inline-block text-xs text-primary-600 hover:underline"
            >
              ดูโปรไฟล์ →
            </Link>
          </div>

          {/* Motorcycle */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              รถจักรยานยนต์
            </p>
            <p className="text-sm font-semibold text-gray-900">
              {sale.motorcycle.brand} {sale.motorcycle.model}{" "}
              {sale.motorcycle.year}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {sale.motorcycle.color}
            </p>
            <p className="text-xs text-gray-400 font-mono mt-1">
              {sale.motorcycle.chassisNumber}
            </p>
          </div>
        </div>

        {/* Sale details */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100 mb-6">
          {[
            {
              label: "วิธีชำระเงิน",
              value: (
                <span>
                  {TH.paymentMethod[sale.paymentMethod] ?? sale.paymentMethod}
                </span>
              ),
            },
            ...(isFinanceCompany && sale.financeCompanyName
              ? [{ label: "สถาบันการเงิน", value: sale.financeCompanyName }]
              : []),
            ...(isFinanceCompany && sale.financeReferenceNumber
              ? [{ label: "เลขอ้างอิงไฟแนนซ์", value: sale.financeReferenceNumber }]
              : []),
            ...(!isCash
              ? [{ label: "ยอดจัดไฟแนนซ์", value: formatPrice(sale.financeAmount) }]
              : []),
            ...(isInstallment
              ? [
                  { label: "จำนวนงวด", value: `${sale.numInstallments} งวด` },
                  { label: "อัตราดอกเบี้ย", value: `${sale.interestRate}% ต่อปี` },
                  {
                    label: "ความคืบหน้า",
                    value: (
                      <span>
                        ชำระแล้ว {paidCount} / {sale.installments.length} งวด
                        {overdueCount > 0 && (
                          <span className="ml-2 text-red-600">
                            (เกินกำหนด {overdueCount} งวด)
                          </span>
                        )}
                      </span>
                    ),
                  },
                ]
              : []),
            ...(sale.addons.length > 0
              ? [
                  {
                    label: "บริการเสริม",
                    value: sale.addons.map((a) => a.name).join(", "),
                  },
                ]
              : []),
            ...(sale.notes ? [{ label: "หมายเหตุ", value: sale.notes }] : []),
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex items-center justify-between px-6 py-4"
            >
              <span className="text-sm text-gray-500">{label}</span>
              <span className="text-sm text-gray-900">{value}</span>
            </div>
          ))}
        </div>

        {/* Installment schedule — only for installment payment method */}
        {isInstallment && sale.installments.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              ตารางผ่อนชำระ
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-center px-5 py-3 font-medium text-gray-500 w-12">
                        #
                      </th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">
                        กำหนดชำระ
                      </th>
                      <th className="text-right px-5 py-3 font-medium text-gray-500">
                        ยอดที่ต้องชำระ
                      </th>
                      <th className="text-right px-5 py-3 font-medium text-gray-500">
                        ชำระแล้ว
                      </th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">
                        การชำระเงินและใบกำกับ
                      </th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">
                        สถานะ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.installments.map((installment) => {
                      const linkedPayments = (installment as any).payments || [];
                      return (
                        <tr
                          key={installment.id}
                          className={`border-b border-gray-50 ${
                            installment.status === "overdue"
                              ? "bg-red-50/30"
                              : installment.status === "paid"
                              ? "bg-green-50/20"
                              : ""
                          }`}
                        >
                          <td className="px-5 py-3 text-center text-gray-500">
                            {installment.installmentNumber}
                          </td>
                          <td className="px-5 py-3 text-gray-600">
                            {formatDate(installment.dueDate)}
                          </td>
                          <td className="px-5 py-3 text-right text-gray-900">
                            {formatPrice(Number(installment.amountDue))}
                          </td>
                          <td className="px-5 py-3 text-right text-gray-600">
                            {Number(installment.amountPaid) > 0 ? (
                              <div>
                                <p className="font-semibold text-gray-900">{formatPrice(Number(installment.amountPaid))}</p>
                                {installment.status === "partially_paid" && (
                                  <p className="text-[10px] text-orange-600 font-medium">
                                    (ขาด {formatPrice(Number(installment.amountDue) - Number(installment.amountPaid))})
                                  </p>
                                )}
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-600">
                            {linkedPayments.length > 0 ? (
                              <div className="space-y-1.5 max-w-[280px] text-left">
                                {linkedPayments.map((p: any) => (
                                  <div key={p.id} className="border-b border-dashed border-gray-100 pb-1 last:border-0 last:pb-0">
                                    <div className="flex justify-between font-medium text-gray-800">
                                      <span>{formatPrice(Number(p.amount))}</span>
                                      <span className="text-[10px] uppercase text-gray-400">{TH.paymentChannel[p.paymentChannel] ?? p.paymentChannel}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-gray-400">
                                      <span>{formatDate(p.paymentDate)}</span>
                                      <span className={p.verified ? "text-green-600 font-semibold" : "text-amber-500 font-semibold"}>
                                        {p.verified ? "ตรวจสอบแล้ว" : "รอตรวจสอบ"}
                                      </span>
                                    </div>
                                    {/* Tax Invoices linked to this payment */}
                                    {p.taxInvoices && p.taxInvoices.map((inv: any) => (
                                      <div key={inv.id} className="flex justify-between items-center bg-gray-50 rounded px-1.5 py-0.5 mt-1 text-[10px]">
                                        <span className="font-mono text-gray-600">📄 {inv.invoiceNumber}</span>
                                        <a
                                          href={`${API_BASE_URL}/payments/invoices/${inv.id}/print`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-primary-600 hover:text-primary-700 font-semibold"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                          }}
                                        >
                                          พิมพ์
                                        </a>
                                      </div>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400 font-light">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex flex-col items-center">
                              <InstallmentBadge status={installment.status} dueDate={installment.dueDate} />
                              {installment.status === "partially_paid" && (
                                <span className="text-[10px] text-orange-600 mt-1 font-semibold">
                                  ค้างจ่าย: {formatPrice(Number(installment.amountDue) - Number(installment.amountPaid))}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {isInstallment && sale.installments.length === 0 && !(sale as any).linkedContract && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5 mb-6">
            <h3 className="text-sm font-semibold text-yellow-800 mb-1">
              สัญญายังไม่ถูกสร้าง
            </h3>
            <p className="text-sm text-yellow-700 mb-3">
              รายการขายนี้เป็นการขายแบบผ่อนกับร้าน (เช่าซื้อ) จำเป็นต้องสร้างสัญญาเช่าซื้อเพื่อกำหนดจำนวนงวด ดอกเบี้ย และคำนวณตารางผ่อนชำระ
            </p>
            <Link
              href={`/contracts?open=new&customer_id=${sale.customerId}&sale_id=${sale.id}`}
              className="inline-flex items-center justify-center px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              สร้างสัญญาเช่าซื้อ
            </Link>
          </div>
        )}

        {/* Addons detailed list */}
        {sale.addons && sale.addons.length > 0 && (
          <div className="mt-6">
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              รายละเอียดของแถมและบริการเสริม
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-5 py-3 font-medium text-gray-500">ชื่อ</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">ประเภท</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">รูปแบบการจ่ายเงิน</th>
                      <th className="text-right px-5 py-3 font-medium text-gray-500">ราคาทุน</th>
                      <th className="text-right px-5 py-3 font-medium text-gray-500">ราคาขาย</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.addons.map((a: any) => (
                      <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-semibold text-gray-900">{a.name}</td>
                        <td className="px-5 py-3 text-gray-600 capitalize">{a.type}</td>
                        <td className="px-5 py-3 text-gray-600">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            a.billingOption === "free_gift"
                              ? "bg-green-50 text-green-700"
                              : a.billingOption === "included_in_finance"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-gray-100 text-gray-700"
                          }`}>
                            {a.billingOption === "free_gift"
                              ? "แถมฟรี"
                              : a.billingOption === "included_in_finance"
                              ? "รวมในยอดจัด"
                              : "จ่ายแยก"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right text-gray-500">
                          {formatPrice(Number(a.costPrice))}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-900 font-semibold">
                          {formatPrice(Number(a.priceAtSale ?? a.price))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tax Invoices direct printing */}
        {sale.taxInvoices && sale.taxInvoices.length > 0 && (
          <div className="mt-6">
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              พิมพ์ใบกำกับภาษี
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100 overflow-hidden">
              {sale.taxInvoices.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-gray-900">📄 {inv.invoiceNumber}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600`}>
                        {inv.type.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      ออกเมื่อ: {formatDate(inv.issuedAt)} · ยอดรวม: <span className="font-semibold text-gray-900">{formatPrice(Number(inv.totalAmount))}</span> (VAT: {formatPrice(Number(inv.vatAmount))})
                    </p>
                  </div>
                  <button
                    onClick={() => window.open(`${API_BASE_URL}/payments/invoices/${inv.id}/print`, "_blank")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white hover:bg-primary-700 text-xs font-semibold rounded-lg transition-colors shadow-sm"
                  >
                    🖨️ พิมพ์ใบกำกับ
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          <Link
            href="/sales"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← กลับไปหน้ารายการขาย
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
