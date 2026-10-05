import type {
  OnixMeasure,
  OnixPrice,
  OnixProduct,
} from '../onix/onix-product.js';
import type {
  CatalogContributor,
  CatalogEntry,
  CatalogOffer,
} from './catalog-entry.js';

export type MapResult =
  { ok: true; entry: CatalogEntry } | { ok: false; reason: SkipReason };

export type SkipReason = 'missing-isbn' | 'missing-title';

const MAX_INT = 2_147_483_647;
/** Upper bound (exclusive) of a Decimal(10, 2) column. */
const MAX_PRICE = 100_000_000;
/** Upper bound (exclusive) of a Decimal(5, 2) column. */
const MAX_PERCENT = 1_000;

const MEASURE_TYPE = { height: '01', width: '02', weight: '08' } as const;
const LENGTH_TO_MM: Record<string, number> = { mm: 1, cm: 10 };
const WEIGHT_TO_GRAMS: Record<string, number> = { gr: 1, g: 1, kg: 1000 };

const PRICE_TYPE = {
  listExcludingTax: '01',
  listIncludingTax: '02',
  fixedExcludingTax: '03',
} as const;

/**
 * Validates and converts a raw ONIX product. Invalid optional values become
 * null; a product without a valid ISBN-13 or a title is skipped.
 */
export function mapOnixProduct(product: OnixProduct): MapResult {
  const isbn13 = parseIsbn13(product.isbn13);
  if (isbn13 === null) return { ok: false, reason: 'missing-isbn' };
  const title = product.title?.trim() || null;
  if (title === null) return { ok: false, reason: 'missing-title' };

  const publisherCode = code(product.publisherCode, 32);

  return {
    ok: true,
    entry: {
      isbn13,
      title,
      publisher:
        publisherCode === null
          ? null
          : {
              code: publisherCode,
              name: product.publisherName ?? publisherCode,
            },
      imprintName: product.imprintName,
      productForm: code(product.productForm, 2),
      languageCode: code(product.languageCode, 3)?.toLowerCase() ?? null,
      pageCount: positiveInt(product.pageCount),
      heightMm: measure(product.measures, MEASURE_TYPE.height, LENGTH_TO_MM),
      widthMm: measure(product.measures, MEASURE_TYPE.width, LENGTH_TO_MM),
      weightGrams: measure(
        product.measures,
        MEASURE_TYPE.weight,
        WEIGHT_TO_GRAMS,
      ),
      publishingStatus: code(product.publishingStatus, 2),
      publishedOn: parseOnixDate(product.publicationDate),
      description: product.description,
      coverUrl: product.coverUrl,
      contributors: contributors(product),
      offer: offer(product, isbn13),
    },
  };
}

/**
 * Parses an ONIX date ("yyyymmdd", optionally followed by a time, or
 * "yyyy-mm-dd") into an ISO calendar date, or null when invalid.
 */
export function parseOnixDate(value: string | null): string | null {
  const match = value?.match(/^(\d{4})-?(\d{2})-?(\d{2})/);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  const iso = date.toISOString().slice(0, 10);
  return iso === `${y}-${m}-${d}` ? iso : null;
}

function parseIsbn13(value: string | null): string | null {
  const digits = value?.replace(/[\s-]/g, '') ?? '';
  return /^\d{13}$/.test(digits) ? digits : null;
}

/** A short code that must fit a VarChar(maxLength) column. */
function code(value: string | null, maxLength: number): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length <= maxLength ? trimmed : null;
}

function positiveInt(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n > 0 && n <= MAX_INT ? n : null;
}

function measure(
  measures: OnixMeasure[],
  type: string,
  factors: Record<string, number>,
): number | null {
  const found = measures.find((m) => m.type === type);
  const factor = factors[found?.unit?.trim().toLowerCase() ?? ''];
  const value = Number(found?.value);
  if (factor === undefined || !found?.value || !Number.isFinite(value)) {
    return null;
  }
  const converted = Math.round(value * factor);
  return converted > 0 && converted <= MAX_INT ? converted : null;
}

function decimal(value: string | null, max: number): string | null {
  if (value === null || !/^\d+(\.\d+)?$/.test(value.trim())) return null;
  const n = Number(value);
  // EPSILON nudges values like 7.125 (stored as 7.12499...) to round half up.
  const rounded = Math.round((n + Number.EPSILON) * 100) / 100;
  return rounded < max ? rounded.toFixed(2) : null;
}

function contributors(product: OnixProduct): CatalogContributor[] {
  const result: CatalogContributor[] = [];
  const used = new Set<number>();
  let max = 0;

  for (const c of product.contributors) {
    const name = c.name?.trim();
    const roleCode = code(c.role, 3);
    if (!name || roleCode === null) continue;

    let sequence = positiveInt(c.sequenceNumber);
    if (sequence === null || used.has(sequence)) sequence = max + 1;
    used.add(sequence);
    max = Math.max(max, sequence);
    result.push({ sequence, roleCode, name });
  }

  return result.sort((a, b) => a.sequence - b.sequence);
}

function offer(product: OnixProduct, isbn13: string): CatalogOffer | null {
  const availabilityCode = code(product.availabilityCode, 2);
  if (availabilityCode === null) return null;

  const eur = product.prices.filter(
    (p) => p.currencyCode?.trim().toUpperCase() === 'EUR',
  );
  const byType = (type: string): OnixPrice | undefined =>
    eur.find((p) => p.type === type);
  const listExcludingTax = byType(PRICE_TYPE.listExcludingTax);

  return {
    recordReference: code(product.recordReference, 100) ?? isbn13,
    availabilityCode,
    currencyCode: 'EUR',
    listPriceExcludingTax: decimal(listExcludingTax?.amount ?? null, MAX_PRICE),
    listPriceIncludingTax: decimal(
      byType(PRICE_TYPE.listIncludingTax)?.amount ?? null,
      MAX_PRICE,
    ),
    fixedPriceExcludingTax: decimal(
      byType(PRICE_TYPE.fixedExcludingTax)?.amount ?? null,
      MAX_PRICE,
    ),
    taxRatePercent: decimal(
      listExcludingTax?.taxRatePercent ?? null,
      MAX_PERCENT,
    ),
  };
}
