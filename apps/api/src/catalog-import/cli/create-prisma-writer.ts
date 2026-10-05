import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import type { CatalogWriter } from '../ports/catalog-writer.js';
import { PrismaCatalogWriter } from '../prisma/prisma-catalog-writer.js';

/** apps/api/.env, from both src/catalog-import/cli and dist/catalog-import/cli. */
const ENV_FILE = fileURLToPath(new URL('../../../.env', import.meta.url));

/**
 * Builds the Prisma-backed writer for real imports. Loads apps/api/.env when
 * present (variables already set in the environment take precedence).
 */
export async function createPrismaWriter(): Promise<{
  writer: CatalogWriter;
  close: () => Promise<void>;
}> {
  if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set (apps/api/.env). Use --dry-run to import without a database.',
    );
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  return {
    writer: new PrismaCatalogWriter(prisma),
    close: () => prisma.$disconnect(),
  };
}
