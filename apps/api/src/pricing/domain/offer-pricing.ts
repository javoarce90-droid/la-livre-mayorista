/**
 * Cost and sale price of a supplier offer. Pure, exact fixed-point arithmetic:
 * amounts are handled as integer cents and percents as integer hundredths
 * (BigInt), and every result is rounded half up to cents. No float drift.
 *
 * Inputs accept decimal strings ("11.49") or Decimal-like values such as
 * `Prisma.Decimal` (anything with `toFixed`). Outputs are two-decimal strings.
 */

/** A decimal string or a Decimal-like value (e.g. `Prisma.Decimal`). */
export type DecimalValue = string | { toFixed(decimalPlaces: number): string };

/** Mirrors the persisted `PricingBasis` enum. */
export type PricingBasis =
  | 'ADJUSTMENT_ON_LIST_PRICE'
  | 'MARKUP_ON_COST'
  | 'MARGIN_ON_PRICE';

export interface PricingRuleTerms {
  basis: PricingBasis;
  percent: DecimalValue;
}

export interface UnitCostInput {
  /** Real net purchase cost, when a source provides it explicitly. */
  netCostAmount: DecimalValue | null;
  listPriceExcludingTax: DecimalValue | null;
  /** Publisher discount; takes precedence over the supplier one. */
  publisherDiscountPercent: DecimalValue | null;
  supplierDiscountPercent: DecimalValue | null;
}

/** 100% expressed in hundredths of a percent. */
const HUNDRED_PERCENT = 10_000n;

/**
 * Unit cost for La Livre: the explicit net cost when present, otherwise the
 * list price excluding tax minus the publisher discount (or, when the
 * publisher has none, the supplier discount). Null when it cannot be derived
 * (no list price, or no discount at all).
 */
export function computeUnitCost(input: UnitCostInput): string | null {
  if (input.netCostAmount !== null) {
    return formatCents(toCents(input.netCostAmount, 'net cost amount'));
  }
  if (input.listPriceExcludingTax === null) return null;
  const discount =
    input.publisherDiscountPercent ?? input.supplierDiscountPercent;
  if (discount === null) return null;

  const listCents = toCents(input.listPriceExcludingTax, 'list price amount');
  const discountHundredths = toHundredths(discount, 'discount percent');
  if (discountHundredths > HUNDRED_PERCENT) {
    throw new RangeError(`Invalid discount percent: above 100`);
  }
  return formatCents(
    divideHalfUp(
      listCents * (HUNDRED_PERCENT - discountHundredths),
      HUNDRED_PERCENT,
    ),
  );
}

export interface SalePriceInput {
  /** Unit cost (see `computeUnitCost`); used by the cost-based rules. */
  cost: DecimalValue | null;
  /** List price excluding tax; used by ADJUSTMENT_ON_LIST_PRICE. */
  listPriceExcludingTax: DecimalValue | null;
  /** Manual La Livre sale price; always wins when present. */
  override?: DecimalValue | null;
}

/**
 * Sale price from a pricing rule; a manual override always wins.
 * - ADJUSTMENT_ON_LIST_PRICE: list ex-tax × (1 + percent / 100), where
 *   percent may be negative (a reduction, above −100) or positive (a surcharge).
 * - MARKUP_ON_COST:  cost × (1 + percent / 100)
 * - MARGIN_ON_PRICE: cost / (1 − percent / 100)
 * Null when the input the rule needs is missing and there is no override.
 */
export function computeSalePrice(
  input: SalePriceInput,
  rule: PricingRuleTerms,
): string | null {
  if (input.override !== undefined && input.override !== null) {
    return formatCents(toCents(input.override, 'sale price override amount'));
  }

  if (rule.basis === 'ADJUSTMENT_ON_LIST_PRICE') {
    if (input.listPriceExcludingTax === null) return null;
    const listCents = toCents(input.listPriceExcludingTax, 'list price amount');
    const percent = toSignedHundredths(rule.percent, 'pricing rule percent');
    if (percent <= -HUNDRED_PERCENT) {
      throw new RangeError('Invalid adjustment percent: must be above -100');
    }
    return formatCents(
      divideHalfUp(listCents * (HUNDRED_PERCENT + percent), HUNDRED_PERCENT),
    );
  }

  if (input.cost === null) return null;
  const costCents = toCents(input.cost, 'cost amount');
  const percent = toHundredths(rule.percent, 'pricing rule percent');
  switch (rule.basis) {
    case 'MARKUP_ON_COST':
      return formatCents(
        divideHalfUp(costCents * (HUNDRED_PERCENT + percent), HUNDRED_PERCENT),
      );
    case 'MARGIN_ON_PRICE':
      if (percent >= HUNDRED_PERCENT) {
        throw new RangeError('Invalid margin percent: must be below 100');
      }
      return formatCents(
        divideHalfUp(costCents * HUNDRED_PERCENT, HUNDRED_PERCENT - percent),
      );
  }
}

/** Like `toHundredths`, but accepts a leading minus sign. */
function toSignedHundredths(value: DecimalValue, label: string): bigint {
  const text = typeof value === 'string' ? value.trim() : value.toFixed(2);
  return text.startsWith('-')
    ? -toFixedPoint(text.slice(1), label)
    : toFixedPoint(text, label);
}

/** Parses a non-negative decimal with at most two fractional digits. */
function toFixedPoint(value: DecimalValue, label: string): bigint {
  const text = typeof value === 'string' ? value.trim() : value.toFixed(2);
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) {
    throw new RangeError(
      `Invalid ${label}: "${text}" (expected a non-negative decimal with up to 2 decimals)`,
    );
  }
  return BigInt(match[1]) * 100n + BigInt((match[2] ?? '').padEnd(2, '0'));
}

const toCents = toFixedPoint;
const toHundredths = toFixedPoint;

/** Integer division of non-negative values, rounding half up. */
function divideHalfUp(numerator: bigint, denominator: bigint): bigint {
  return (numerator * 2n + denominator) / (denominator * 2n);
}

function formatCents(cents: bigint): string {
  const whole = cents / 100n;
  const fraction = (cents % 100n).toString().padStart(2, '0');
  return `${whole}.${fraction}`;
}
