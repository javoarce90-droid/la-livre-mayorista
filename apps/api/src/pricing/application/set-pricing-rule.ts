import type { PricingBasis } from '../domain/offer-pricing.js';
import type {
  ActivePricingRule,
  PricingRuleRepository,
} from '../ports/pricing-rule-repository.js';

export const DEFAULT_RULE_NAME = 'default';

const BASES: readonly PricingBasis[] = [
  'ADJUSTMENT_ON_LIST_PRICE',
  'MARKUP_ON_COST',
  'MARGIN_ON_PRICE',
];

/** Allowed percent range per basis, in hundredths (Decimal(5,2) caps 999.99). */
const RANGES: Record<PricingBasis, { min: number; max: number; text: string }> =
  {
    ADJUSTMENT_ON_LIST_PRICE: { min: -9999, max: 99999, text: '> -100' },
    MARKUP_ON_COST: { min: 0, max: 99999, text: '>= 0' },
    MARGIN_ON_PRICE: { min: 0, max: 9999, text: '>= 0 and < 100' },
  };

export interface SetPricingRuleInput {
  basis: string;
  percent: string;
}

/** Validates and normalizes the input; throws RangeError when invalid. */
export function preparePricingRule(
  input: SetPricingRuleInput,
): ActivePricingRule {
  const basis = input.basis.trim().toUpperCase() as PricingBasis;
  if (!BASES.includes(basis)) {
    throw new RangeError(
      `Invalid basis: "${input.basis}" (expected ${BASES.join(', ')})`,
    );
  }
  const match = /^(-?)(\d{1,3})(?:\.(\d{1,2}))?$/.exec(input.percent.trim());
  if (!match) {
    throw new RangeError(
      `Invalid percent: "${input.percent}" (expected a decimal with up to 2 decimals)`,
    );
  }
  const sign = match[1] === '-' ? -1 : 1;
  const fraction = (match[3] ?? '').padEnd(2, '0');
  const hundredths = sign * (Number(match[2]) * 100 + Number(fraction));
  const range = RANGES[basis];
  if (hundredths < range.min || hundredths > range.max) {
    throw new RangeError(
      `Invalid percent for ${basis}: ${input.percent} (must be ${range.text} and at most 999.99)`,
    );
  }
  const abs = Math.abs(hundredths);
  const percent = `${hundredths < 0 ? '-' : ''}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
  return { name: DEFAULT_RULE_NAME, basis, percent };
}

/** Makes the 'default' rule the only active one, with the given terms. */
export async function setPricingRule(
  repository: PricingRuleRepository,
  input: SetPricingRuleInput,
): Promise<ActivePricingRule> {
  return repository.activateRule(preparePricingRule(input));
}
