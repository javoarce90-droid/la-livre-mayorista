import type { Mock } from 'vitest';
import type { PricingSettingsRepository } from '../../pricing/ports/pricing-settings-repository.js';
import type { CatalogBookRecord } from '../domain/catalog-book.js';
import { CatalogUnavailableError } from '../domain/catalog-errors.js';
import type { CatalogSearchCriteria } from '../domain/search-criteria.js';
import type { CatalogBookRepository } from '../ports/catalog-book-repository.js';
import {
  getCatalogBook,
  listCatalogPublishers,
  searchCatalogBooks,
} from './catalog-queries.js';

const NOW = new Date('2026-11-05T12:00:00Z');

/** Ports with every method as a mock property (no unbound-method noise). */
type Mocked<T> = {
  [K in keyof T]: T[K] extends (...args: never[]) => unknown ? Mock<T[K]> : never;
};

function record(isbn: string, listPrice: string | null): CatalogBookRecord {
  return {
    isbn,
    title: `Libro ${isbn}`,
    publishedOn: null,
    languageCode: 'spa',
    pageCount: null,
    description: null,
    coverUrl: null,
    publisher: 'Paidós',
    authors: ['Autor, Uno'],
    offer: {
      currencyCode: 'EUR',
      netCostAmount: null,
      listPriceExcludingTax: listPrice,
      salePriceOverride: null,
      publisherDiscountPercent: '50.00',
      supplierDiscountPercent: null,
      sourceSentAt: NOW,
    },
  };
}

function pricing(
  overrides: Partial<Mocked<PricingSettingsRepository>> = {},
): Mocked<PricingSettingsRepository> {
  return {
    activePricingRule: vi.fn(async () => ({
      basis: 'ADJUSTMENT_ON_LIST_PRICE' as const,
      percent: '0.00',
    })),
    latestExchangeRate: vi.fn(async () => ({
      baseCurrency: 'EUR',
      quoteCurrency: 'ARS',
      rate: '1000.0000',
      effectiveFrom: NOW,
    })),
    ...overrides,
  };
}

function books(
  overrides: Partial<Mocked<CatalogBookRepository>> = {},
): Mocked<CatalogBookRepository> {
  return {
    search: vi.fn(async () => ({
      records: [record('1', '10.00'), record('2', null)],
      total: 2,
    })),
    findByIsbn: vi.fn(async () => record('1', '10.00')),
    sellablePublishers: vi.fn(async () => ['Paidós', 'Anagrama', 'Ática']),
    ...overrides,
  };
}

const criteria: CatalogSearchCriteria = {
  words: ['borges'],
  authorWords: [],
  publisherWords: [],
  offset: 0,
  limit: 20,
};

describe('searchCatalogBooks', () => {
  it('prices each record in ARS with the latest EUR → ARS rate in effect now', async () => {
    const deps = { books: books(), pricing: pricing(), now: () => NOW };

    const page = await searchCatalogBooks(deps, criteria);

    expect(deps.books.search).toHaveBeenCalledWith(criteria);
    expect(deps.pricing.latestExchangeRate).toHaveBeenCalledWith({
      baseCurrency: 'EUR',
      quoteCurrency: 'ARS',
      at: NOW,
    });
    // Sale = list 10.00 EUR (0% adjustment) × 1000 = 10 000.00 ARS.
    expect(page.items[0]).toMatchObject({
      isbn: '1',
      priceCents: 1_000_000n,
      currency: 'ARS',
    });
    expect(page.total).toBe(2);
  });

  it('drops records that cannot be priced (defensive: storage already filters them)', async () => {
    const deps = { books: books(), pricing: pricing(), now: () => NOW };

    const page = await searchCatalogBooks(deps, criteria);

    expect(page.items.map((b) => b.isbn)).toEqual(['1']);
  });

  it('fails with exchange_rate_missing before searching when there is no rate', async () => {
    const deps = {
      books: books(),
      pricing: pricing({ latestExchangeRate: vi.fn(async () => null) }),
      now: () => NOW,
    };

    await expect(searchCatalogBooks(deps, criteria)).rejects.toEqual(
      new CatalogUnavailableError('exchange_rate_missing'),
    );
    expect(deps.books.search).not.toHaveBeenCalled();
  });

  it('fails with pricing_rule_missing when no rule is active', async () => {
    const deps = {
      books: books(),
      pricing: pricing({ activePricingRule: vi.fn(async () => null) }),
      now: () => NOW,
    };

    await expect(searchCatalogBooks(deps, criteria)).rejects.toMatchObject({
      reason: 'pricing_rule_missing',
    });
  });
});

describe('getCatalogBook', () => {
  it('returns the priced book', async () => {
    const deps = { books: books(), pricing: pricing(), now: () => NOW };
    expect((await getCatalogBook(deps, '1'))?.priceCents).toBe(1_000_000n);
  });

  it('returns null for unknown or unpriceable books', async () => {
    const unknown = {
      books: books({ findByIsbn: vi.fn(async () => null) }),
      pricing: pricing(),
      now: () => NOW,
    };
    expect(await getCatalogBook(unknown, '9')).toBeNull();

    const unpriced = {
      books: books({ findByIsbn: vi.fn(async () => record('2', null)) }),
      pricing: pricing(),
      now: () => NOW,
    };
    expect(await getCatalogBook(unpriced, '2')).toBeNull();
  });

  it('requires an exchange rate', async () => {
    const deps = {
      books: books(),
      pricing: pricing({ latestExchangeRate: vi.fn(async () => null) }),
      now: () => NOW,
    };
    await expect(getCatalogBook(deps, '1')).rejects.toBeInstanceOf(
      CatalogUnavailableError,
    );
  });
});

describe('listCatalogPublishers', () => {
  it('sorts brands alphabetically, ignoring accents and case', async () => {
    expect(await listCatalogPublishers(books())).toEqual([
      'Anagrama',
      'Ática',
      'Paidós',
    ]);
  });
});
