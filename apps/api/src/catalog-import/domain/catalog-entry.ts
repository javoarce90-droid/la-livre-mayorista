/**
 * A validated, typed catalog record ready to be persisted. Produced from an
 * ONIX product by `mapOnixProduct` and consumed by a `CatalogWriter`.
 *
 * Decimals are kept as fixed-point strings (e.g. "11.49") to avoid float
 * rounding; dates are ISO calendar dates ("2022-03-17").
 */
export interface CatalogEntry {
  isbn13: string;
  title: string;
  publisher: { code: string; name: string } | null;
  imprintName: string | null;
  productForm: string | null;
  languageCode: string | null;
  pageCount: number | null;
  heightMm: number | null;
  widthMm: number | null;
  weightGrams: number | null;
  publishingStatus: string | null;
  publishedOn: string | null;
  description: string | null;
  coverUrl: string | null;
  contributors: CatalogContributor[];
  /** Null when the feed carries no valid availability code. */
  offer: CatalogOffer | null;
}

export interface CatalogContributor {
  sequence: number;
  roleCode: string;
  name: string;
}

export interface CatalogOffer {
  recordReference: string;
  availabilityCode: string;
  currencyCode: 'EUR';
  listPriceExcludingTax: string | null;
  listPriceIncludingTax: string | null;
  fixedPriceExcludingTax: string | null;
  taxRatePercent: string | null;
}

/** The supplier the feed comes from. */
export interface SupplierSeed {
  code: string;
  name: string;
  /** Applied only when the supplier is created. */
  listPriceDiscountPercent: string;
}

export const AZETA_SUPPLIER: SupplierSeed = {
  code: 'AZETA',
  name: 'AZETA DISTRIBUCIONES',
  listPriceDiscountPercent: '17.00',
};
