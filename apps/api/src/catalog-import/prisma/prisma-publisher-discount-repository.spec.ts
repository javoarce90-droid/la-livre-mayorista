import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { PrismaPublisherDiscountRepository } from './prisma-publisher-discount-repository.js';

describe('PrismaPublisherDiscountRepository', () => {
  it('updates the supplier publishers whose trimmed name matches case-insensitively and returns the row count', async () => {
    const executeRaw = vi.fn(async (_query: Prisma.Sql) => 4);
    const client = { $executeRaw: executeRaw } as unknown as PrismaClient;

    const updated = await new PrismaPublisherDiscountRepository(
      client,
    ).applyBrand({
      supplierCode: 'AZETA',
      brand: 'Paidós',
      percent: '31.00',
      names: ['Ediciones Paidós', 'PAIDOS'],
    });

    expect(updated).toBe(4);
    expect(executeRaw).toHaveBeenCalledOnce();
    const query = executeRaw.mock.calls[0][0];
    const sql = query.text.replace(/\s+/g, ' ');
    expect(sql).toContain('UPDATE "Publisher" p SET "brand" = $1');
    expect(sql).toContain('"listPriceDiscountPercent" = $2::numeric');
    expect(sql).toContain('FROM "Supplier" s');
    expect(sql).toContain('s."code" = $3');
    // Both sides go through the same SQL functions, so collation never differs.
    expect(sql).toContain(
      'upper(trim(p."name")) IN (SELECT upper(trim(n)) FROM jsonb_array_elements_text($4::jsonb) AS n)',
    );
    expect(query.values).toEqual([
      'Paidós',
      '31.00',
      'AZETA',
      JSON.stringify(['Ediciones Paidós', 'PAIDOS']),
    ]);
  });
});
