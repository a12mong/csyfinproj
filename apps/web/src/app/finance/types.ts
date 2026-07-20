export interface CustomerSummary {
  id: string;
  name: string;
  phone: string;
  lineId?: string | null;
  isLineLinked: boolean;
}

export interface ContractSummary {
  id: string;
  contract_number: string;
  customer: CustomerSummary;
  status: string;
  total_amount: number;
  total_paid: number;
  total_outstanding: number;
  installment_count: number;
  installment_rate: number;
  overdue_count: number;
  total_overdue_amount: number;
  next_due_date: string | null;
  next_due_amount: number;
  motorcycle: {
    brand: string;
    model: string;
    chassisNumber: string;
    color: string;
  } | null;
  installments: Array<{
    id: string;
    installmentNumber: number;
    status: string;
    amountDue: number;
    amountPaid: number;
    dueDate: string;
  }>;
}

export interface FinanceOverview {
  contracts_count: number;
  total_outstanding: number;
  total_overdue_amount: number;
  overdue_contracts_count: number;
}

export interface DailySummary {
  date: string;
  total_expected: number;
  total_collected: number;
  remaining_outstanding: number;
}

export interface MonthlySummary {
  month: string;
  total_expected: number;
  total_paid: number;
  total_outstanding: number;
  overdue_installments_count: number;
}

export interface UpcomingDueItem {
  installment_id: string;
  installment_number: number;
  due_date: string;
  remaining: number;
  status: string;
  bucket: "overdue" | "today" | "upcoming";
  contract_id: string | null;
  contract_number: string | null;
  customer: CustomerSummary | null;
}

export interface UpcomingDue {
  days: number;
  items: UpcomingDueItem[];
  summary: {
    overdue_count: number;
    overdue_amount: number;
    today_count: number;
    today_amount: number;
    upcoming_count: number;
    upcoming_amount: number;
    partial_count: number;
    partial_amount: number;
    advance_count: number;
    advance_amount: number;
  };
}

export interface BatchItem {
  id: string;
  customerName: string | null;
  contractNumber: string | null;
  amount: string | number | null;
  channel: string | null;
  status: string;
  error: string | null;
  sentAt: string | null;
}

export interface NotificationBatch {
  id: string;
  source: string;
  channel: string | null;
  status: string;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  completedAt: string | null;
  createdBy: { id: string; name: string } | null;
  items: BatchItem[];
}

export type ReminderChannel = "line" | "sms" | "email";
