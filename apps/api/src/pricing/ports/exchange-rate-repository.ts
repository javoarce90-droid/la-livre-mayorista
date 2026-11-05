export interface ExchangeRateRecord {
  baseCurrency: string;
  quoteCurrency: string;
  /** Four-decimal string, e.g. "1450.0000". */
  rate: string;
  effectiveFrom: Date;
}

export interface NewExchangeRate {
  baseCurrency: string;
  quoteCurrency: string;
  rate: string;
}

/** Appends manually set exchange rates. Implemented by the Prisma adapter. */
export interface ExchangeRateRepository {
  /** Stores a new rate effective now and returns it as persisted. */
  record(rate: NewExchangeRate): Promise<ExchangeRateRecord>;
}
