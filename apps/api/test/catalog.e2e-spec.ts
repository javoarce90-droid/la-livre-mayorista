import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import {
  CATALOG_BOOK_REPOSITORY,
  PRICING_SETTINGS_REPOSITORY,
} from '../src/catalog/catalog.tokens.js';
import type { CatalogBookRecord } from '../src/catalog/domain/catalog-book.js';
import type { CatalogBookRepository } from '../src/catalog/ports/catalog-book-repository.js';
import type { PricingSettingsRepository } from '../src/pricing/ports/pricing-settings-repository.js';

const TOKEN = 'test-internal-token';
const AUTH = `Bearer ${TOKEN}`;

const record: CatalogBookRecord = {
  isbn: '9788466331234',
  title: 'Ficciones',
  publishedOn: new Date('2011-03-01T00:00:00Z'),
  languageCode: 'spa',
  pageCount: 224,
  description: 'Cuentos.',
  coverUrl: null,
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
};

describe('Catalog (e2e)', () => {
  let app: INestApplication<App>;
  let books: { [K in keyof CatalogBookRepository]: ReturnType<typeof vi.fn> };
  let pricing: {
    [K in keyof PricingSettingsRepository]: ReturnType<typeof vi.fn>;
  };
  const saved = {
    DATABASE_URL: process.env.DATABASE_URL,
    API_INTERNAL_TOKEN: process.env.API_INTERNAL_TOKEN,
  };

  beforeEach(async () => {
    process.env.DATABASE_URL = '';
    process.env.API_INTERNAL_TOKEN = TOKEN;
    books = {
      search: vi.fn(async () => ({ records: [record], total: 41 })),
      findByIsbn: vi.fn(async (isbn: string) =>
        isbn === record.isbn ? record : null,
      ),
      sellablePublishers: vi.fn(async () => ['Paidós', 'Anagrama']),
    };
    pricing = {
      activePricingRule: vi.fn(async () => ({
        basis: 'ADJUSTMENT_ON_LIST_PRICE',
        percent: '0.00',
      })),
      latestExchangeRate: vi.fn(async () => ({
        baseCurrency: 'EUR',
        quoteCurrency: 'ARS',
        rate: '1738.0000',
        effectiveFrom: new Date('2026-11-01T00:00:00Z'),
      })),
    };

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CATALOG_BOOK_REPOSITORY)
      .useValue(books)
      .overrideProvider(PRICING_SETTINGS_REPOSITORY)
      .useValue(pricing)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('rejects requests without the internal token', async () => {
    await request(app.getHttpServer())
      .get('/catalog/books')
      .expect(401)
      .expect((res) => expect(res.body.error).toBe('unauthorized'));
    await request(app.getHttpServer())
      .get('/catalog/facets')
      .set('Authorization', 'Bearer nope')
      .expect(401);
  });

  it('GET /catalog/books returns priced books in ARS without cost or margin', async () => {
    const res = await request(app.getHttpServer())
      .get('/catalog/books')
      .query({ q: 'borges 978-84', author: 'jorge', offset: '20', limit: '10' })
      .set('Authorization', AUTH)
      .expect(200);

    expect(books.search).toHaveBeenCalledWith({
      words: ['borges', '97884'],
      authorWords: ['jorge'],
      publisherWords: [],
      offset: 20,
      limit: 10,
    });
    expect(res.body).toEqual({
      total: 41,
      items: [
        {
          isbn: '9788466331234',
          title: 'Ficciones',
          author: 'Borges, Jorge Luis',
          publisher: 'Debolsillo',
          year: 2011,
          language: 'spa',
          pages: 224,
          description: 'Cuentos.',
          coverUrl: null,
          priceCents: 1_738_000,
          currency: 'ARS',
          priceUpdatedAt: '2026-11-04T08:00:00.000Z',
        },
      ],
    });
  });

  it('GET /catalog/books rejects invalid paging with 400', async () => {
    await request(app.getHttpServer())
      .get('/catalog/books?limit=abc')
      .set('Authorization', AUTH)
      .expect(400)
      .expect((res) => expect(res.body.error).toBe('invalid_query'));
  });

  it('responds 503 exchange_rate_missing when no rate is configured', async () => {
    pricing.latestExchangeRate.mockResolvedValue(null);

    for (const path of ['/catalog/books', `/catalog/books/${record.isbn}`]) {
      const res = await request(app.getHttpServer())
        .get(path)
        .set('Authorization', AUTH)
        .expect(503);
      expect(res.body.error).toBe('exchange_rate_missing');
    }
    expect(books.search).not.toHaveBeenCalled();
  });

  it('GET /catalog/books/:isbn returns one book or 404', async () => {
    const found = await request(app.getHttpServer())
      .get(`/catalog/books/${record.isbn}`)
      .set('Authorization', AUTH)
      .expect(200);
    expect(found.body.priceCents).toBe(1_738_000);
    expect(found.body).not.toHaveProperty('costCents');

    await request(app.getHttpServer())
      .get('/catalog/books/9780000000000')
      .set('Authorization', AUTH)
      .expect(404)
      .expect((res) => expect(res.body.error).toBe('book_not_found'));

    await request(app.getHttpServer())
      .get('/catalog/books/abc')
      .set('Authorization', AUTH)
      .expect(400);
  });

  it('GET /catalog/facets lists sellable publisher brands, sorted', async () => {
    await request(app.getHttpServer())
      .get('/catalog/facets')
      .set('Authorization', AUTH)
      .expect(200)
      .expect({ publishers: ['Anagrama', 'Paidós'] });
  });
});
