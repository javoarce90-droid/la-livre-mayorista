import { Prisma } from '../../generated/prisma/client.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaPricingRepository } from './prisma-pricing-repository.js';

function client(overrides: Record<string, unknown>) {
  return overrides as unknown as PrismaClient;
}

describe('PrismaPricingRepository', () => {
  it('appends an exchange rate and returns it with four decimals', async () => {
    const create = vi.fn(async () => ({
      baseCurrency: 'EUR',
      quoteCurrency: 'ARS',
      rate: new Prisma.Decimal('1450.5'),
      effectiveFrom: new Date('2026-11-05T12:00:00Z'),
    }));
    const repo = new PrismaPricingRepository(
      client({ exchangeRate: { create } }),
    );

    const stored = await repo.record({
      baseCurrency: 'EUR',
      quoteCurrency: 'ARS',
      rate: '1450.5000',
    });

    expect(create).toHaveBeenCalledWith({
      data: { baseCurrency: 'EUR', quoteCurrency: 'ARS', rate: '1450.5000' },
    });
    expect(stored).toEqual({
      baseCurrency: 'EUR',
      quoteCurrency: 'ARS',
      rate: '1450.5000',
      effectiveFrom: new Date('2026-11-05T12:00:00Z'),
    });
  });

  it('reads the latest rate already in effect for the pair', async () => {
    const at = new Date('2026-11-05T12:00:00Z');
    const findFirst = vi.fn(async () => ({
      baseCurrency: 'EUR',
      quoteCurrency: 'ARS',
      rate: new Prisma.Decimal('1500'),
      effectiveFrom: new Date('2026-11-01T00:00:00Z'),
    }));
    const repo = new PrismaPricingRepository(
      client({ exchangeRate: { findFirst } }),
    );

    const rate = await repo.latestExchangeRate({
      baseCurrency: 'EUR',
      quoteCurrency: 'ARS',
      at,
    });

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        baseCurrency: 'EUR',
        quoteCurrency: 'ARS',
        effectiveFrom: { lte: at },
      },
      orderBy: [{ effectiveFrom: 'desc' }, { id: 'desc' }],
    });
    expect(rate?.rate).toBe('1500.0000');
  });

  it('returns null when there is no rate', async () => {
    const repo = new PrismaPricingRepository(
      client({ exchangeRate: { findFirst: vi.fn(async () => null) } }),
    );
    expect(
      await repo.latestExchangeRate({
        baseCurrency: 'EUR',
        quoteCurrency: 'ARS',
        at: new Date(),
      }),
    ).toBeNull();
  });

  it('reads the active pricing rule', async () => {
    const findFirst = vi.fn(async () => ({
      basis: 'MARKUP_ON_COST',
      percent: new Prisma.Decimal('20'),
    }));
    const repo = new PrismaPricingRepository(
      client({ pricingRule: { findFirst } }),
    );

    const rule = await repo.activePricingRule();

    expect(findFirst).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { id: 'asc' },
      select: { basis: true, percent: true },
    });
    expect(rule?.basis).toBe('MARKUP_ON_COST');
    expect(rule?.percent).toEqual(new Prisma.Decimal('20'));
  });

  it('activates a rule by name in one transaction, deactivating the others', async () => {
    const tx = {
      pricingRule: {
        updateMany: vi.fn(async () => ({ count: 1 })),
        upsert: vi.fn(async () => ({
          name: 'default',
          basis: 'ADJUSTMENT_ON_LIST_PRICE',
          percent: new Prisma.Decimal('-5'),
        })),
      },
    };
    const transaction = vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx));
    const repo = new PrismaPricingRepository(
      client({ $transaction: transaction }),
    );

    const stored = await repo.activateRule({
      name: 'default',
      basis: 'ADJUSTMENT_ON_LIST_PRICE',
      percent: '-5.00',
    });

    expect(transaction).toHaveBeenCalledOnce();
    expect(tx.pricingRule.updateMany).toHaveBeenCalledWith({
      where: { isActive: true, name: { not: 'default' } },
      data: { isActive: false },
    });
    expect(tx.pricingRule.upsert).toHaveBeenCalledWith({
      where: { name: 'default' },
      create: {
        name: 'default',
        basis: 'ADJUSTMENT_ON_LIST_PRICE',
        percent: '-5.00',
        isActive: true,
      },
      update: {
        basis: 'ADJUSTMENT_ON_LIST_PRICE',
        percent: '-5.00',
        isActive: true,
      },
      select: { name: true, basis: true, percent: true },
    });
    expect(stored).toEqual({
      name: 'default',
      basis: 'ADJUSTMENT_ON_LIST_PRICE',
      percent: '-5.00',
    });
  });
});
