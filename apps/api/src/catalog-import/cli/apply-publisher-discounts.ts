import { runApplyDiscountsCli } from './run-apply-discounts.js';

// Entry point of `pnpm catalog:apply-discounts`.
process.exitCode = await runApplyDiscountsCli(process.argv.slice(2), {
  stdout: (line) => console.log(line),
  stderr: (line) => console.error(line),
  createRepository: async () => {
    const { createPrismaDiscountRepository } =
      await import('./create-prisma-writer.js');
    return createPrismaDiscountRepository();
  },
});
