export const BRAND_DEFAULT = "Yamaha";

export const MOTORCYCLE_STATUSES = ["in_stock", "reserved", "sold"] as const;
export const SALE_STATUSES = ["active", "completed", "defaulted", "cancelled"] as const;
export const PAYMENT_METHODS = ["cash", "installment", "finance_company"] as const;
export const PAYMENT_CHANNELS = ["cash", "bank_transfer", "line"] as const;
export const INSTALLMENT_STATUSES = ["pending", "paid", "overdue", "partially_paid"] as const;
export const NOTIFICATION_CHANNELS = ["line", "sms", "email"] as const;
export const USER_ROLES = ["admin", "staff", "viewer"] as const;
export const DELIVERY_NOTE_STATUSES = ["pending", "verified", "cancelled"] as const;
export const DELIVERY_ITEM_TYPES = ["motorcycle", "part", "accessory"] as const;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
