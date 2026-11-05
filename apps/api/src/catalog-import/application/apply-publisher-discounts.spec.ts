import type { PublisherDiscountConfig } from '../domain/publisher-discounts.js';
import type { PublisherDiscountRepository } from '../ports/publisher-discount-repository.js';
import { applyPublisherDiscounts } from './apply-publisher-discounts.js';

const CONFIG: PublisherDiscountConfig = {
  supplierCode: 'AZETA',
  brands: [
    { brand: 'Debolsillo', percent: '35.00', names: ['DEBOLSILLO', 'X S.L'] },
    { brand: 'Booket', percent: '31.00', names: ['Booket'] },
  ],
};

describe('applyPublisherDiscounts', () => {
  it('applies each brand to its name variants and reports the updated rows per brand', async () => {
    const applyBrand = vi.fn(async (input: { brand: string }) =>
      input.brand === 'Booket' ? 0 : 3,
    );
    const repository: PublisherDiscountRepository = { applyBrand };

    const report = await applyPublisherDiscounts(repository, CONFIG);

    expect(applyBrand.mock.calls.map(([input]) => input)).toEqual([
      {
        supplierCode: 'AZETA',
        brand: 'Debolsillo',
        percent: '35.00',
        names: ['DEBOLSILLO', 'X S.L'],
      },
      {
        supplierCode: 'AZETA',
        brand: 'Booket',
        percent: '31.00',
        names: ['Booket'],
      },
    ]);
    expect(report).toEqual([
      { brand: 'Debolsillo', percent: '35.00', updated: 3 },
      { brand: 'Booket', percent: '31.00', updated: 0 },
    ]);
  });
});
