import { parseArgs } from 'node:util';
import { preparePricingRule } from '../application/set-pricing-rule.js';
import type {
  ActivePricingRule,
  PricingRuleRepository,
} from '../ports/pricing-rule-repository.js';

export interface SetRuleDependencies {
  stdout: (line: string) => void;
  stderr: (line: string) => void;
  createRepository: () => Promise<{
    repository: PricingRuleRepository;
    close: () => Promise<void>;
  }>;
}

export const SET_RULE_USAGE = `Usage: pricing:set-rule -- --basis <BASIS> --percent <number>

Sets the terms of the 'default' pricing rule and makes it the only active one.

  --basis <BASIS>     ADJUSTMENT_ON_LIST_PRICE: sale = list ex-tax × (1 + percent/100)
                      MARKUP_ON_COST:           sale = cost × (1 + percent/100)
                      MARGIN_ON_PRICE:          sale = cost / (1 − percent/100)
  --percent <number>  Up to 2 decimals; negative only for ADJUSTMENT_ON_LIST_PRICE (> -100)`;

/** Runs the set-rule command and returns the process exit code. */
export async function runSetRuleCli(
  argv: string[],
  deps: SetRuleDependencies,
): Promise<number> {
  let rule: ActivePricingRule;
  try {
    const { values } = parseArgs({
      args: joinOptionValues(argv),
      options: {
        basis: { type: 'string' },
        percent: { type: 'string' },
      },
      strict: true,
      allowPositionals: false,
    });
    if (values.basis === undefined || values.percent === undefined) {
      throw new RangeError('--basis and --percent are required');
    }
    rule = preparePricingRule({ basis: values.basis, percent: values.percent });
  } catch (error) {
    deps.stderr(`${(error as Error).message}\n\n${SET_RULE_USAGE}`);
    return 2;
  }

  let target: Awaited<
    ReturnType<SetRuleDependencies['createRepository']>
  > | null = null;
  try {
    target = await deps.createRepository();
    const stored = await target.repository.activateRule(rule);
    deps.stdout(
      `Active pricing rule ${stored.name}: ${stored.basis} ${stored.percent}%`,
    );
    return 0;
  } catch (error) {
    deps.stderr(
      `Setting the pricing rule failed: ${(error as Error).stack ?? String(error)}`,
    );
    return 1;
  } finally {
    await target?.close();
  }
}

/**
 * Drops pnpm's literal "--" separator and rewrites "--percent -5" as
 * "--percent=-5", since parseArgs rejects values that start with "-".
 */
function joinOptionValues(argv: string[]): string[] {
  const args = argv.filter((arg) => arg !== '--');
  const joined: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const next = args[i + 1];
    if (/^--(basis|percent)$/.test(args[i]) && next !== undefined) {
      joined.push(`${args[i]}=${next}`);
      i++;
    } else {
      joined.push(args[i]);
    }
  }
  return joined;
}
