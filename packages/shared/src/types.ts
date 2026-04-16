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
  numInstallments?: number;
  interestRate?: number;
  paymentMethod: "cash" | "installment" | "finance_company";
  financeCompanyName?: string;
  financeReferenceNumber?: string;
  financialInstitutionId?: string | null;
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
  saleId: string | null;
  contractId?: string | null;
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
  installmentId: string | null;
  contractId?: string | null;
  amount: number;
  paymentDate: string;
  paymentChannel: "cash" | "bank_transfer" | "line";
  slipImageUrl?: string;
  verified: boolean;
  lineMessageId?: string;
  contract?: { id: string; contractNumber: string; customer?: { id: string; name: string } } | null;
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

// ─── Contract types ───────────────────────────────────────────────────────────

export interface Contract {
  id: string;
  contractNumber: string;
  customerId: string;
  totalPrincipal: number;
  totalInterest: number;
  totalAmount: number;
  numInstallments: number;
  interestRate: number;
  startDate: string;
  financialInstitutionId?: string | null;
  status: "active" | "completed" | "defaulted" | "cancelled";
  notes?: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContractInstallment {
  id: string;
  contractId: string;
  installmentNumber: number;
  dueDate: string;
  amountDue: number;
  principalPortion?: number | null;
  interestPortion?: number | null;
  remainingBalance?: number | null;
  amountPaid: number;
  status: "pending" | "paid" | "overdue" | "partially_paid";
}

export interface ContractPayment {
  id: string;
  contractId: string;
  installmentId?: string | null;
  amount: number;
  paymentDate: string;
  paymentChannel: "cash" | "bank_transfer" | "line";
  slipImageUrl?: string | null;
  verified: boolean;
  verifiedBy?: { id: string; name: string } | null;
}

export interface ContractParty {
  id: string;
  contractId: string;
  role: "owner" | "buyer" | "seller";
  partyName: string;
  partyRefId?: string | null;
  partyRefType?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContractSaleLink {
  id: string;
  contractId: string;
  saleId: string;
  sale: Sale & { motorcycle: Motorcycle };
}

export interface ContractListItem extends Contract {
  customer: Customer;
  _count: { installments: number; payments: number };
}

export interface ContractDetail extends Contract {
  customer: Customer;
  createdBy: { id: string; name: string };
  contractSales: ContractSaleLink[];
  installments: ContractInstallment[];
  payments: ContractPayment[];
  contractParties: ContractParty[];
}
