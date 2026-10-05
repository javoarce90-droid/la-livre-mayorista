import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import type { CatalogEntry } from '../domain/catalog-entry.js';
import { AZETA_SUPPLIER } from '../domain/catalog-entry.js';
import { PrismaCatalogWriter } from './prisma-catalog-writer.js';

const SENT_AT = new Date('2026-09-01T00:00:00.000Z');

function entry(overrides: Partial<CatalogEntry> = {}): CatalogEntry {
  return {
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
    description: '<p>Saga</p>',
    coverUrl: 'https://x/c.jpg',
    contributors: [{ sequence: 1, roleCode: 'A01', name: 'GARCÍA MÁRQUEZ' }],
    offer: {
      recordReference: '9788466359207',
      availabilityCode: '20',
      currencyCode: 'EUR',
      listPriceExcludingTax: '11.49',
      listPriceIncludingTax: '11.95',
      fixedPriceExcludingTax: '11.49',
      taxRatePercent: '4.00',
    },
    ...overrides,
  };
}

interface Statement {
  sql: string;
  values: unknown[];
}

/** Minimal stand-in for the PrismaClient surface used by the writer. */
function fakePrisma(options: {
  pricingRules?: number;
  publishers?: { id: number; code: string; name: string }[];
}) {
  const statements: Statement[] = [];
  let nextPublisherId = 100;
  const record = (query: Prisma.Sql): Statement => {
    const statement = {
      sql: query.sql.replace(/\s+/g, ' '),
      values: query.values,
    };
    statements.push(statement);
    return statement;
  };
  const tx = {
    $executeRaw: vi.fn(async (query: Prisma.Sql) => {
      record(query);
      return 0;
    }),
    $queryRaw: vi.fn(async (query: Prisma.Sql) => {
      const statement = record(query);
      // Publisher upsert: return one id per input row.
      const rows = JSON.parse(statement.values[1] as string) as {
        code: string;
      }[];
      return rows.map((r) => ({ id: nextPublisherId++, code: r.code }));
    }),
  };
  const prisma = {
    supplier: { upsert: vi.fn(async () => ({ id: 7 })) },
    pricingRule: {
      count: vi.fn(async () => options.pricingRules ?? 0),
      create: vi.fn(async () => ({})),
    },
    publisher: { findMany: vi.fn(async () => options.publishers ?? []) },
    $transaction: vi.fn(
      async (fn: (t: typeof tx) => Promise<unknown>, _opts?: unknown) => fn(tx),
    ),
  };
  return {
    prisma,
    tx,
    statements,
    client: prisma as unknown as PrismaClient,
  };
}

function rows(statement: Statement): Record<string, unknown>[] {
  const json = statement.values.find(
    (v) => typeof v === 'string' && v.startsWith('['),
  );
  return JSON.parse(json as string) as Record<string, unknown>[];
}

function find(statements: Statement[], prefix: string): Statement {
  const found = statements.find((s) => s.sql.trimStart().startsWith(prefix));
  if (!found) throw new Error(`no statement starting with ${prefix}`);
  return found;
}

describe('PrismaCatalogWriter', () => {
  describe('prepare', () => {
    it('upserts the supplier without overwriting an existing one and seeds the default pricing rule', async () => {
      const fake = fakePrisma({ pricingRules: 0 });
      const writer = new PrismaCatalogWriter(fake.client);

      await writer.prepare({ supplier: AZETA_SUPPLIER, sourceSentAt: SENT_AT });

      expect(fake.prisma.supplier.upsert).toHaveBeenCalledWith({
        where: { code: 'AZETA' },
        create: {
          code: 'AZETA',
          name: 'AZETA DISTRIBUCIONES',
          listPriceDiscountPercent: '17.00',
        },
        update: {},
        select: { id: true },
      });
      expect(fake.prisma.pricingRule.create).toHaveBeenCalledWith({
        data: {
          name: 'default',
          basis: 'MARKUP_ON_COST',
          percent: '20.00',
          isActive: true,
        },
      });
    });

    it('never touches pricing rules when one already exists', async () => {
      const fake = fakePrisma({ pricingRules: 2 });

      await new PrismaCatalogWriter(fake.client).prepare({
        supplier: AZETA_SUPPLIER,
        sourceSentAt: SENT_AT,
      });

      expect(fake.prisma.pricingRule.create).not.toHaveBeenCalled();
    });
  });

  describe('writeBatch', () => {
    it('fails when called before prepare', async () => {
      const fake = fakePrisma({});

      await expect(
        new PrismaCatalogWriter(fake.client).writeBatch([entry()]),
      ).rejects.toThrow(/prepare/);
    });

    it('writes publishers, books, contributors and offers in a single transaction', async () => {
      const fake = fakePrisma({});
      const writer = new PrismaCatalogWriter(fake.client);
      await writer.prepare({ supplier: AZETA_SUPPLIER, sourceSentAt: SENT_AT });

      await writer.writeBatch([entry()]);

      expect(fake.prisma.$transaction).toHaveBeenCalledOnce();
      expect(fake.statements.map((s) => s.sql.trim().split(' ')[0])).toEqual([
        'INSERT', // publishers
        'INSERT', // books
        'DELETE', // contributors
        'INSERT', // contributors
        'INSERT', // offers
      ]);

      const publishers = fake.statements[0];
      expect(publishers.sql).toContain('INSERT INTO "Publisher"');
      expect(publishers.sql).toContain('ON CONFLICT ("supplierId", "code")');
      expect(publishers.values[0]).toBe(7);
      expect(rows(publishers)).toEqual([{ code: 'J70', name: 'DEBOLSILLO' }]);

      const books = fake.statements[1];
      expect(books.sql).toContain('INSERT INTO "Book"');
      expect(books.sql).toContain('ON CONFLICT ("isbn13") DO UPDATE');
      expect(rows(books)).toEqual([
        {
          isbn13: '9788466359207',
          title: 'CIEN AÑOS DE SOLEDAD',
          publisherId: 100,
          imprintName: 'DEBOLSILLO',
          productForm: 'BC',
          languageCode: 'spa',
          pageCount: 496,
          heightMm: 190,
          widthMm: 125,
          weightGrams: 230,
          publishingStatus: '04',
          publishedOn: '2022-03-17',
          description: '<p>Saga</p>',
          coverUrl: 'https://x/c.jpg',
        },
      ]);

      const deleted = fake.statements[2];
      expect(deleted.sql).toContain('DELETE FROM "BookContributor"');
      expect(rows(deleted)).toEqual(['9788466359207']);

      const contributors = fake.statements[3];
      expect(contributors.sql).toContain('INSERT INTO "BookContributor"');
      expect(rows(contributors)).toEqual([
        {
          isbn13: '9788466359207',
          sequence: 1,
          roleCode: 'A01',
          name: 'GARCÍA MÁRQUEZ',
        },
      ]);

      const offers = fake.statements[4];
      expect(offers.sql).toContain('INSERT INTO "SupplierOffer"');
      expect(offers.sql).toContain(
        'ON CONFLICT ("supplierId", "recordReference") DO UPDATE',
      );
      expect(offers.sql).not.toMatch(/netCostAmount|salePriceOverride/);
      expect(offers.values).toContain(7);
      expect(offers.values).toContain('2026-09-01 00:00:00.000');
      expect(rows(offers)).toEqual([
        {
          isbn13: '9788466359207',
          recordReference: '9788466359207',
          availabilityCode: '20',
          currencyCode: 'EUR',
          listPriceExcludingTax: '11.49',
          listPriceIncludingTax: '11.95',
          fixedPriceExcludingTax: '11.49',
          taxRatePercent: '4.00',
        },
      ]);
    });

    it('reuses known publishers and only upserts new or renamed ones', async () => {
      const fake = fakePrisma({
        publishers: [
          { id: 1, code: 'J70', name: 'DEBOLSILLO' },
          { id: 2, code: 'Z98', name: 'OLD NAME' },
        ],
      });
      const writer = new PrismaCatalogWriter(fake.client);
      await writer.prepare({ supplier: AZETA_SUPPLIER, sourceSentAt: SENT_AT });

      await writer.writeBatch([
        entry(),
        entry({
          isbn13: '9786072650688',
          publisher: { code: 'Z98', name: 'MANUAL MODERNO' },
        }),
        entry({ isbn13: '9788497592208', publisher: null }),
      ]);

      const publishers = find(fake.statements, 'INSERT INTO "Publisher"');
      expect(rows(publishers)).toEqual([
        { code: 'Z98', name: 'MANUAL MODERNO' },
      ]);
      const books = find(fake.statements, 'INSERT INTO "Book"');
      expect(rows(books).map((b) => b.publisherId)).toEqual([1, 100, null]);

      // The renamed publisher is now cached: a second batch upserts nothing.
      fake.statements.length = 0;
      await writer.writeBatch([
        entry({
          isbn13: '9786072650688',
          publisher: { code: 'Z98', name: 'MANUAL MODERNO' },
        }),
      ]);
      expect(fake.statements[0].sql).toContain('INSERT INTO "Book"');
    });

    it('keeps the last occurrence of a duplicated ISBN and skips empty statements', async () => {
      const fake = fakePrisma({
        publishers: [{ id: 1, code: 'J70', name: 'DEBOLSILLO' }],
      });
      const writer = new PrismaCatalogWriter(fake.client);
      await writer.prepare({ supplier: AZETA_SUPPLIER, sourceSentAt: SENT_AT });

      await writer.writeBatch([
        entry({ title: 'First' }),
        entry({ title: 'Second', contributors: [], offer: null }),
      ]);

      expect(rows(find(fake.statements, 'INSERT INTO "Book"'))).toMatchObject([
        { title: 'Second' },
      ]);
      expect(
        fake.statements.map((s) =>
          s.sql.trim().split(' ').slice(0, 3).join(' '),
        ),
      ).toEqual(['INSERT INTO "Book"', 'DELETE FROM "BookContributor"']);
    });
  });
});
