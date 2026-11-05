import type { PricingRuleTerms } from '../domain/offer-pricing.js';
import type { ExchangeRateRecord } from './exchange-rate-repository.js';

/** Reads the pricing configuration that applies at read time. */
export interface PricingSettingsRepository {
  /** The active pricing rule, or null when none is active. */
  activePricingRule(): Promise<PricingRuleTerms | null>;
  /** Latest rate of the pair with `effectiveFrom` ≤ `at`, or null. */
  latestExchangeRate(pair: {
    baseCurrency: string;
    quoteCurrency: string;
    at: Date;
  }): Promise<ExchangeRateRecord | null>;
}
