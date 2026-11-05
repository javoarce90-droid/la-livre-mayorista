import { Prisma } from '../../generated/prisma/client.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { CatalogBookRecord } from '../domain/catalog-book.js';
import { CATALOG_SOURCE_CURRENCY } from '../domain/catalog-book.js';
import type { CatalogSearchCriteria } from '../domain/search-criteria.js';
import type { CatalogBookRepository } from '../ports/catalog-book-repository.js';

/** ONIX List 65: "20" Available, "21" In stock. Everything else is hidden. */
const AVAILABLE_CODES = ['20', '21'];
const AUTHOR_ROLE = 'A01';

/**
 * Same rules as `sellableOfferSql`, for Prisma queries. A price needs the list
 * price excluding tax (ADJUSTMENT_ON_LIST_PRICE) or a manual override; a net
 * cost alone is not enough, so such offers are hidden and never counted.
 */
export const SELLABLE_OFFER_WHERE = {
  availabilityCode: { in: AVAILABLE_CODES },
  currencyCode: CATALOG_SOURCE_CURRENCY,
  OR: [
    { listPriceExcludingTax: { not: null } },
    { salePriceOverride: { not: null } },
  ],
} satisfies Prisma.SupplierOfferWhereInput;

/**
 * Accent folding done with built-in `translate` (no `unaccent` extension, so
 * no dependency on where Supabase installs it). Upper-case accented letters
 * are listed too because `lower` only folds ASCII under a C locale.
 */
const ACCENT_PAIRS: [string, string][] = [
  ['áàâäãåÁÀÂÄÃÅ', 'a'],
  ['éèêëÉÈÊË', 'e'],
  ['íìîïÍÌÎÏ', 'i'],
  ['óòôöõøÓÒÔÖÕØ', 'o'],
  ['úùûüÚÙÛÜ', 'u'],
  ['ñÑ', 'n'],
  ['çÇ', 'c'],
];
const ACCENTED = ACCENT_PAIRS.map(([chars]) => chars).join('');
const PLAIN = ACCENT_PAIRS.map(([chars, plain]) =>
  // Every accented character here is a single UTF-16 code unit.
  plain.repeat(chars.length),
).join('');

// Static literals (no quotes inside), inlined to keep the SQL readable.
const TRANSLATE_ARGS = Prisma.raw(`'${ACCENTED}', '${PLAIN}'`);

const normalized = (expression: Prisma.Sql) =>
  Prisma.sql`translate(lower(${expression}), ${TRANSLATE_ARGS})`;

const BRAND = Prisma.raw('COALESCE(p."brand", p."name")');
const AUTHOR_NAMES = Prisma.raw('a."names"');
const KEYWORD_HAYSTACK = Prisma.raw(
  `concat_ws(' ', b."title", a."names", b."isbn13", COALESCE(p."brand", p."name"))`,
);

const escapeLike = (word: string) => word.replace(/[\\%_]/g, '\\$&');

/** `haystack` contains every word, case- and accent-insensitively. */
function containsAll(haystack: Prisma.Sql, words: string[]): Prisma.Sql[] {
  return words.map(
    (word) =>
      Prisma.sql`${normalized(haystack)} LIKE '%' || ${normalized(Prisma.sql`${escapeLike(word)}::text`)} || '%'`,
  );
}

function sellableOfferSql(bookId: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`EXISTS (SELECT 1 FROM "SupplierOffer" o
    WHERE o."bookId" = ${bookId}
      AND o."availabilityCode" IN (${Prisma.join(AVAILABLE_CODES)})
      AND o."currencyCode" = ${CATALOG_SOURCE_CURRENCY}
      AND (o."listPriceExcludingTax" IS NOT NULL OR o."salePriceOverride" IS NOT NULL))`;
}

const BOOK_SELECT = {
  id: true,
  isbn13: true,
  title: true,
  publishedOn: true,
  languageCode: true,
  pageCount: true,
  description: true,
  coverUrl: true,
  publisher: {
    select: { brand: true, name: true, listPriceDiscountPercent: true },
  },
  contributors: {
    where: { roleCode: AUTHOR_ROLE },
    orderBy: { sequence: 'asc' },
    select: { name: true },
  },
  offers: {
    where: SELLABLE_OFFER_WHERE,
    orderBy: { supplierId: 'asc' },
    take: 1,
    select: {
      currencyCode: true,
      netCostAmount: true,
      listPriceExcludingTax: true,
      salePriceOverride: true,
      sourceSentAt: true,
      supplier: { select: { listPriceDiscountPercent: true } },
    },
  },
} satisfies Prisma.BookSelect;

type BookRow = Prisma.BookGetPayload<{ select: typeof BOOK_SELECT }>;

type CatalogClient = Pick<PrismaClient, '$queryRaw' | 'book'>;

/**
 * Prisma adapter of `CatalogBookRepository`: filtering and paging in SQL,
 * then the page is loaded with Prisma. Prices are computed by the caller.
 */
export class PrismaCatalogBookRepository implements CatalogBookRepository {
  constructor(private readonly prisma: CatalogClient) {}

  async search(
    criteria: CatalogSearchCriteria,
  ): Promise<{ records: CatalogBookRecord[]; total: number }> {
    const from = this.searchFrom(criteria);
    const [page, [{ total }]] = await Promise.all([
      this.prisma.$queryRaw<{ id: number }[]>(Prisma.sql`
        SELECT b."id" ${from}
        ORDER BY ${normalized(Prisma.raw('b."title"'))}, b."id"
        OFFSET ${criteria.offset} LIMIT ${criteria.limit}`),
      this.prisma.$queryRaw<{ total: number }[]>(Prisma.sql`
        SELECT count(*)::int AS "total" ${from}`),
    ]);
    if (page.length === 0) return { records: [], total };

    const ids = page.map((row) => row.id);
    const rows = await this.prisma.book.findMany({
      where: { id: { in: ids } },
      select: BOOK_SELECT,
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    const records = ids.flatMap((id) => {
      const row = byId.get(id);
      const record = row ? toRecord(row) : null;
      return record ? [record] : [];
    });
    return { records, total };
  }

  async findByIsbn(isbn: string): Promise<CatalogBookRecord | null> {
    const row = await this.prisma.book.findFirst({
      where: {
        isbn13: isbn,
        publisher: { listPriceDiscountPercent: { not: null } },
        offers: { some: SELLABLE_OFFER_WHERE },
      },
      select: BOOK_SELECT,
    });
    return row ? toRecord(row) : null;
  }

  async sellablePublishers(): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ brand: string }[]>(Prisma.sql`
      SELECT DISTINCT COALESCE(p."brand", p."name") AS "brand"
      FROM "Publisher" p
      WHERE p."listPriceDiscountPercent" IS NOT NULL
        AND EXISTS (SELECT 1 FROM "Book" b
          WHERE b."publisherId" = p."id" AND ${sellableOfferSql(Prisma.raw('b."id"'))})`);
    return rows.map((row) => row.brand);
  }

  private searchFrom(criteria: CatalogSearchCriteria): Prisma.Sql {
    const needsAuthors =
      criteria.words.length > 0 || criteria.authorWords.length > 0;
    const authorsJoin = needsAuthors
      ? Prisma.sql`LEFT JOIN LATERAL (
          SELECT string_agg(c."name", ' ' ORDER BY c."sequence") AS "names"
          FROM "BookContributor" c
          WHERE c."bookId" = b."id" AND c."roleCode" = 'A01'
        ) a ON true`
      : Prisma.empty;
    const conditions = [
      Prisma.sql`p."listPriceDiscountPercent" IS NOT NULL`,
      sellableOfferSql(Prisma.raw('b."id"')),
      ...containsAll(KEYWORD_HAYSTACK, criteria.words),
      ...containsAll(AUTHOR_NAMES, criteria.authorWords),
      ...containsAll(BRAND, criteria.publisherWords),
    ];
    return Prisma.sql`FROM "Book" b
      JOIN "Publisher" p ON p."id" = b."publisherId"
      ${authorsJoin}
      WHERE ${Prisma.join(conditions, ' AND ')}`;
  }
}

function toRecord(row: BookRow): CatalogBookRecord | null {
  const [offer] = row.offers;
  if (!offer || !row.publisher) return null;
  return {
    isbn: row.isbn13,
    title: row.title,
    publishedOn: row.publishedOn,
    languageCode: row.languageCode,
    pageCount: row.pageCount,
    description: row.description,
    coverUrl: row.coverUrl,
    publisher: row.publisher.brand ?? row.publisher.name,
    authors: row.contributors.map((contributor) => contributor.name),
    offer: {
      currencyCode: offer.currencyCode,
      netCostAmount: offer.netCostAmount,
      listPriceExcludingTax: offer.listPriceExcludingTax,
      salePriceOverride: offer.salePriceOverride,
      publisherDiscountPercent: row.publisher.listPriceDiscountPercent,
      supplierDiscountPercent: offer.supplier.listPriceDiscountPercent,
      sourceSentAt: offer.sourceSentAt,
    },
  };
}
