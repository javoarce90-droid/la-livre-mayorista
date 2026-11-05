import type { Mock } from 'vitest';
import type { ExchangeRateRepository } from '../ports/exchange-rate-repository.js';
import { setExchangeRate } from './set-exchange-rate.js';

function repository(): {
  record: Mock<ExchangeRateRepository['record']>;
} {
  return {
    record: vi.fn(async (rate) => ({
      ...rate,
      effectiveFrom: new Date('2026-11-05T12:00:00Z'),
    })),
  };
}

describe('setExchangeRate', () => {
  it('stores the normalized rate for EUR → ARS by default', async () => {
    const repo = repository();

    const stored = await setExchangeRate(repo, { rate: '1450.5' });

    expect(repo.record).toHaveBeenCalledWith({
      baseCurrency: 'EUR',
      quoteCurrency: 'ARS',
      rate: '1450.5000',
    });
    expect(stored.rate).toBe('1450.5000');
  });

  it('accepts other currency codes, upper-casing them', async () => {
    const repo = repository();

    await setExchangeRate(repo, { rate: '1200', from: 'usd', to: 'ars' });

    expect(repo.record).toHaveBeenCalledWith({
      baseCurrency: 'USD',
      quoteCurrency: 'ARS',
      rate: '1200.0000',
    });
  });

  it('rejects invalid rates and currencies without writing', async () => {
    const repo = repository();

    await expect(setExchangeRate(repo, { rate: '0' })).rejects.toThrow(
      RangeError,
    );
    await expect(
      setExchangeRate(repo, { rate: '10', from: 'EURO' }),
    ).rejects.toThrow(/currency/);
    await expect(
      setExchangeRate(repo, { rate: '10', from: 'ARS', to: 'ARS' }),
    ).rejects.toThrow(/differ/);
    expect(repo.record).not.toHaveBeenCalled();
  });
});
