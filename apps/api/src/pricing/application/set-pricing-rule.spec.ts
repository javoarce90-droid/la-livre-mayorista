import type { PricingRuleRepository } from '../ports/pricing-rule-repository.js';
import { preparePricingRule, setPricingRule } from './set-pricing-rule.js';

describe('preparePricingRule', () => {
  it('normalizes the default rule terms', () => {
    expect(
      preparePricingRule({ basis: 'adjustment_on_list_price', percent: '0' }),
    ).toEqual({
      name: 'default',
      basis: 'ADJUSTMENT_ON_LIST_PRICE',
      percent: '0.00',
    });
    expect(
      preparePricingRule({ basis: 'ADJUSTMENT_ON_LIST_PRICE', percent: '-7.5' })
        .percent,
    ).toBe('-7.50');
  });

  it.each([
    { basis: 'BOGUS', percent: '0' },
    { basis: 'ADJUSTMENT_ON_LIST_PRICE', percent: '-100' },
    { basis: 'ADJUSTMENT_ON_LIST_PRICE', percent: '1000' },
    { basis: 'ADJUSTMENT_ON_LIST_PRICE', percent: '1.234' },
    { basis: 'ADJUSTMENT_ON_LIST_PRICE', percent: 'abc' },
    { basis: 'MARKUP_ON_COST', percent: '-1' },
    { basis: 'MARGIN_ON_PRICE', percent: '100' },
  ])('rejects %o', (input) => {
    expect(() => preparePricingRule(input)).toThrow(RangeError);
  });
});

describe('setPricingRule', () => {
  it('activates the prepared rule', async () => {
    const activateRule = vi.fn<PricingRuleRepository['activateRule']>(
      async (rule) => rule,
    );
    const repository: PricingRuleRepository = { activateRule };

    const stored = await setPricingRule(repository, {
      basis: 'ADJUSTMENT_ON_LIST_PRICE',
      percent: '5',
    });

    expect(activateRule).toHaveBeenCalledWith({
      name: 'default',
      basis: 'ADJUSTMENT_ON_LIST_PRICE',
      percent: '5.00',
    });
    expect(stored.percent).toBe('5.00');
  });
});
