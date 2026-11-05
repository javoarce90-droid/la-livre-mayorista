import type { CatalogBook } from '../domain/catalog-book.js';

/**
 * Public book contract. Cost and margin are deliberately absent: customers
 * must never see them.
 */
export interface BookDto {
  isbn: string;
  title: string;
  /** Authors in sequence order, joined with "; " ("" when unknown). */
  author: string;
  publisher: string;
  year: number | null;
  language: string | null;
  pages: number | null;
  description: string | null;
  coverUrl: string | null;
  /** Price in whole cents of `currency`, as a JSON integer. */
  priceCents: number;
  currency: string;
  /** ISO 8601 date-time of the supplier feed the price comes from. */
  priceUpdatedAt: string;
}

export interface BookPageDto {
  items: BookDto[];
  total: number;
}

export interface CatalogFacetsDto {
  publishers: string[];
}

export function toBookDto(book: CatalogBook): BookDto {
  if (book.priceCents > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError(`Price of ${book.isbn} is not a JSON-safe integer`);
  }
  return {
    isbn: book.isbn,
    title: book.title,
    author: book.author,
    publisher: book.publisher,
    year: book.year,
    language: book.language,
    pages: book.pages,
    description: book.description,
    coverUrl: book.coverUrl,
    priceCents: Number(book.priceCents),
    currency: book.currency,
    priceUpdatedAt: book.priceUpdatedAt.toISOString(),
  };
}
