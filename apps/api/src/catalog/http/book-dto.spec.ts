import type { CatalogBook } from '../domain/catalog-book.js';
import { toBookDto } from './book-dto.js';

const book: CatalogBook = {
  isbn: '9788466331234',
  title: 'Ficciones',
  author: 'Borges, Jorge Luis',
  publisher: 'Debolsillo',
  year: 2011,
  language: 'spa',
  pages: 224,
  description: null,
  coverUrl: null,
  priceCents: 1_170_000n,
  costCents: 900_000n,
  marginCents: 270_000n,
  currency: 'ARS',
  priceUpdatedAt: new Date('2026-11-04T08:00:00Z'),
};

describe('toBookDto', () => {
  it('serializes the price as an integer number of cents and the date as ISO', () => {
    const dto = toBookDto(book);

    expect(dto.priceCents).toBe(1_170_000);
    expect(dto.priceUpdatedAt).toBe('2026-11-04T08:00:00.000Z');
    expect(JSON.parse(JSON.stringify(dto))).toEqual(dto);
    // Customers must never see cost or margin.
    expect(dto).not.toHaveProperty('costCents');
    expect(dto).not.toHaveProperty('marginCents');
  });

  it('refuses prices that do not fit a JSON-safe integer', () => {
    expect(() =>
      toBookDto({ ...book, priceCents: BigInt(Number.MAX_SAFE_INTEGER) + 1n }),
    ).toThrow(RangeError);
  });
});
