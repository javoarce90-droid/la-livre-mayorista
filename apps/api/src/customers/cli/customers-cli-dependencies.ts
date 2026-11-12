import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createCliPrismaClient } from '../../prisma/create-cli-prisma-client.js';
import { PrismaCustomerRepository } from '../prisma/prisma-customer-repository.js';
import { createSupabaseAuthAdmin } from '../supabase/supabase-auth-admin.js';
import type { CustomersCliDependencies } from './run-customers-cli.js';

/** apps/api/.env, from both src/customers/cli and dist/customers/cli. */
const ENV_FILE = fileURLToPath(new URL('../../../.env', import.meta.url));

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not set (apps/api/.env).`);
  return value;
}

/** Real adapters for the customers CLIs: Prisma and the Supabase admin API. */
export function customersCliDependencies(): CustomersCliDependencies {
  // Variables already set in the environment take precedence.
  if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);
  return {
    stdout: (line) => console.log(line),
    stderr: (line) => console.error(line),
    connect: async () => {
      const prisma = createCliPrismaClient();
      return {
        customers: new PrismaCustomerRepository(prisma),
        close: () => prisma.$disconnect(),
      };
    },
    createAuthAdmin: () =>
      createSupabaseAuthAdmin(
        required('SUPABASE_URL'),
        required('SUPABASE_SECRET_KEY'),
      ),
    webOrigin: () => required('WEB_ORIGIN'),
  };
}
