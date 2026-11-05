import { Module } from '@nestjs/common';
import { PrismaPricingRepository } from '../pricing/prisma/prisma-pricing-repository.js';
import type { PricingSettingsRepository } from '../pricing/ports/pricing-settings-repository.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CatalogQueryDeps } from './application/catalog-queries.js';
import {
  CATALOG_BOOK_REPOSITORY,
  CATALOG_QUERY_DEPS,
  PRICING_SETTINGS_REPOSITORY,
} from './catalog.tokens.js';
import { CatalogController } from './http/catalog.controller.js';
import type { CatalogBookRepository } from './ports/catalog-book-repository.js';
import { PrismaCatalogBookRepository } from './prisma/prisma-catalog-book-repository.js';

@Module({
  controllers: [CatalogController],
  providers: [
    {
      provide: CATALOG_BOOK_REPOSITORY,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new PrismaCatalogBookRepository(prisma),
    },
    {
      provide: PRICING_SETTINGS_REPOSITORY,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => new PrismaPricingRepository(prisma),
    },
    {
      provide: CATALOG_QUERY_DEPS,
      inject: [CATALOG_BOOK_REPOSITORY, PRICING_SETTINGS_REPOSITORY],
      useFactory: (
        books: CatalogBookRepository,
        pricing: PricingSettingsRepository,
      ): CatalogQueryDeps => ({ books, pricing, now: () => new Date() }),
    },
  ],
})
export class CatalogModule {}
