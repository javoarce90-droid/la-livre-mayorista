import { normalizePublisherName } from './publisher-name.js';

/** One sellable publisher brand and the feed name variants it appears under. */
export interface PublisherBrandDiscount {
  /** Display and grouping name, e.g. "Paidós". */
  brand: string;
  /** Distributor discount on the list price excluding tax, e.g. "35.00". */
  percent: string;
  /** Exact feed publisher names (matched trimmed and case-insensitively). */
  names: readonly string[];
}

/** Per-publisher discounts negotiated with one supplier. */
export interface PublisherDiscountConfig {
  /** `Supplier.code` the discounts apply to. */
  supplierCode: string;
  brands: readonly PublisherBrandDiscount[];
}

export interface ResolvedPublisherDiscount {
  brand: string;
  percent: string;
}

/**
 * Publishers La Livre sells from the Azeta feed. Only these are sold; any
 * other publisher keeps a null discount. Versioned here so every change is
 * reviewed, and applied to the database by the importer or by
 * `catalog:apply-discounts`.
 */
export const AZETA_PUBLISHER_DISCOUNTS: PublisherDiscountConfig = {
  supplierCode: 'AZETA',
  brands: [
    {
      brand: 'Debolsillo',
      percent: '35.00',
      names: [
        'DEBOLSILLO',
        'NUEVAS EDICIONES DEBOLSILLO S.L',
        'Nuevas Ediciones de Bolsillo',
        'NUEVAS EDICIONES DE BOLSILLO S.L',
      ],
    },
    { brand: 'Booket', percent: '31.00', names: ['Booket'] },
    {
      brand: 'Beascoa',
      percent: '35.00',
      names: ['BEASCOA', 'BEASCOA, EDICIONES', 'BEASCOA EDICIONES'],
    },
    { brand: 'Arkano Books', percent: '31.00', names: ['Arkano Books'] },
    { brand: 'Debate', percent: '35.00', names: ['DEBATE'] },
    {
      brand: 'Destino Infantil y Juvenil',
      percent: '31.00',
      names: [
        'Destino Infantil & Juvenil',
        'DESTINO INFANTIL Y JUVENIL',
        'DESTINO INFANTIL',
      ],
    },
    {
      brand: 'Paidós',
      percent: '31.00',
      // Accents are not normalized, so both spellings are listed.
      names: [
        'Ediciones Paidós',
        'Ediciones Paidos',
        'PAIDOS',
        'PAIDOS ARGENTINA',
      ],
    },
    { brand: 'Wonderbooks', percent: '30.00', names: ['WONDERBOOKS'] },
    {
      brand: 'B de Bolsillo',
      percent: '35.00',
      names: [
        'B de Bolsillo (Ediciones B)',
        'B DE BOLSILLO',
        'B DE BOLSILLO (SELLO)',
        'B DE BOLSILLO (GRUPO ZETA)',
      ],
    },
    {
      brand: 'B de Blok',
      percent: '35.00',
      names: ['B de Blok (Ediciones B)', 'B DE BLOK', 'B de BLOK (SELLO)'],
    },
  ],
};

const lookups = new WeakMap<
  PublisherDiscountConfig,
  ReadonlyMap<string, ResolvedPublisherDiscount>
>();

/**
 * Resolves a feed publisher name to its brand and discount, or null when the
 * publisher is not configured (and therefore not sold).
 */
export function resolvePublisherDiscount(
  publisherName: string | null,
  config: PublisherDiscountConfig = AZETA_PUBLISHER_DISCOUNTS,
): ResolvedPublisherDiscount | null {
  if (publisherName === null) return null;
  return lookup(config).get(normalizePublisherName(publisherName)) ?? null;
}

/** Every configured feed name variant, in configuration order. */
export function configuredPublisherNames(
  config: PublisherDiscountConfig = AZETA_PUBLISHER_DISCOUNTS,
): string[] {
  return config.brands.flatMap((b) => b.names);
}

function lookup(
  config: PublisherDiscountConfig,
): ReadonlyMap<string, ResolvedPublisherDiscount> {
  let map = lookups.get(config);
  if (map) return map;

  const built = new Map<string, ResolvedPublisherDiscount>();
  for (const { brand, percent, names } of config.brands) {
    for (const name of names) {
      const key = normalizePublisherName(name);
      if (built.has(key)) {
        throw new Error(`Publisher name "${key}" is configured more than once`);
      }
      built.set(key, { brand, percent });
    }
  }
  map = built;
  lookups.set(config, map);
  return map;
}
