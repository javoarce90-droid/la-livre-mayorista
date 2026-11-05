import type { PricingRuleTerms } from '../domain/offer-pricing.js';

export interface ActivePricingRule {
  name: string;
  basis: PricingRuleTerms['basis'];
  /** Two-decimal string, may be negative, e.g. "-5.00". */
  percent: string;
}

/** Writes pricing rules. Implemented by the Prisma adapter. */
export interface PricingRuleRepository {
  /**
   * Sets the terms of the rule called `name` (creating it if needed), makes
   * it the only active rule and returns it as persisted.
   */
  activateRule(rule: ActivePricingRule): Promise<ActivePricingRule>;
}
