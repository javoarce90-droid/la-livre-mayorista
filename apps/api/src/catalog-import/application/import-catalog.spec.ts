import type { CatalogEntry } from '../domain/catalog-entry.js';
import { AZETA_SUPPLIER } from '../domain/catalog-entry.js';
import type { OnixProduct, OnixRecord } from '../onix/onix-product.js';
import type { CatalogWriter, ImportContext } from '../ports/catalog-writer.js';
import { importCatalog } from './import-catalog.js';

function product(
  isbn13: string | null,
  publisherName = 'ANY',
  title: string | null = `Title ${isbn13}`,
): OnixRecord {
  const p: OnixProduct = {
    recordReference: isbn13,
    isbn13,
    productForm: 'BC',
    title,
    contributors: [],
    languageCode: 'spa',
    pageCount: null,
    measures: [],
    imprintName: null,
    publisherCode: 'P1',
    publisherName,
    publishingStatus: null,
    publicationDate: null,
    description: null,
    coverUrl: null,
    availabilityCode: '20',
    prices: [],
  };
  return { kind: 'product', product: p };
}

const HEADER: OnixRecord = {
  kind: 'header',
  header: { senderName: 'AZETA DISTRIBUCIONES', sentDateTime: '20260901' },
};

function isbn(n: number): string {
  return `978000000${String(n).padStart(4, '0')}`;
}

/** Async source that records how many records were pulled. */
function source(records: OnixRecord[]): AsyncIterable<OnixRecord> & {
  pulled: number;
} {
  const tracked = {
    pulled: 0,
    async *[Symbol.asyncIterator]() {
      for (const record of records) {
        tracked.pulled += 1;
        yield record;
      }
    },
  };
  return tracked;
}

class FakeWriter implements CatalogWriter {
  contexts: ImportContext[] = [];
  batches: CatalogEntry[][] = [];
  async prepare(context: ImportContext): Promise<void> {
    this.contexts.push(context);
  }
  async writeBatch(entries: CatalogEntry[]): Promise<void> {
    this.batches.push(entries);
  }
}

describe('importCatalog', () => {
  it('in dry-run mode counts and samples products without writing', async () => {
    const records = source([
      HEADER,
      product(isbn(1)),
      product(null),
      product(isbn(2), 'ANY', null),
      product(isbn(3)),
      product(isbn(4)),
      product(isbn(5)),
    ]);

    const summary = await importCatalog(records, {
      selection: {},
      writer: null,
    });

    expect(summary).toMatchObject({
      read: 6,
      selected: 4,
      skipped: 2,
      skippedByReason: { 'missing-isbn': 1, 'missing-title': 1 },
      written: 0,
      stoppedEarly: false,
      sourceSentAt: new Date('2026-09-01T00:00:00.000Z'),
    });
    expect(summary.samples.map((s) => s.isbn13)).toEqual([
      isbn(1),
      isbn(3),
      isbn(4),
    ]);
  });

  it('writes selected entries in batches after preparing the writer once', async () => {
    const writer = new FakeWriter();
    const records = source([
      HEADER,
      ...[1, 2, 3, 4, 5].map((n) => product(isbn(n))),
    ]);

    const summary = await importCatalog(records, {
      selection: {},
      writer,
      batchSize: 2,
    });

    expect(writer.contexts).toEqual([
      {
        supplier: AZETA_SUPPLIER,
        sourceSentAt: new Date('2026-09-01T00:00:00.000Z'),
      },
    ]);
    expect(writer.batches.map((b) => b.map((e) => e.isbn13))).toEqual([
      [isbn(1), isbn(2)],
      [isbn(3), isbn(4)],
      [isbn(5)],
    ]);
    expect(summary.written).toBe(5);
  });

  it('stops reading as soon as the limit is reached without included publishers', async () => {
    const records = source([
      HEADER,
      ...[1, 2, 3, 4, 5].map((n) => product(isbn(n))),
    ]);

    const summary = await importCatalog(records, {
      selection: { limit: 2 },
      writer: null,
    });

    expect(summary).toMatchObject({ read: 2, selected: 2, stoppedEarly: true });
    expect(records.pulled).toBe(3);
  });

  it('scans the whole input when publishers are included', async () => {
    const records = source([
      HEADER,
      product(isbn(1), 'A'),
      product(isbn(2), 'B'),
      product(isbn(3), 'DEBOLSILLO'),
      product(isbn(4), 'C'),
      product(isbn(5), 'debolsillo'),
    ]);

    const writer = new FakeWriter();
    const summary = await importCatalog(records, {
      selection: { limit: 1, includePublishers: ['DEBOLSILLO'] },
      writer,
    });

    expect(summary).toMatchObject({ read: 5, selected: 3, written: 3 });
    expect(writer.batches.flat().map((e) => e.isbn13)).toEqual([
      isbn(1),
      isbn(3),
      isbn(5),
    ]);
  });

  it('logs progress every N products read', async () => {
    const log = vi.fn();
    const records = source([
      HEADER,
      ...[1, 2, 3, 4, 5].map((n) => product(isbn(n))),
    ]);

    await importCatalog(records, {
      selection: {},
      writer: null,
      progressEvery: 2,
      log,
    });

    const progress = log.mock.calls.filter(([m]) =>
      String(m).startsWith('Read '),
    );
    expect(progress).toHaveLength(2);
    expect(progress[0][0]).toMatch(/^Read 2 products/);
  });

  it('falls back to the import start time when the header has no valid SentDateTime', async () => {
    const writer = new FakeWriter();
    const log = vi.fn();
    const startedAt = Date.UTC(2026, 9, 5, 12, 0, 0);

    await importCatalog(source([product(isbn(1))]), {
      selection: {},
      writer,
      log,
      clock: () => startedAt,
    });

    expect(writer.contexts[0].sourceSentAt).toEqual(new Date(startedAt));
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/SentDateTime/));
  });

  it('does not prepare the writer when nothing is selected', async () => {
    const writer = new FakeWriter();

    const summary = await importCatalog(source([HEADER, product(null)]), {
      selection: {},
      writer,
    });

    expect(writer.contexts).toEqual([]);
    expect(summary.written).toBe(0);
  });
});
