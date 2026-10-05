import type { OnixProduct } from '../onix/onix-product.js';
import type { CatalogEntry } from './catalog-entry.js';
import { mapOnixProduct, parseOnixDate } from './map-onix-product.js';

function product(overrides: Partial<OnixProduct> = {}): OnixProduct {
  return {
    recordReference: '9788466359207',
    isbn13: '9788466359207',
    productForm: 'BC',
    title: 'CIEN AÑOS DE SOLEDAD',
    contributors: [
      { sequenceNumber: '1', role: 'A01', name: 'GARCÍA MÁRQUEZ, GABRIEL' },
      { sequenceNumber: '2', role: 'B06', name: 'PÉREZ, ANA' },
    ],
    languageCode: 'spa',
    pageCount: '496',
    measures: [
      { type: '01', value: '190', unit: 'mm' },
      { type: '02', value: '125', unit: 'mm' },
      { type: '08', value: '230', unit: 'gr' },
    ],
    imprintName: 'DEBOLSILLO',
    publisherCode: 'J70',
    publisherName: 'DEBOLSILLO',
    publishingStatus: '04',
    publicationDate: '20220317',
    description: '<p>Una saga</p>',
    coverUrl: 'https://static.example.com/c.jpg',
    availabilityCode: '20',
    prices: [
      {
        type: '01',
        amount: '9.80',
        taxRatePercent: '0.00',
        currencyCode: 'GBP',
      },
      { type: '01', amount: '11.49', taxRatePercent: '4', currencyCode: 'EUR' },
      { type: '02', amount: '11.95', taxRatePercent: '4', currencyCode: 'EUR' },
      {
        type: '03',
        amount: '11.49',
        taxRatePercent: null,
        currencyCode: 'EUR',
      },
    ],
    ...overrides,
  };
}

function mapped(overrides: Partial<OnixProduct> = {}): CatalogEntry {
  const result = mapOnixProduct(product(overrides));
  if (!result.ok) throw new Error(`unexpected skip: ${result.reason}`);
  return result.entry;
}

describe('mapOnixProduct', () => {
  it('maps a complete product to a catalog entry with typed values', () => {
    expect(mapped()).toEqual<CatalogEntry>({
      isbn13: '9788466359207',
      title: 'CIEN AÑOS DE SOLEDAD',
      publisher: { code: 'J70', name: 'DEBOLSILLO' },
      imprintName: 'DEBOLSILLO',
      productForm: 'BC',
      languageCode: 'spa',
      pageCount: 496,
      heightMm: 190,
      widthMm: 125,
      weightGrams: 230,
      publishingStatus: '04',
      publishedOn: '2022-03-17',
      description: '<p>Una saga</p>',
      coverUrl: 'https://static.example.com/c.jpg',
      contributors: [
        { sequence: 1, roleCode: 'A01', name: 'GARCÍA MÁRQUEZ, GABRIEL' },
        { sequence: 2, roleCode: 'B06', name: 'PÉREZ, ANA' },
      ],
      offer: {
        recordReference: '9788466359207',
        availabilityCode: '20',
        currencyCode: 'EUR',
        listPriceExcludingTax: '11.49',
        listPriceIncludingTax: '11.95',
        fixedPriceExcludingTax: '11.49',
        taxRatePercent: '4.00',
      },
    });
  });

  it('skips products without a valid ISBN-13 or without a title', () => {
    expect(mapOnixProduct(product({ isbn13: null }))).toEqual({
      ok: false,
      reason: 'missing-isbn',
    });
    expect(mapOnixProduct(product({ isbn13: '978846635920X' }))).toEqual({
      ok: false,
      reason: 'missing-isbn',
    });
    expect(mapOnixProduct(product({ title: null }))).toEqual({
      ok: false,
      reason: 'missing-title',
    });
  });

  it('normalises a hyphenated ISBN', () => {
    expect(mapped({ isbn13: '978-84-663-5920-7' }).isbn13).toBe(
      '9788466359207',
    );
  });

  it('turns missing or invalid optional values into nulls', () => {
    const entry = mapped({
      productForm: 'TOOLONG',
      languageCode: null,
      pageCount: 'abc',
      measures: [
        { type: '01', value: '0', unit: 'mm' },
        { type: '02', value: '12', unit: 'in' },
        { type: '08', value: 'x', unit: 'gr' },
      ],
      publisherCode: null,
      publishingStatus: '123',
      publicationDate: '20221345',
      description: null,
      coverUrl: null,
      imprintName: null,
    });

    expect(entry).toMatchObject({
      productForm: null,
      languageCode: null,
      pageCount: null,
      heightMm: null,
      widthMm: null,
      weightGrams: null,
      publisher: null,
      publishingStatus: null,
      publishedOn: null,
      description: null,
      coverUrl: null,
      imprintName: null,
    });
  });

  it('converts centimetres and kilograms', () => {
    const entry = mapped({
      measures: [
        { type: '01', value: '21.5', unit: 'cm' },
        { type: '08', value: '1.2', unit: 'kg' },
      ],
    });

    expect(entry).toMatchObject({ heightMm: 215, weightGrams: 1200 });
  });

  it('falls back to the publisher code as its name', () => {
    expect(mapped({ publisherName: null }).publisher).toEqual({
      code: 'J70',
      name: 'J70',
    });
  });

  it('only keeps EUR prices and nulls invalid amounts', () => {
    const entry = mapped({
      prices: [
        {
          type: '01',
          amount: '9.80',
          taxRatePercent: '0',
          currencyCode: 'GBP',
        },
        { type: '02', amount: 'n/a', taxRatePercent: '4', currencyCode: 'EUR' },
        {
          type: '03',
          amount: '7.125',
          taxRatePercent: null,
          currencyCode: 'eur',
        },
      ],
    });

    expect(entry.offer).toEqual({
      recordReference: '9788466359207',
      availabilityCode: '20',
      currencyCode: 'EUR',
      listPriceExcludingTax: null,
      listPriceIncludingTax: null,
      fixedPriceExcludingTax: '7.13',
      taxRatePercent: null,
    });
  });

  it('has no offer without a valid availability code', () => {
    expect(mapped({ availabilityCode: null }).offer).toBeNull();
    expect(mapped({ availabilityCode: '123' }).offer).toBeNull();
  });

  it('uses the ISBN as record reference when the feed has none', () => {
    expect(mapped({ recordReference: null }).offer?.recordReference).toBe(
      '9788466359207',
    );
  });

  it('drops nameless or role-less contributors and resolves duplicate or missing sequence numbers', () => {
    const entry = mapped({
      contributors: [
        { sequenceNumber: '2', role: 'A01', name: 'B' },
        { sequenceNumber: '2', role: 'A12', name: 'C' },
        { sequenceNumber: null, role: 'B06', name: 'D' },
        { sequenceNumber: '1', role: 'A01', name: null },
        { sequenceNumber: '5', role: null, name: 'E' },
      ],
    });

    expect(entry.contributors).toEqual([
      { sequence: 2, roleCode: 'A01', name: 'B' },
      { sequence: 3, roleCode: 'A12', name: 'C' },
      { sequence: 4, roleCode: 'B06', name: 'D' },
    ]);
  });
});

describe('parseOnixDate', () => {
  it.each([
    ['20260901', '2026-09-01'],
    ['20260901T1030', '2026-09-01'],
    ['2026-09-01', '2026-09-01'],
    ['20260230', null],
    ['2026', null],
    [null, null],
  ])('parses %s as %s', (input, expected) => {
    expect(parseOnixDate(input)).toBe(expected);
  });
});
