import type { PublisherDiscountRepository } from '../ports/publisher-discount-repository.js';
import { runApplyDiscountsCli } from './run-apply-discounts.js';
import type { ApplyDiscountsDependencies } from './run-apply-discounts.js';

function harness(repository: PublisherDiscountRepository) {
  const out: string[] = [];
  const err: string[] = [];
  const close = vi.fn(async () => {});
  const deps: ApplyDiscountsDependencies = {
    stdout: (line) => out.push(line),
    stderr: (line) => err.push(line),
    createRepository: vi.fn(async () => ({ repository, close })),
  };
  return { deps, close, out: () => out.join('\n'), err: () => err.join('\n') };
}

describe('runApplyDiscountsCli', () => {
  it('prints the updated rows per brand and a total, then closes the connection', async () => {
    const h = harness({
      applyBrand: vi.fn(async ({ brand }) => (brand === 'Debolsillo' ? 5 : 1)),
    });

    const code = await runApplyDiscountsCli([], h.deps);

    expect(code).toBe(0);
    expect(h.out()).toMatch(/Debolsillo\s+35\.00%\s+5/);
    expect(h.out()).toMatch(/Paidós\s+31\.00%\s+1/);
    expect(h.out()).toMatch(/Total:\s+14/);
    expect(h.close).toHaveBeenCalledOnce();
  });

  it('reports failures with exit code 1 and still closes the connection', async () => {
    const h = harness({
      applyBrand: vi.fn(async () => {
        throw new Error('db down');
      }),
    });

    const code = await runApplyDiscountsCli(['--'], h.deps);

    expect(code).toBe(1);
    expect(h.err()).toContain('db down');
    expect(h.close).toHaveBeenCalledOnce();
  });

  it('rejects unexpected arguments with exit code 2', async () => {
    const h = harness({ applyBrand: vi.fn(async () => 0) });

    const code = await runApplyDiscountsCli(['--dry-run'], h.deps);

    expect(code).toBe(2);
    expect(h.err()).toMatch(/Usage/);
    expect(h.deps.createRepository).not.toHaveBeenCalled();
  });
});
