import type { PrismaClient } from '../../generated/prisma/client.js';
import type { PricingRuleTerms } from '../domain/offer-pricing.js';
import type {
  ExchangeRateRecord,
  ExchangeRateRepository,
  NewExchangeRate,
} from '../ports/exchange-rate-repository.js';
import type {
  ActivePricingRule,
  PricingRuleRepository,
} from '../ports/pricing-rule-repository.js';
import type { PricingSettingsRepository } from '../ports/pricing-settings-repository.js';

type PricingClient = Pick<
  PrismaClient,
  'exchangeRate' | 'pricingRule' | '$transaction'
>;

interface ExchangeRateRow {
  baseCurrency: string;
  quoteCurrency: string;
  rate: { toFixed(decimalPlaces: number): string };
  effectiveFrom: Date;
}

/** Prisma adapter for exchange rates and pricing rules. */
export class PrismaPricingRepository
  implements
    ExchangeRateRepository,
    PricingSettingsRepository,
    PricingRuleRepository
{
  constructor(private readonly prisma: PricingClient) {}

  async record(rate: NewExchangeRate): Promise<ExchangeRateRecord> {
    const row = await this.prisma.exchangeRate.create({ data: { ...rate } });
    return toRecord(row);
  }

  async latestExchangeRate(pair: {
    baseCurrency: string;
    quoteCurrency: string;
    at: Date;
  }): Promise<ExchangeRateRecord | null> {
    const row = await this.prisma.exchangeRate.findFirst({
      where: {
        baseCurrency: pair.baseCurrency,
        quoteCurrency: pair.quoteCurrency,
        effectiveFrom: { lte: pair.at },
      },
      orderBy: [{ effectiveFrom: 'desc' }, { id: 'desc' }],
    });
    return row ? toRecord(row) : null;
  }

  async activePricingRule(): Promise<PricingRuleTerms | null> {
    return this.prisma.pricingRule.findFirst({
      where: { isActive: true },
      orderBy: { id: 'asc' },
      select: { basis: true, percent: true },
    });
  }

  async activateRule(rule: ActivePricingRule): Promise<ActivePricingRule> {
    const terms = { basis: rule.basis, percent: rule.percent, isActive: true };
    const stored = await this.prisma.$transaction(async (tx) => {
      await tx.pricingRule.updateMany({
        where: { isActive: true, name: { not: rule.name } },
        data: { isActive: false },
      });
      return tx.pricingRule.upsert({
        where: { name: rule.name },
        create: { name: rule.name, ...terms },
        update: terms,
        select: { name: true, basis: true, percent: true },
      });
    });
    return { ...stored, percent: stored.percent.toFixed(2) };
  }
}

function toRecord(row: ExchangeRateRow): ExchangeRateRecord {
  return {
    baseCurrency: row.baseCurrency,
    quoteCurrency: row.quoteCurrency,
    rate: row.rate.toFixed(4),
    effectiveFrom: row.effectiveFrom,
  };
}
