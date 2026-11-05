import type { PrismaClient } from '../../generated/prisma/client.js';
import { createCliPrismaClient } from '../../prisma/create-cli-prisma-client.js';
import type { CatalogWriter } from '../ports/catalog-writer.js';
import type { PublisherDiscountRepository } from '../ports/publisher-discount-repository.js';
import { PrismaCatalogWriter } from '../prisma/prisma-catalog-writer.js';
import { PrismaPublisherDiscountRepository } from '../prisma/prisma-publisher-discount-repository.js';

/**
 * Builds the Prisma-backed writer for real imports.
 */
export async function createPrismaWriter(): Promise<{
  writer: CatalogWriter;
  close: () => Promise<void>;
}> {
  const prisma = createPrismaClient();
  return {
    writer: new PrismaCatalogWriter(prisma),
    close: () => prisma.$disconnect(),
  };
}

/**
 * Builds the Prisma-backed publisher discount repository.
 */
export async function createPrismaDiscountRepository(): Promise<{
  repository: PublisherDiscountRepository;
  close: () => Promise<void>;
}> {
  const prisma = createPrismaClient();
  return {
    repository: new PrismaPublisherDiscountRepository(prisma),
    close: () => prisma.$disconnect(),
  };
}

function createPrismaClient(): PrismaClient {
  return createCliPrismaClient(' Use --dry-run to import without a database.');
}
