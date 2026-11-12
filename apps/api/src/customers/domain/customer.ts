/** ACTIVE customers can order; SUSPENDED ones can still sign in but not order. */
export const CUSTOMER_STATUSES = ['ACTIVE', 'SUSPENDED'] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

/** A bookstore La Livre sells to. Only customers created by La Livre can sign in. */
export interface Customer {
  id: string;
  /** Supabase Auth user id; null until the invitation is accepted by Supabase. */
  authUserId: string | null;
  /** Lowercase, trimmed. */
  email: string;
  businessName: string;
  /** CUIT, 11 digits without separators. */
  taxId: string | null;
  phone: string | null;
  status: CustomerStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewCustomer {
  email: string;
  businessName: string;
  taxId: string | null;
  phone: string | null;
}

export interface NewCustomerInput {
  email: string;
  businessName: string;
  taxId?: string;
  phone?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_BUSINESS_NAME_LENGTH = 200;
const MAX_PHONE_LENGTH = 32;
/** AFIP weights for the first ten CUIT digits. */
const CUIT_WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

/** Emails are compared case-insensitively: they are stored lowercase. */
export function normalizeEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    throw new RangeError(`Invalid email: "${value}"`);
  }
  return email;
}

/** Validates a CUIT (separators allowed) and returns its 11 digits. */
export function parseTaxId(value: string): string {
  const digits = value.trim().replace(/[\s.-]/g, '');
  if (!/^\d{11}$/.test(digits)) {
    throw new RangeError(`Invalid CUIT: "${value}" (expected 11 digits)`);
  }
  const sum = CUIT_WEIGHTS.reduce(
    (total, weight, index) => total + weight * Number(digits[index]),
    0,
  );
  const remainder = 11 - (sum % 11);
  const checkDigit = remainder === 11 ? 0 : remainder;
  if (checkDigit === 10 || checkDigit !== Number(digits[10])) {
    throw new RangeError(`Invalid CUIT: "${value}" (wrong check digit)`);
  }
  return digits;
}

/** Validates and normalizes a customer to create; throws RangeError when invalid. */
export function prepareNewCustomer(input: NewCustomerInput): NewCustomer {
  const businessName = input.businessName.trim();
  if (!businessName || businessName.length > MAX_BUSINESS_NAME_LENGTH) {
    throw new RangeError(
      `Invalid business name (1 to ${MAX_BUSINESS_NAME_LENGTH} characters)`,
    );
  }
  const taxId = input.taxId?.trim() ? parseTaxId(input.taxId) : null;
  const phone = input.phone?.trim() || null;
  if (phone && phone.length > MAX_PHONE_LENGTH) {
    throw new RangeError(
      `Invalid phone (up to ${MAX_PHONE_LENGTH} characters)`,
    );
  }
  return { email: normalizeEmail(input.email), businessName, taxId, phone };
}
