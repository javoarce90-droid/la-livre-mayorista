import type { ExchangeRateRepository } from '../ports/exchange-rate-repository.js';
import { runSetRateCli } from './run-set-rate.js';
import type { SetRateDependencies } from './run-set-rate.js';

function harness(repository: ExchangeRateRepository) {
  const out: string[] = [];
  const err: string[] = [];
  const close = vi.fn(async () => {});
  const deps: SetRateDependencies = {
    stdout: (line) => out.push(line),
    stderr: (line) => err.push(line),
    createRepository: vi.fn(async () => ({ repository, close })),
  };
  return { deps, close, out: () => out.join('\n'), err: () => err.join('\n') };
}

const record = vi.fn<ExchangeRateRepository['record']>(async (rate) => ({
  ...rate,
  effectiveFrom: new Date('2026-11-05T12:00:00.000Z'),
}));
const storing: ExchangeRateRepository = { record };

describe('runSetRateCli', () => {
  it('stores the rate (pnpm "--" separator included) and prints it', async () => {
    const h = harness(storing);

    const code = await runSetRateCli(['--', '--rate', '1450.5'], h.deps);

    expect(code).toBe(0);
    expect(record).toHaveBeenCalledWith({
      baseCurrency: 'EUR',
      quoteCurrency: 'ARS',
      rate: '1450.5000',
    });
    expect(h.out()).toContain('1 EUR = 1450.5000 ARS');
    expect(h.out()).toContain('2026-11-05T12:00:00.000Z');
    expect(h.close).toHaveBeenCalledOnce();
  });

  it('accepts --from and --to', async () => {
    const h = harness(storing);

    const code = await runSetRateCli(
      ['--rate', '1200', '--from', 'USD', '--to', 'ARS'],
      h.deps,
    );

    expect(code).toBe(0);
    expect(h.out()).toContain('1 USD = 1200.0000 ARS');
  });

  it('rejects a missing or invalid rate with exit code 2 before connecting', async () => {
    for (const argv of [[], ['--rate', 'abc'], ['--rate', '0'], ['--bogus']]) {
      const h = harness(storing);
      expect(await runSetRateCli(argv, h.deps)).toBe(2);
      expect(h.err()).toMatch(/Usage/);
      expect(h.deps.createRepository).not.toHaveBeenCalled();
    }
  });

  it('reports database failures with exit code 1 and still closes', async () => {
    const h = harness({
      record: vi.fn(async () => {
        throw new Error('db down');
      }),
    });

    const code = await runSetRateCli(['--rate', '1450'], h.deps);

    expect(code).toBe(1);
    expect(h.err()).toContain('db down');
    expect(h.close).toHaveBeenCalledOnce();
  });
});
