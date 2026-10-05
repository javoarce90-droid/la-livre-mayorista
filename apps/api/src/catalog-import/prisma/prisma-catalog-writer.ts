import { Prisma } from '../../generated/prisma/client.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { CatalogEntry } from '../domain/catalog-entry.js';
import type { CatalogWriter, ImportContext } from '../ports/catalog-writer.js';

type Transaction = Pick<PrismaClient, '$executeRaw' | '$queryRaw'>;

interface CachedPublisher {
  id: number;
  name: string;
}

interface Session {
  supplierId: number;
  /** "YYYY-MM-DD HH:MM:SS.mmm" in UTC, the format of TIMESTAMP(3) columns. */
  sourceSentAt: string;
}

export const DEFAULT_PRICING_RULE = {
  name: 'default',
  basis: 'MARKUP_ON_COST',
  percent: '20.00',
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
 * Never touched: supplier settings of an existing supplier, existing pricing
 * rules, and the offer fields managed by La Livre (net cost, sale override).
 */
export class PrismaCatalogWriter implements CatalogWriter {
  private session: Session | null = null;
  private readonly publishers = new Map<string, CachedPublisher>();

  constructor(
    private readonly prisma: PrismaClient,
    private readonly transactionTimeoutMs = 120_000,
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
      select: { id: true, code: true, name: true },
    });
    this.publishers.clear();
    for (const p of publishers) {
      this.publishers.set(p.code, { id: p.id, name: p.name });
    }

    this.session = {
      supplierId,
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

    const resolved = await this.prisma.$transaction(
      async (tx) => {
        const publisherIds = await this.upsertPublishers(tx, session, entries);
        await this.upsertBooks(tx, entries, publisherIds);
        await this.replaceContributors(tx, entries);
        await this.upsertOffers(tx, session, entries);
        return publisherIds;
      },
      { timeout: this.transactionTimeoutMs, maxWait: 30_000 },
    );

    // Only cache publishers once the transaction is committed.
    for (const e of entries) {
      const id = e.publisher && resolved.get(e.publisher.code);
      if (e.publisher && id !== undefined && id !== null) {
        this.publishers.set(e.publisher.code, { id, name: e.publisher.name });
      }
    }
  }

  /** Returns publisher code → id for every publisher of the batch. */
  private async upsertPublishers(
    tx: Transaction,
    session: Session,
    entries: CatalogEntry[],
  ): Promise<Map<string, number>> {
    const ids = new Map<string, number>();
    const pending = new Map<string, string>();
    for (const { publisher } of entries) {
      if (publisher === null) continue;
      const cached = this.publishers.get(publisher.code);
      if (cached && cached.name === publisher.name) {
        ids.set(publisher.code, cached.id);
      } else {
        pending.set(publisher.code, publisher.name);
      }
    }
    if (pending.size === 0) return ids;

    const json = JSON.stringify(
      [...pending].map(([code, name]) => ({ code, name })),
    );
    const rows = await tx.$queryRaw<{ id: number; code: string }[]>(Prisma.sql`
      INSERT INTO "Publisher" ("supplierId", "code", "name")
      SELECT ${session.supplierId}::int, r."code", r."name"
      FROM jsonb_to_recordset(${json}::jsonb) AS r("code" text, "name" text)
      ON CONFLICT ("supplierId", "code") DO UPDATE SET "name" = EXCLUDED."name"
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
