import { Prisma } from '../../generated/prisma/client.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type {
  ApplyBrandDiscountInput,
  PublisherDiscountRepository,
} from '../ports/publisher-discount-repository.js';

/** Prisma adapter of `PublisherDiscountRepository`. */
export class PrismaPublisherDiscountRepository implements PublisherDiscountRepository {
  constructor(private readonly prisma: Pick<PrismaClient, '$executeRaw'>) {}

  async applyBrand(input: ApplyBrandDiscountInput): Promise<number> {
    // Both sides are normalized by the same SQL functions, so the comparison
    // never depends on how the database collation upper-cases accents.
    return this.prisma.$executeRaw(Prisma.sql`
      UPDATE "Publisher" p SET "brand" = ${input.brand},
        "listPriceDiscountPercent" = ${input.percent}::numeric
      FROM "Supplier" s
      WHERE s."id" = p."supplierId" AND s."code" = ${input.supplierCode}
        AND upper(trim(p."name")) IN (SELECT upper(trim(n)) FROM jsonb_array_elements_text(${JSON.stringify(input.names)}::jsonb) AS n)`);
  }
}
