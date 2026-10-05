export type DeliveryZone = "AMBA" | "Interior";

export interface AccountFlags {
  hasConsignment: boolean;
  hasPromotions: boolean;
  /** Suspended or closed accounts cannot add products to the order. */
  suspended: boolean;
  /** The order is being processed by La Livre and cannot be edited. */
  orderLocked: boolean;
}

export interface Account {
  id: string;
  bookstoreName: string;
  branch: string;
  deposit: string;
  rubro: string;
  email: string;
  zone: DeliveryZone;
  /** Commercial discount applied to every list price. */
  discountPercent: number;
  flags: AccountFlags;
}

export interface AccountStatement {
  /** Amounts in cents. */
  balance: number;
  overdue: number;
}

export interface AccountActivity {
  lastOrderAt: string | null;
  lastInvoice: { number: string; amount: number; url: string } | null;
  lastShipment: { date: string; trackingUrl: string | null } | null;
}

export interface Consignment {
  /** Cover-price valuation in cents. */
  coverValue: number;
  copies: number;
}

export interface MonthlySale {
  /** YYYY-MM */
  month: string;
  amount: number;
}

export function canAddToOrder(flags: AccountFlags): boolean {
  return !flags.suspended;
}
