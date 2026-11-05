import { applyPublisherDiscounts } from '../application/apply-publisher-discounts.js';
import type { PublisherDiscountRepository } from '../ports/publisher-discount-repository.js';

export interface ApplyDiscountsDependencies {
  stdout: (line: string) => void;
  stderr: (line: string) => void;
  createRepository: () => Promise<{
    repository: PublisherDiscountRepository;
    close: () => Promise<void>;
  }>;
}

export const APPLY_DISCOUNTS_USAGE = `Usage: catalog:apply-discounts

Sets brand and list price discount on the existing publishers whose name
matches a configured variant (src/catalog-import/domain/publisher-discounts.ts).
Takes no options.`;

/** Runs the apply step and returns the process exit code. */
export async function runApplyDiscountsCli(
  argv: string[],
  deps: ApplyDiscountsDependencies,
): Promise<number> {
  // pnpm forwards the "--" separator literally.
  const unexpected = argv.filter((arg) => arg !== '--');
  if (unexpected.length > 0) {
    deps.stderr(
      `Unexpected arguments: ${unexpected.join(' ')}\n\n${APPLY_DISCOUNTS_USAGE}`,
    );
    return 2;
  }

  let target: Awaited<
    ReturnType<ApplyDiscountsDependencies['createRepository']>
  > | null = null;
  try {
    target = await deps.createRepository();
    const report = await applyPublisherDiscounts(target.repository);
    const width = Math.max(...report.map((r) => r.brand.length));
    for (const { brand, percent, updated } of report) {
      deps.stdout(
        `${brand.padEnd(width)}  ${percent.padStart(6)}%  ${updated}`,
      );
    }
    const total = report.reduce((sum, r) => sum + r.updated, 0);
    deps.stdout(`\nTotal: ${total} publisher rows updated`);
    return 0;
  } catch (error) {
    deps.stderr(
      `Applying discounts failed: ${(error as Error).stack ?? String(error)}`,
    );
    return 1;
  } finally {
    await target?.close();
  }
}
