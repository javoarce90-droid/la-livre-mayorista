import type { CatalogEntry, SupplierSeed } from '../domain/catalog-entry.js';
import { AZETA_SUPPLIER } from '../domain/catalog-entry.js';
import type { SkipReason } from '../domain/map-onix-product.js';
import { mapOnixProduct, parseOnixDate } from '../domain/map-onix-product.js';
import type { OnixRecord } from '../onix/onix-product.js';
import type { CatalogWriter } from '../ports/catalog-writer.js';
import type { SelectionOptions } from '../selection/product-selection.js';
import { ProductSelection } from '../selection/product-selection.js';

export interface ImportCatalogOptions {
  selection: SelectionOptions;
  /** Null means dry run: parse, map and select without writing anything. */
  writer: CatalogWriter | null;
  supplier?: SupplierSeed;
  batchSize?: number;
  /** Number of mapped entries kept in the summary. */
  sampleSize?: number;
  progressEvery?: number;
  log?: (message: string) => void;
  /** Milliseconds since epoch; injectable for tests. */
  clock?: () => number;
}

export interface ImportSummary {
  /** Products read from the feed. */
  read: number;
  /** Valid products chosen by the selection. */
  selected: number;
  /** Selected-by-publisher products dropped for lacking ISBN or title. */
  skipped: number;
  skippedByReason: Record<SkipReason, number>;
  written: number;
  /** True when reading stopped before the end of the feed. */
  stoppedEarly: boolean;
  sourceSentAt: Date | null;
  durationMs: number;
  samples: CatalogEntry[];
}

export const DEFAULT_BATCH_SIZE = 500;
const DEFAULT_SAMPLE_SIZE = 3;
const DEFAULT_PROGRESS_EVERY = 100_000;

/**
 * Reads ONIX records, maps and selects products, and writes them in batches.
 * Reading stops early once the selection cannot take any more products.
 */
export async function importCatalog(
  records: AsyncIterable<OnixRecord>,
  options: ImportCatalogOptions,
): Promise<ImportSummary> {
  const {
    writer,
    supplier = AZETA_SUPPLIER,
    batchSize = DEFAULT_BATCH_SIZE,
    sampleSize = DEFAULT_SAMPLE_SIZE,
    progressEvery = DEFAULT_PROGRESS_EVERY,
    log = () => {},
    clock = Date.now,
  } = options;
  const startedAt = clock();
  const selection = new ProductSelection(options.selection);

  const summary: ImportSummary = {
    read: 0,
    selected: 0,
    skipped: 0,
    skippedByReason: { 'missing-isbn': 0, 'missing-title': 0 },
    written: 0,
    stoppedEarly: false,
    sourceSentAt: null,
    durationMs: 0,
    samples: [],
  };

  let batch: CatalogEntry[] = [];
  let prepared = false;

  const flush = async (): Promise<void> => {
    if (writer === null || batch.length === 0) return;
    if (!prepared) {
      if (summary.sourceSentAt === null) {
        summary.sourceSentAt = new Date(startedAt);
        log(
          'Header has no valid SentDateTime: using the import start time as sourceSentAt.',
        );
      }
      await writer.prepare({ supplier, sourceSentAt: summary.sourceSentAt });
      prepared = true;
    }
    await writer.writeBatch(batch);
    summary.written += batch.length;
    batch = [];
  };

  if (selection.isComplete) {
    summary.stoppedEarly = true;
  } else {
    for await (const record of records) {
      if (record.kind === 'header') {
        const date = parseOnixDate(record.header.sentDateTime);
        summary.sourceSentAt = date ? new Date(`${date}T00:00:00.000Z`) : null;
        continue;
      }

      summary.read += 1;
      if (summary.read % progressEvery === 0) {
        log(
          `Read ${summary.read} products (selected ${summary.selected}, written ${summary.written})`,
        );
      }

      const { publisherName } = record.product;
      if (!selection.wants(publisherName)) continue;

      const result = mapOnixProduct(record.product);
      if (!result.ok) {
        summary.skipped += 1;
        summary.skippedByReason[result.reason] += 1;
        continue;
      }

      selection.take(publisherName);
      summary.selected += 1;
      if (summary.samples.length < sampleSize) {
        summary.samples.push(result.entry);
      }
      if (writer !== null) {
        batch.push(result.entry);
        if (batch.length >= batchSize) await flush();
      }

      if (selection.isComplete) {
        summary.stoppedEarly = true;
        break;
      }
    }
  }

  await flush();
  summary.durationMs = clock() - startedAt;
  return summary;
}
