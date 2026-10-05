import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

/**
 * Prisma client wired to PostgreSQL through the `pg` driver adapter.
 *
 * The API must boot without a database (e.g. local scaffolding, health checks),
 * so a missing DATABASE_URL only logs a warning and skips the eager connection.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly hasDatabaseUrl: boolean;

  constructor(config: ConfigService) {
    const connectionString = config.get<string>('DATABASE_URL');
    super({ adapter: new PrismaPg({ connectionString }) });
    this.hasDatabaseUrl = Boolean(connectionString);
  }

  async onModuleInit(): Promise<void> {
    if (!this.hasDatabaseUrl) {
      this.logger.warn(
        'DATABASE_URL is not set: skipping database connection. Queries will fail until it is configured.',
      );
      return;
    }
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
