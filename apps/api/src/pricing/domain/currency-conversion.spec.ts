import { convertToMinorUnits, parseExchangeRate } from './currency-conversion.js';

describe('parseExchangeRate', () => {
  it('normalizes a positive decimal to four decimals', () => {
    expect(parseExchangeRate('1450')).toBe('1450.0000');
    expect(parseExchangeRate(' 1234.5 ')).toBe('1234.5000');
    expect(parseExchangeRate('0.0001')).toBe('0.0001');
  });

  it('rejects zero, negatives, too many decimals and garbage', () => {
    for (const bad of ['0', '0.0000', '-5', '1.23456', 'abc', '', '1e3', '12345678901']) {
      expect(() => parseExchangeRate(bad)).toThrow(RangeError);
    }
  });
});

describe('convertToMinorUnits', () => {
  it('multiplies an amount by the rate and returns whole cents', () => {
    expect(convertToMinorUnits('12.00', '1450.0000')).toBe(1_740_000n);
  });

  it('rounds half up to whole cents', () => {
    // 0.01 × 0.5 = 0.005 → 0.01
    expect(convertToMinorUnits('0.01', '0.5')).toBe(1n);
    // 0.01 × 0.4999 = 0.004999 → 0.00
    expect(convertToMinorUnits('0.01', '0.4999')).toBe(0n);
    // 13.69 × 1234.5678 = 16901.233182 → 16901.23
    expect(convertToMinorUnits('13.69', '1234.5678')).toBe(1_690_123n);
  });

  it('accepts Decimal-like values', () => {
    const decimal = (text: string) => ({ toFixed: () => text });
    expect(convertToMinorUnits(decimal('10.00'), decimal('1500.0000'))).toBe(
      1_500_000n,
    );
  });
});
