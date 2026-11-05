import type { PricingRuleRepository } from '../ports/pricing-rule-repository.js';
import { runSetRuleCli } from './run-set-rule.js';
import type { SetRuleDependencies } from './run-set-rule.js';

function harness(repository: PricingRuleRepository) {
  const out: string[] = [];
  const err: string[] = [];
  const close = vi.fn(async () => {});
  const deps: SetRuleDependencies = {
    stdout: (line) => out.push(line),
    stderr: (line) => err.push(line),
    createRepository: vi.fn(async () => ({ repository, close })),
  };
  return { deps, close, out: () => out.join('\n'), err: () => err.join('\n') };
}

describe('runSetRuleCli', () => {
  it('activates the rule and prints it', async () => {
    const h = harness({ activateRule: vi.fn(async (rule) => rule) });

    const code = await runSetRuleCli(
      ['--', '--basis', 'ADJUSTMENT_ON_LIST_PRICE', '--percent', '-5'],
      h.deps,
    );

    expect(code).toBe(0);
    expect(h.out()).toContain('default: ADJUSTMENT_ON_LIST_PRICE -5.00%');
    expect(h.close).toHaveBeenCalledOnce();
  });

  it('rejects missing or invalid options with exit code 2 before connecting', async () => {
    for (const argv of [
      [],
      ['--basis', 'ADJUSTMENT_ON_LIST_PRICE'],
      ['--basis', 'X', '--percent', '0'],
    ]) {
      const h = harness({ activateRule: vi.fn() });
      expect(await runSetRuleCli(argv, h.deps)).toBe(2);
      expect(h.err()).toMatch(/Usage/);
      expect(h.deps.createRepository).not.toHaveBeenCalled();
    }
  });

  it('reports database failures with exit code 1 and still closes', async () => {
    const h = harness({
      activateRule: vi.fn(async () => {
        throw new Error('db down');
      }),
    });

    const code = await runSetRuleCli(
      ['--basis', 'MARKUP_ON_COST', '--percent', '20'],
      h.deps,
    );

    expect(code).toBe(1);
    expect(h.err()).toContain('db down');
    expect(h.close).toHaveBeenCalledOnce();
  });
});
