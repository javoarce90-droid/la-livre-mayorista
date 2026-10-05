import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// The Prisma CLI does not load .env files on its own, hence `dotenv/config`.
// DIRECT_URL (direct connection or session pooler) is preferred for migrations.
// An empty fallback keeps `prisma generate` / `prisma validate` working without
// credentials; commands that need a database will fail with a clear error.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  },
});
