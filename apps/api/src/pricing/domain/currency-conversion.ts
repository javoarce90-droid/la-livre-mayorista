/**
 * Currency conversion with exact fixed-point arithmetic (BigInt), mirroring
 * offer-pricing.ts: amounts have two decimals, exchange rates up to four, and
 * results are rounded half up to whole minor units (cents).
 */
import type { DecimalValue } from './offer-pricing.js';

const RATE_DECIMALS = 4;
const RATE_SCALE = 10n ** BigInt(RATE_DECIMALS);
/** Matches the persisted `ExchangeRate.rate` column: Decimal(14, 4). */
const MAX_RATE_INTEGER_DIGITS = 10;

/**
 * Validates a manually entered exchange rate (units of the quote currency per
 * one unit of the base currency) and returns it with exactly four decimals.
 */
export function parseExchangeRate(value: string): string {
  const text = value.trim();
  const match = new RegExp(
    `^(\\d{1,${MAX_RATE_INTEGER_DIGITS}})(?:\\.(\\d{1,${RATE_DECIMALS}}))?$`,
  ).exec(text);
  if (!match) {
    throw new RangeError(
      `Invalid exchange rate: "${text}" (expected a positive decimal with up to ${RATE_DECIMALS} decimals)`,
    );
  }
  const fraction = (match[2] ?? '').padEnd(RATE_DECIMALS, '0');
  if (BigInt(match[1]) * RATE_SCALE + BigInt(fraction) === 0n) {
    throw new RangeError('Invalid exchange rate: must be greater than zero');
  }
  return `${BigInt(match[1]).toString()}.${fraction}`;
}

/** amount × rate, in whole minor units of the quote currency, rounded half up. */
export function convertToMinorUnits(
  amount: DecimalValue,
  rate: DecimalValue,
): bigint {
  const cents = toScaled(amount, 2, 'amount');
  const scaledRate = toScaled(rate, RATE_DECIMALS, 'exchange rate');
  return (cents * scaledRate * 2n + RATE_SCALE) / (RATE_SCALE * 2n);
}

function toScaled(value: DecimalValue, decimals: number, label: string) {
  const text =
    typeof value === 'string' ? value.trim() : value.toFixed(decimals);
  const match = new RegExp(`^(\\d+)(?:\\.(\\d{1,${decimals}}))?$`).exec(text);
  if (!match) {
    throw new RangeError(
      `Invalid ${label}: "${text}" (expected a non-negative decimal with up to ${decimals} decimals)`,
    );
  }
  return (
    BigInt(match[1]) * 10n ** BigInt(decimals) +
    BigInt((match[2] ?? '').padEnd(decimals, '0'))
  );
}
