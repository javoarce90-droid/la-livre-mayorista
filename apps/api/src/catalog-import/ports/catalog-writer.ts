import type { CatalogEntry, SupplierSeed } from '../domain/catalog-entry.js';

export interface ImportContext {
  supplier: SupplierSeed;
  /** ONIX Header SentDateTime of the feed being imported. */
  sourceSentAt: Date;
}

/** Persists catalog entries. Implemented by the Prisma adapter. */
export interface CatalogWriter {
  /** Called once before the first batch (supplier, default pricing rule...). */
  prepare(context: ImportContext): Promise<void>;
  /** Writes a batch atomically (all or nothing). */
  writeBatch(entries: CatalogEntry[]): Promise<void>;
}
