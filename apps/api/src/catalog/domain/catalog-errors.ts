export type CatalogUnavailableReason =
  | 'exchange_rate_missing'
  | 'pricing_rule_missing';

/** The catalog cannot be priced, so it must not be shown at all. */
export class CatalogUnavailableError extends Error {
  constructor(readonly reason: CatalogUnavailableReason) {
    super(
      reason === 'exchange_rate_missing'
        ? 'No exchange rate is configured: run pricing:set-rate.'
        : 'No active pricing rule is configured.',
    );
    this.name = 'CatalogUnavailableError';
  }
}
