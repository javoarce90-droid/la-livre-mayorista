import { parseExchangeRate } from '../domain/currency-conversion.js';
import type {
  ExchangeRateRecord,
  ExchangeRateRepository,
  NewExchangeRate,
} from '../ports/exchange-rate-repository.js';

export const DEFAULT_BASE_CURRENCY = 'EUR';
export const DEFAULT_QUOTE_CURRENCY = 'ARS';

export interface SetExchangeRateInput {
  rate: string;
  /** Base currency (ISO 4217); defaults to EUR. */
  from?: string;
  /** Quote currency (ISO 4217); defaults to ARS. */
  to?: string;
}

/** Validates and appends a manually set exchange rate, effective now. */
export async function setExchangeRate(
  repository: ExchangeRateRepository,
  input: SetExchangeRateInput,
): Promise<ExchangeRateRecord> {
  return repository.record(prepareExchangeRate(input));
}

/** Validates and normalizes the input; throws RangeError when invalid. */
export function prepareExchangeRate(
  input: SetExchangeRateInput,
): NewExchangeRate {
  const baseCurrency = currencyCode(input.from ?? DEFAULT_BASE_CURRENCY);
  const quoteCurrency = currencyCode(input.to ?? DEFAULT_QUOTE_CURRENCY);
  if (baseCurrency === quoteCurrency) {
    throw new RangeError('Base and quote currencies must differ');
  }
  return { baseCurrency, quoteCurrency, rate: parseExchangeRate(input.rate) };
}

function currencyCode(value: string): string {
  const code = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) {
    throw new RangeError(
      `Invalid currency code: "${value}" (expected ISO 4217, e.g. EUR)`,
    );
  }
  return code;
}
