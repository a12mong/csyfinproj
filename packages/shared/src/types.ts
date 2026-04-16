export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "staff" | "viewer";
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  lineId?: string;
  address?: string;
  idCardNumber: string;
}

export interface CustomerWithDebtSummary extends Customer {
  totalDebt: number;
  paidAmount: number;
  overdueCount: number;
}

export interface Motorcycle {
  id: string;
  brand: string;
  model: string;
  year: number;
  chassisNumber: string;
  engineNumber: string;
  color: string;
  costPrice: number;
  sellingPrice: number;
  status: "in_stock" | "reserved" | "sold";
}

export interface Sale {
  id: string;
  customerId: string;
  motorcycleId: string;
  saleDate: string;
  totalPrice: number;
  downPayment: number;
  financeAmount: number;
  numInstallments: number;
  interestRate: number;
  paymentMethod: "cash" | "installment";
  status: "active" | "completed" | "defaulted" | "cancelled";
  notes?: string;
}

export interface SaleWithInstallments extends Sale {
  customer: Customer;
  motorcycle: Motorcycle;
  installments: Installment[];
  addons: Addon[];
}

export interface Installment {
  id: string;
  saleId: string;
  installmentNumber: number;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  status: "pending" | "paid" | "overdue" | "partially_paid";
}

export interface InstallmentWithPayments extends Installment {
  payments: Payment[];
}

export interface Payment {
  id: string;
  installmentId: string;
  amount: number;
  paymentDate: string;
  slipImageUrl?: string;
  verified: boolean;
}

export interface Addon {
  id: string;
  name: string;
  description?: string;
  price: number;
  active: boolean;
}

export interface NotificationLog {
  id: string;
  customerId: string;
  installmentId?: string;
  channel: "line" | "sms" | "email";
  message: string;
  status: "sent" | "failed" | "pending";
  sentAt?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
}
