import { Prisma } from '../../generated/prisma/client.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { CatalogEntry } from '../domain/catalog-entry.js';
import {
  AZETA_PUBLISHER_DISCOUNTS,
  resolvePublisherDiscount,
} from '../domain/publisher-discounts.js';
import type {
  PublisherDiscountConfig,
  ResolvedPublisherDiscount,
} from '../domain/publisher-discounts.js';
import type { CatalogWriter, ImportContext } from '../ports/catalog-writer.js';

type Transaction = Pick<PrismaClient, '$executeRaw' | '$queryRaw'>;

interface PublisherRow {
  name: string;
  brand: string | null;
  /** Two-decimal string, e.g. "35.00". */
  listPriceDiscountPercent: string | null;
}

interface CachedPublisher extends PublisherRow {
  id: number;
}

interface Session {
  supplierId: number;
  /** Publisher discounts of the supplier being imported, if any. */
  publisherDiscounts: PublisherDiscountConfig | null;
  /** "YYYY-MM-DD HH:MM:SS.mmm" in UTC, the format of TIMESTAMP(3) columns. */
  sourceSentAt: string;
}

export const DEFAULT_PRICING_RULE = {
  name: 'default',
  // Sell at the list price excluding tax until the owner adjusts it.
  basis: 'ADJUSTMENT_ON_LIST_PRICE',
  percent: '0.00',
  isActive: true,
} as const;

/** Prisma stores DateTime as UTC in `timestamp without time zone` columns. */
const NOW_UTC = Prisma.raw(`(now() AT TIME ZONE 'UTC')`);

/** Column name → PostgreSQL type of the JSON recordset sent for books. */
const BOOK_COLUMNS = [
  ['isbn13', 'text'],
  ['title', 'text'],
  ['publisherId', 'int'],
  ['imprintName', 'text'],
  ['productForm', 'text'],
  ['languageCode', 'text'],
  ['pageCount', 'int'],
  ['heightMm', 'int'],
  ['widthMm', 'int'],
  ['weightGrams', 'int'],
  ['publishingStatus', 'text'],
  ['publishedOn', 'date'],
  ['description', 'text'],
  ['coverUrl', 'text'],
] as const;

const OFFER_COLUMNS = [
  ['isbn13', 'text'],
  ['recordReference', 'text'],
  ['availabilityCode', 'text'],
  ['currencyCode', 'text'],
  ['listPriceExcludingTax', 'numeric'],
  ['listPriceIncludingTax', 'numeric'],
  ['fixedPriceExcludingTax', 'numeric'],
  ['taxRatePercent', 'numeric'],
] as const;

const OFFER_UPDATED_COLUMNS = OFFER_COLUMNS.slice(2).map(([name]) => name);

/**
 * Prisma adapter of `CatalogWriter`.
 *
 * Each batch is written in one interactive transaction with a handful of
 * set-based statements (rows travel as a single JSON parameter expanded with
 * `jsonb_to_recordset`), so the number of round trips does not depend on the
 * batch size. This keeps imports fast over a remote pooled connection.
 *
 * Publisher brand and discount always follow the versioned configuration
 * (on insert and update), so re-imports keep them in sync.
 *
 * Never touched: supplier settings of an existing supplier, existing pricing
 * rules, and the offer fields managed by La Livre (net cost, sale override).
 */
export class PrismaCatalogWriter implements CatalogWriter {
  private session: Session | null = null;
  private readonly publishers = new Map<string, CachedPublisher>();

  constructor(
    private readonly prisma: PrismaClient,
    private readonly transactionTimeoutMs = 120_000,
    private readonly publisherDiscounts: PublisherDiscountConfig = AZETA_PUBLISHER_DISCOUNTS,
  ) {}

  async prepare(context: ImportContext): Promise<void> {
    const { supplier } = context;
    const { id: supplierId } = await this.prisma.supplier.upsert({
      where: { code: supplier.code },
      create: {
        code: supplier.code,
        name: supplier.name,
        listPriceDiscountPercent: supplier.listPriceDiscountPercent,
      },
      update: {},
      select: { id: true },
    });

    if ((await this.prisma.pricingRule.count()) === 0) {
      await this.prisma.pricingRule.create({ data: DEFAULT_PRICING_RULE });
    }

    const publishers = await this.prisma.publisher.findMany({
      where: { supplierId },
      select: {
        id: true,
        code: true,
        name: true,
        brand: true,
        listPriceDiscountPercent: true,
      },
    });
    this.publishers.clear();
    for (const p of publishers) {
      this.publishers.set(p.code, {
        id: p.id,
        name: p.name,
        brand: p.brand,
        listPriceDiscountPercent:
          p.listPriceDiscountPercent?.toFixed(2) ?? null,
      });
    }

    this.session = {
      supplierId,
      publisherDiscounts:
        this.publisherDiscounts.supplierCode === supplier.code
          ? this.publisherDiscounts
          : null,
      sourceSentAt: context.sourceSentAt
        .toISOString()
        .replace('T', ' ')
        .replace('Z', ''),
    };
  }

  async writeBatch(batch: CatalogEntry[]): Promise<void> {
    const session = this.session;
    if (session === null) {
      throw new Error('PrismaCatalogWriter.prepare() must be called first');
    }
    // ON CONFLICT cannot touch the same row twice in one statement.
    const entries = [...new Map(batch.map((e) => [e.isbn13, e])).values()];
    if (entries.length === 0) return;

    const publishers = this.publisherRows(session, entries);
    const resolved = await this.prisma.$transaction(
      async (tx) => {
        const publisherIds = await this.upsertPublishers(
          tx,
          session,
          publishers,
        );
        await this.upsertBooks(tx, entries, publisherIds);
        await this.replaceContributors(tx, entries);
        await this.upsertOffers(tx, session, entries);
        return publisherIds;
      },
      { timeout: this.transactionTimeoutMs, maxWait: 30_000 },
    );

    // Only cache publishers once the transaction is committed.
    for (const [code, row] of publishers) {
      const id = resolved.get(code);
      if (id !== undefined) this.publishers.set(code, { id, ...row });
    }
  }

  /** Publisher code → row to persist, for every publisher of the batch. */
  private publisherRows(
    session: Session,
    entries: CatalogEntry[],
  ): Map<string, PublisherRow> {
    const rows = new Map<string, PublisherRow>();
    for (const { publisher } of entries) {
      if (publisher === null) continue;
      const discount: ResolvedPublisherDiscount | null =
        session.publisherDiscounts &&
        resolvePublisherDiscount(publisher.name, session.publisherDiscounts);
      rows.set(publisher.code, {
        name: publisher.name,
        brand: discount?.brand ?? null,
        listPriceDiscountPercent: discount?.percent ?? null,
      });
    }
    return rows;
  }

  /** Returns publisher code → id for every publisher of the batch. */
  private async upsertPublishers(
    tx: Transaction,
    session: Session,
    publishers: Map<string, PublisherRow>,
  ): Promise<Map<string, number>> {
    const ids = new Map<string, number>();
    const pending: ({ code: string } & PublisherRow)[] = [];
    for (const [code, row] of publishers) {
      const cached = this.publishers.get(code);
      if (cached && samePublisherRow(cached, row)) {
        ids.set(code, cached.id);
      } else {
        pending.push({ code, ...row });
      }
    }
    if (pending.length === 0) return ids;

    const rows = await tx.$queryRaw<{ id: number; code: string }[]>(Prisma.sql`
      INSERT INTO "Publisher" ("supplierId", "code", "name", "brand", "listPriceDiscountPercent")
      SELECT ${session.supplierId}::int, r."code", r."name", r."brand", r."listPriceDiscountPercent"
      FROM jsonb_to_recordset(${JSON.stringify(pending)}::jsonb)
        AS r("code" text, "name" text, "brand" text, "listPriceDiscountPercent" numeric)
      ON CONFLICT ("supplierId", "code") DO UPDATE SET "name" = EXCLUDED."name",
        "brand" = EXCLUDED."brand", "listPriceDiscountPercent" = EXCLUDED."listPriceDiscountPercent"
      RETURNING "id", "code"`);
    for (const row of rows) ids.set(row.code, row.id);
    return ids;
  }

  private async upsertBooks(
    tx: Transaction,
    entries: CatalogEntry[],
    publisherIds: Map<string, number>,
  ): Promise<void> {
    const json = JSON.stringify(
      entries.map((e) => ({
        isbn13: e.isbn13,
        title: e.title,
        publisherId: e.publisher
          ? (publisherIds.get(e.publisher.code) ?? null)
          : null,
        imprintName: e.imprintName,
        productForm: e.productForm,
        languageCode: e.languageCode,
        pageCount: e.pageCount,
        heightMm: e.heightMm,
        widthMm: e.widthMm,
        weightGrams: e.weightGrams,
        publishingStatus: e.publishingStatus,
        publishedOn: e.publishedOn,
        description: e.description,
        coverUrl: e.coverUrl,
      })),
    );
    const names = BOOK_COLUMNS.map(([name]) => name);
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO "Book" (${columns(names)}, "updatedAt")
      SELECT ${columns(names, 'r')}, ${NOW_UTC}
      FROM jsonb_to_recordset(${json}::jsonb) AS r(${definitions(BOOK_COLUMNS)})
      ON CONFLICT ("isbn13") DO UPDATE SET ${assignments(names.slice(1))}, "updatedAt" = EXCLUDED."updatedAt"`);
  }

  private async replaceContributors(
    tx: Transaction,
    entries: CatalogEntry[],
  ): Promise<void> {
    const isbns = JSON.stringify(entries.map((e) => e.isbn13));
    await tx.$executeRaw(Prisma.sql`
      DELETE FROM "BookContributor" c USING "Book" b
      WHERE c."bookId" = b."id"
        AND b."isbn13" IN (SELECT jsonb_array_elements_text(${isbns}::jsonb))`);

    const contributors = entries.flatMap((e) =>
      e.contributors.map((c) => ({ isbn13: e.isbn13, ...c })),
    );
    if (contributors.length === 0) return;
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO "BookContributor" ("bookId", "sequence", "roleCode", "name")
      SELECT b."id", r."sequence", r."roleCode", r."name"
      FROM jsonb_to_recordset(${JSON.stringify(contributors)}::jsonb)
        AS r("isbn13" text, "sequence" int, "roleCode" text, "name" text)
      JOIN "Book" b ON b."isbn13" = r."isbn13"`);
  }

  private async upsertOffers(
    tx: Transaction,
    session: Session,
    entries: CatalogEntry[],
  ): Promise<void> {
    const offers = [
      ...new Map(
        entries.flatMap((e) =>
          e.offer
            ? [[e.offer.recordReference, { isbn13: e.isbn13, ...e.offer }]]
            : [],
        ),
      ).values(),
    ];
    if (offers.length === 0) return;

    const names = OFFER_COLUMNS.slice(1).map(([name]) => name);
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO "SupplierOffer" ("bookId", "supplierId", ${columns(names)}, "sourceSentAt", "updatedAt")
      SELECT b."id", ${session.supplierId}::int, ${columns(names, 'r')},
        ${session.sourceSentAt}::timestamp, ${NOW_UTC}
      FROM jsonb_to_recordset(${JSON.stringify(offers)}::jsonb) AS r(${definitions(OFFER_COLUMNS)})
      JOIN "Book" b ON b."isbn13" = r."isbn13"
      ON CONFLICT ("supplierId", "recordReference") DO UPDATE SET ${assignments(OFFER_UPDATED_COLUMNS)},
        "sourceSentAt" = EXCLUDED."sourceSentAt", "updatedAt" = EXCLUDED."updatedAt"`);
  }
}

function samePublisherRow(a: PublisherRow, b: PublisherRow): boolean {
  return (
    a.name === b.name &&
    a.brand === b.brand &&
    a.listPriceDiscountPercent === b.listPriceDiscountPercent
  );
}

// Identifiers below come from the constant column lists above, never from input.

function columns(names: readonly string[], alias?: string): Prisma.Sql {
  const prefix = alias ? `${alias}.` : '';
  return Prisma.raw(names.map((n) => `${prefix}"${n}"`).join(', '));
}

function definitions(
  definitionList: readonly (readonly [string, string])[],
): Prisma.Sql {
  return Prisma.raw(
    definitionList.map(([name, type]) => `"${name}" ${type}`).join(', '),
  );
}

function assignments(names: readonly string[]): Prisma.Sql {
  return Prisma.raw(names.map((n) => `"${n}" = EXCLUDED."${n}"`).join(', '));
}
