import type { CatalogBookRecord, PricingContext } from './catalog-book.js';
import { formatAuthors, priceCatalogBook } from './catalog-book.js';

const context: PricingContext = {
  rule: { basis: 'ADJUSTMENT_ON_LIST_PRICE', percent: '0.00' },
  exchangeRate: { baseCurrency: 'EUR', quoteCurrency: 'ARS', rate: '1738.0000' },
};

function record(overrides: Partial<CatalogBookRecord> = {}): CatalogBookRecord {
  return {
    isbn: '9788466331234',
    title: 'Ficciones',
    publishedOn: new Date('2011-03-01T00:00:00Z'),
    languageCode: 'spa',
    pageCount: 224,
    description: 'Cuentos.',
    coverUrl: 'https://example.com/cover.jpg',
    publisher: 'Debolsillo',
    authors: ['Borges, Jorge Luis'],
    offer: {
      currencyCode: 'EUR',
      netCostAmount: null,
      listPriceExcludingTax: '10.00',
      salePriceOverride: null,
      publisherDiscountPercent: '35.00',
      supplierDiscountPercent: null,
      sourceSentAt: new Date('2026-11-04T08:00:00Z'),
    },
    ...overrides,
  };
}

describe('priceCatalogBook', () => {
  it('sells at the adjusted list price ex-tax in ARS; cost and margin stay internal', () => {
    // Worked example: list €10.00 ex-tax, Debolsillo 35%, rule 0%, rate 1738.
    // sale = 10.00 EUR → $17,380.00; cost = 6.50 EUR → $11,297.00;
    // margin = $6,083.00.
    const book = priceCatalogBook(record(), context);

    expect(book).toEqual({
      isbn: '9788466331234',
      title: 'Ficciones',
      author: 'Borges, Jorge Luis',
      publisher: 'Debolsillo',
      year: 2011,
      language: 'spa',
      pages: 224,
      description: 'Cuentos.',
      coverUrl: 'https://example.com/cover.jpg',
      priceCents: 1_738_000n,
      costCents: 1_129_700n,
      marginCents: 608_300n,
      currency: 'ARS',
      priceUpdatedAt: new Date('2026-11-04T08:00:00Z'),
    });
  });

  it('applies a negative adjustment on the list price', () => {
    const book = priceCatalogBook(record(), {
      ...context,
      rule: { basis: 'ADJUSTMENT_ON_LIST_PRICE', percent: '-10.00' },
    });
    // 10.00 × 0.90 = 9.00 EUR × 1738 = $15,642.00.
    expect(book?.priceCents).toBe(1_564_200n);
    expect(book?.marginCents).toBe(434_500n);
  });

  it('uses the manual sale price override when present', () => {
    const book = priceCatalogBook(
      record({ offer: { ...record().offer, salePriceOverride: '9.99' } }),
      context,
    );
    expect(book?.priceCents).toBe(1_736_262n);
  });

  it('prices from the override even without a list price; cost then unknown', () => {
    const offer = {
      ...record().offer,
      listPriceExcludingTax: null,
      salePriceOverride: '1.00',
    };
    expect(priceCatalogBook(record({ offer }), context)).toMatchObject({
      priceCents: 173_800n,
      costCents: null,
      marginCents: null,
    });
  });

  it('rounds the converted price half up to whole cents', () => {
    const book = priceCatalogBook(
      record({ offer: { ...record().offer, salePriceOverride: '0.01' } }),
      { ...context, exchangeRate: { ...context.exchangeRate, rate: '0.5000' } },
    );
    expect(book?.priceCents).toBe(1n);
  });

  it('returns null when no price can be computed (net cost alone is not enough)', () => {
    const offer = {
      ...record().offer,
      listPriceExcludingTax: null,
      netCostAmount: '6.50',
    };
    expect(priceCatalogBook(record({ offer }), context)).toBeNull();
  });

  it('returns null when the offer currency is not the rate base currency', () => {
    const offer = { ...record().offer, currencyCode: 'USD' };
    expect(priceCatalogBook(record({ offer }), context)).toBeNull();
  });

  it('keeps missing optional data as null', () => {
    const book = priceCatalogBook(
      record({
        publishedOn: null,
        languageCode: null,
        pageCount: null,
        description: null,
        coverUrl: null,
        authors: [],
      }),
      context,
    );
    expect(book).toMatchObject({
      author: '',
      year: null,
      language: null,
      pages: null,
      description: null,
      coverUrl: null,
    });
  });
});

describe('formatAuthors', () => {
  it('joins authors in sequence order with "; "', () => {
    expect(formatAuthors(['Bioy Casares, Adolfo', 'Borges, Jorge Luis'])).toBe(
      'Bioy Casares, Adolfo; Borges, Jorge Luis',
    );
  });
});
