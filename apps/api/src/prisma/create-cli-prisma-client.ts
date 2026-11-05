import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

/** apps/api/.env, from both src/prisma and dist/prisma. */
const ENV_FILE = fileURLToPath(new URL('../../.env', import.meta.url));

/**
 * Prisma client for command-line tools, connected to DATABASE_URL. Loads
 * apps/api/.env when present (variables already set in the environment take
 * precedence). `hint` is appended to the error when DATABASE_URL is missing.
 */
export function createCliPrismaClient(hint = ''): PrismaClient {
  if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(`DATABASE_URL is not set (apps/api/.env).${hint}`);
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}
