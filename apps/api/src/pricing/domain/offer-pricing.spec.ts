import { computeSalePrice, computeUnitCost } from './offer-pricing.js';

describe('computeUnitCost', () => {
  it('derives the cost from the list price excluding tax and the publisher discount', () => {
    expect(
      computeUnitCost({
        netCostAmount: null,
        listPriceExcludingTax: '10000.00',
        publisherDiscountPercent: '35.00',
        supplierDiscountPercent: '17.00',
      }),
    ).toBe('6500.00');
  });

  it('falls back to the supplier discount when the publisher has none', () => {
    expect(
      computeUnitCost({
        netCostAmount: null,
        listPriceExcludingTax: '10000.00',
        publisherDiscountPercent: null,
        supplierDiscountPercent: '17.00',
      }),
    ).toBe('8300.00');
  });

  it('prefers an explicit net cost over the derived one', () => {
    expect(
      computeUnitCost({
        netCostAmount: '42.5',
        listPriceExcludingTax: '10000.00',
        publisherDiscountPercent: '35.00',
        supplierDiscountPercent: '17.00',
      }),
    ).toBe('42.50');
  });

  it('returns null without a list price or without any discount', () => {
    expect(
      computeUnitCost({
        netCostAmount: null,
        listPriceExcludingTax: null,
        publisherDiscountPercent: '35.00',
        supplierDiscountPercent: '17.00',
      }),
    ).toBeNull();
    expect(
      computeUnitCost({
        netCostAmount: null,
        listPriceExcludingTax: '10.00',
        publisherDiscountPercent: null,
        supplierDiscountPercent: null,
      }),
    ).toBeNull();
  });

  it('rounds half up to cents without float drift', () => {
    // 11.49 × 0.65 = 7.4685 → 7.47
    expect(
      computeUnitCost({
        netCostAmount: null,
        listPriceExcludingTax: '11.49',
        publisherDiscountPercent: '35.00',
        supplierDiscountPercent: null,
      }),
    ).toBe('7.47');
    // 0.10 × 0.75 = 0.075 → 0.08 (binary floats give 0.07499…)
    expect(
      computeUnitCost({
        netCostAmount: null,
        listPriceExcludingTax: '0.10',
        publisherDiscountPercent: '25',
        supplierDiscountPercent: null,
      }),
    ).toBe('0.08');
  });

  it('accepts Decimal-like values such as Prisma.Decimal', () => {
    const decimal = (value: string) => ({ toFixed: () => value });

    expect(
      computeUnitCost({
        netCostAmount: null,
        listPriceExcludingTax: decimal('20.00'),
        publisherDiscountPercent: decimal('31.00'),
        supplierDiscountPercent: null,
      }),
    ).toBe('13.80');
  });

  it.each([['-1.00'], ['1.234'], ['abc'], ['']])(
    'rejects the invalid amount %j',
    (amount) => {
      expect(() =>
        computeUnitCost({
          netCostAmount: null,
          listPriceExcludingTax: amount,
          publisherDiscountPercent: '35.00',
          supplierDiscountPercent: null,
        }),
      ).toThrow(/amount|decimal/i);
    },
  );

  it('rejects a discount above 100%', () => {
    expect(() =>
      computeUnitCost({
        netCostAmount: null,
        listPriceExcludingTax: '10.00',
        publisherDiscountPercent: '100.01',
        supplierDiscountPercent: null,
      }),
    ).toThrow(/discount/i);
  });
});

describe('computeSalePrice', () => {
  const markup = { basis: 'MARKUP_ON_COST', percent: '20.00' } as const;

  describe('ADJUSTMENT_ON_LIST_PRICE', () => {
    const adjustment = (percent: string) =>
      ({ basis: 'ADJUSTMENT_ON_LIST_PRICE', percent }) as const;

    it('sells at the list price excluding tax when the adjustment is 0', () => {
      expect(
        computeSalePrice(
          { cost: '6.50', listPriceExcludingTax: '10.00' },
          adjustment('0.00'),
        ),
      ).toBe('10.00');
    });

    it('applies a surcharge or a (negative) reduction, rounding half up', () => {
      expect(
        computeSalePrice(
          { cost: null, listPriceExcludingTax: '10.00' },
          adjustment('5'),
        ),
      ).toBe('10.50');
      // 10.05 × 0.9 = 9.045 → 9.05
      expect(
        computeSalePrice(
          { cost: null, listPriceExcludingTax: '10.05' },
          adjustment('-10.00'),
        ),
      ).toBe('9.05');
    });

    it('ignores the cost: no list price means no price', () => {
      expect(
        computeSalePrice(
          { cost: '6.50', listPriceExcludingTax: null },
          adjustment('0'),
        ),
      ).toBeNull();
    });

    it('rejects a reduction of 100% or more', () => {
      expect(() =>
        computeSalePrice(
          { cost: null, listPriceExcludingTax: '10.00' },
          adjustment('-100.00'),
        ),
      ).toThrow(/adjustment/i);
    });

    it('lets a manual override win', () => {
      expect(
        computeSalePrice(
          { cost: null, listPriceExcludingTax: null, override: '9.9' },
          adjustment('0'),
        ),
      ).toBe('9.90');
    });
  });

  it('applies a markup on cost', () => {
    expect(
      computeSalePrice(
        { cost: '6500.00', listPriceExcludingTax: null },
        { basis: 'MARKUP_ON_COST', percent: '20' },
      ),
    ).toBe('7800.00');
  });

  it('applies a margin on the sale price', () => {
    expect(
      computeSalePrice(
        { cost: '6500.00', listPriceExcludingTax: null },
        { basis: 'MARGIN_ON_PRICE', percent: '20.00' },
      ),
    ).toBe('8125.00');
  });

  it('rounds a margin half up to cents', () => {
    // 10.00 / 0.70 = 14.2857… → 14.29
    expect(
      computeSalePrice(
        { cost: '10.00', listPriceExcludingTax: null },
        { basis: 'MARGIN_ON_PRICE', percent: '30.00' },
      ),
    ).toBe('14.29');
  });

  it('lets a manual override win over the rule', () => {
    expect(
      computeSalePrice(
        { cost: '6500.00', listPriceExcludingTax: null, override: '9.9' },
        markup,
      ),
    ).toBe('9.90');
    expect(
      computeSalePrice(
        { cost: null, listPriceExcludingTax: null, override: '9.90' },
        markup,
      ),
    ).toBe('9.90');
  });

  it('ignores a null override and returns null without a cost', () => {
    expect(
      computeSalePrice(
        { cost: '10.00', listPriceExcludingTax: null, override: null },
        markup,
      ),
    ).toBe('12.00');
    expect(
      computeSalePrice({ cost: null, listPriceExcludingTax: '10.00' }, markup),
    ).toBeNull();
  });

  it('rejects a margin of 100% or more', () => {
    expect(() =>
      computeSalePrice(
        { cost: '10.00', listPriceExcludingTax: null },
        { basis: 'MARGIN_ON_PRICE', percent: '100.00' },
      ),
    ).toThrow(/margin/i);
  });

  it('rejects negative percents for cost-based rules', () => {
    expect(() =>
      computeSalePrice(
        { cost: '10.00', listPriceExcludingTax: null },
        { basis: 'MARKUP_ON_COST', percent: '-5' },
      ),
    ).toThrow(RangeError);
  });
});
