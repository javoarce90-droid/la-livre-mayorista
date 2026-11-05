import { parseArgs } from 'node:util';
import { prepareExchangeRate } from '../application/set-exchange-rate.js';
import type {
  ExchangeRateRepository,
  NewExchangeRate,
} from '../ports/exchange-rate-repository.js';

export interface SetRateDependencies {
  stdout: (line: string) => void;
  stderr: (line: string) => void;
  createRepository: () => Promise<{
    repository: ExchangeRateRepository;
    close: () => Promise<void>;
  }>;
}

export const SET_RATE_USAGE = `Usage: pricing:set-rate -- --rate <number> [--from EUR] [--to ARS]

Stores a new exchange rate, effective now: 1 <from> = <rate> <to>.
Previous rates are kept as history; the latest one applies.

  --rate <number>  Positive decimal, up to 4 decimals (e.g. 1450.50)
  --from <code>    Base currency, ISO 4217 (default EUR)
  --to <code>      Quote currency, ISO 4217 (default ARS)`;

/** Runs the set-rate command and returns the process exit code. */
export async function runSetRateCli(
  argv: string[],
  deps: SetRateDependencies,
): Promise<number> {
  let rate: NewExchangeRate;
  try {
    const { values } = parseArgs({
      // pnpm forwards the "--" separator literally.
      args: argv.filter((arg) => arg !== '--'),
      options: {
        rate: { type: 'string' },
        from: { type: 'string' },
        to: { type: 'string' },
      },
      strict: true,
      allowPositionals: false,
    });
    if (values.rate === undefined) throw new RangeError('--rate is required');
    rate = prepareExchangeRate({
      rate: values.rate,
      from: values.from,
      to: values.to,
    });
  } catch (error) {
    deps.stderr(`${(error as Error).message}\n\n${SET_RATE_USAGE}`);
    return 2;
  }

  let target: Awaited<
    ReturnType<SetRateDependencies['createRepository']>
  > | null = null;
  try {
    target = await deps.createRepository();
    const stored = await target.repository.record(rate);
    deps.stdout(
      `Stored exchange rate: 1 ${stored.baseCurrency} = ${stored.rate} ${stored.quoteCurrency}`,
    );
    deps.stdout(`Effective from: ${stored.effectiveFrom.toISOString()}`);
    return 0;
  } catch (error) {
    deps.stderr(
      `Setting the exchange rate failed: ${(error as Error).stack ?? String(error)}`,
    );
    return 1;
  } finally {
    await target?.close();
  }
}
