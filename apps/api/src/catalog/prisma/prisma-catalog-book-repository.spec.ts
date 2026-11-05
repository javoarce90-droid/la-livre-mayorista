import { Prisma } from '../../generated/prisma/client.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { CatalogSearchCriteria } from '../domain/search-criteria.js';
import {
  PrismaCatalogBookRepository,
  SELLABLE_OFFER_WHERE,
} from './prisma-catalog-book-repository.js';

const sqlText = (query: Prisma.Sql) => query.text.replace(/\s+/g, ' ');

function bookRow(id: number, title: string) {
  return {
    id,
    isbn13: `978000000000${id}`,
    title,
    publishedOn: new Date('2019-01-01T00:00:00Z'),
    languageCode: 'spa',
    pageCount: 120,
    description: null,
    coverUrl: null,
    publisher: {
      brand: 'Paidós',
      name: 'EDICIONES PAIDOS',
      listPriceDiscountPercent: new Prisma.Decimal('31'),
    },
    contributors: [{ name: 'Uno, Autor' }, { name: 'Dos, Autora' }],
    offers: [
      {
        currencyCode: 'EUR',
        netCostAmount: null,
        listPriceExcludingTax: new Prisma.Decimal('12.5'),
        salePriceOverride: null,
        sourceSentAt: new Date('2026-11-04T08:00:00Z'),
        supplier: { listPriceDiscountPercent: null },
      },
    ],
  };
}

function setup() {
  const queryRaw = vi.fn(async (query: Prisma.Sql) =>
    sqlText(query).includes('count(*)')
      ? [{ total: 42 }]
      : [{ id: 2 }, { id: 1 }],
  );
  const findMany = vi.fn(async () => [bookRow(1, 'A'), bookRow(2, 'B')]);
  const findFirst = vi.fn(async () => bookRow(1, 'A'));
  const client = {
    $queryRaw: queryRaw,
    book: { findMany, findFirst },
  } as unknown as PrismaClient;
  return {
    repo: new PrismaCatalogBookRepository(client),
    queryRaw,
    findMany,
    findFirst,
  };
}

const criteria: CatalogSearchCriteria = {
  words: ['borges', '50%'],
  authorWords: ['jorge'],
  publisherWords: ['debolsillo'],
  offset: 40,
  limit: 20,
};

describe('PrismaCatalogBookRepository.search', () => {
  it('filters sellable books and pages in SQL, ordered by normalized title', async () => {
    const { repo, queryRaw } = setup();

    await repo.search(criteria);

    expect(queryRaw).toHaveBeenCalledTimes(2);
    const [page, count] = queryRaw.mock.calls.map(([q]) => q);
    for (const query of [page, count]) {
      const sql = sqlText(query);
      expect(sql).toContain('JOIN "Publisher" p ON p."id" = b."publisherId"');
      expect(sql).toContain('p."listPriceDiscountPercent" IS NOT NULL');
      expect(sql).toContain('o."availabilityCode" IN (');
      expect(sql).toContain('o."currencyCode" = ');
      expect(sql).toContain(
        '(o."listPriceExcludingTax" IS NOT NULL OR o."salePriceOverride" IS NOT NULL)',
      );
      // Authors come from A01 contributors, normalized like the search words.
      expect(sql).toContain("c.\"roleCode\" = 'A01'");
      expect(sql).toMatch(
        /translate\(lower\(a\."names"\), 'á[^']*', 'a[^']*'\) LIKE '%' \|\| translate\(lower\(\$\d+::text\)/,
      );
      expect(query.values).toEqual(expect.arrayContaining(['20', '21', 'EUR']));
    }
    expect(sqlText(page)).toMatch(/ORDER BY translate\(lower\(b."title"\)/);
    expect(sqlText(page)).toMatch(/OFFSET \$\d+ LIMIT \$\d+$/);
    expect(page.values.slice(-2)).toEqual([40, 20]);
  });

  it('matches every word, escaping LIKE wildcards', async () => {
    const { repo, queryRaw } = setup();

    await repo.search(criteria);

    const [page] = queryRaw.mock.calls.map(([q]) => q);
    expect(page.values).toEqual(
      expect.arrayContaining(['borges', '50\\%', 'jorge', 'debolsillo']),
    );
    // q matches title, authors, ISBN and brand.
    expect(sqlText(page)).toContain(
      'concat_ws(\' \', b."title", a."names", b."isbn13", COALESCE(p."brand", p."name"))',
    );
  });

  it('skips the author join when no word needs it', async () => {
    const { repo, queryRaw } = setup();

    await repo.search({
      words: [],
      authorWords: [],
      publisherWords: [],
      offset: 0,
      limit: 20,
    });

    const [page] = queryRaw.mock.calls.map(([q]) => q);
    expect(sqlText(page)).not.toContain('LATERAL');
  });

  it('loads the page with Prisma and keeps the SQL order', async () => {
    const { repo, findMany } = setup();

    const result = await repo.search(criteria);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: [2, 1] } } }),
    );
    expect(result.total).toBe(42);
    expect(result.records.map((r) => r.title)).toEqual(['B', 'A']);
    expect(result.records[0]).toMatchObject({
      isbn: '9780000000002',
      publisher: 'Paidós',
      authors: ['Uno, Autor', 'Dos, Autora'],
      offer: { currencyCode: 'EUR', supplierDiscountPercent: null },
    });
    expect(result.records[0].offer.publisherDiscountPercent).toEqual(
      new Prisma.Decimal('31'),
    );
  });

  it('does not load anything when the page is empty', async () => {
    const { repo, queryRaw, findMany } = setup();
    queryRaw.mockImplementation(async (query: Prisma.Sql) =>
      sqlText(query).includes('count(*)') ? [{ total: 0 }] : [],
    );

    expect(await repo.search(criteria)).toEqual({ records: [], total: 0 });
    expect(findMany).not.toHaveBeenCalled();
  });
});

describe('PrismaCatalogBookRepository.findByIsbn', () => {
  it('only finds sellable books', async () => {
    const { repo, findFirst } = setup();

    const record = await repo.findByIsbn('9780000000001');

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isbn13: '9780000000001',
          publisher: { listPriceDiscountPercent: { not: null } },
          offers: { some: SELLABLE_OFFER_WHERE },
        },
      }),
    );
    expect(record?.title).toBe('A');
  });

  it('returns null when not found', async () => {
    const { repo, findFirst } = setup();
    findFirst.mockResolvedValueOnce(null as never);
    expect(await repo.findByIsbn('9780000000009')).toBeNull();
  });
});

describe('PrismaCatalogBookRepository.sellablePublishers', () => {
  it('lists distinct brands of discounted publishers with sellable books', async () => {
    const { repo, queryRaw } = setup();
    queryRaw.mockResolvedValueOnce([
      { brand: 'Paidós' },
      { brand: 'Anagrama' },
    ] as never);

    expect(await repo.sellablePublishers()).toEqual(['Paidós', 'Anagrama']);
    const sql = sqlText(queryRaw.mock.calls[0][0]);
    expect(sql).toContain('SELECT DISTINCT COALESCE(p."brand", p."name") AS "brand"');
    expect(sql).toContain('p."listPriceDiscountPercent" IS NOT NULL');
    expect(sql).toContain('o."availabilityCode" IN (');
  });
});

describe('SELLABLE_OFFER_WHERE', () => {
  it('mirrors the SQL filter', () => {
    expect(SELLABLE_OFFER_WHERE).toEqual({
      availabilityCode: { in: ['20', '21'] },
      currencyCode: 'EUR',
      OR: [
        { listPriceExcludingTax: { not: null } },
        { salePriceOverride: { not: null } },
      ],
    });
  });
});
