export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "staff" | "viewer";
  active: boolean;
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
  deliveryNoteItemId?: string;
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
  paymentMethod: "cash" | "installment" | "finance_company";
  financeCompanyName?: string;
  financeReferenceNumber?: string;
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
  paymentChannel: "cash" | "bank_transfer" | "line";
  slipImageUrl?: string;
  verified: boolean;
  lineMessageId?: string;
}

export interface DeliveryNote {
  id: string;
  noteNumber: string;
  supplierName: string;
  receivedDate: string;
  receivedByUserId: string;
  notes?: string;
  status: "pending" | "verified" | "cancelled";
}

export interface DeliveryNoteWithItems extends DeliveryNote {
  items: DeliveryNoteItem[];
  receivedBy: User;
}

export interface DeliveryNoteItem {
  id: string;
  deliveryNoteId: string;
  itemType: "motorcycle" | "part" | "accessory";
  description: string;
  quantity: number;
  unitCost: number;
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
