import { runSetRuleCli } from './run-set-rule.js';

// Entry point of `pnpm pricing:set-rule`.
process.exitCode = await runSetRuleCli(process.argv.slice(2), {
  stdout: (line) => console.log(line),
  stderr: (line) => console.error(line),
  createRepository: async () => {
    const [{ createCliPrismaClient }, { PrismaPricingRepository }] =
      await Promise.all([
        import('../../prisma/create-cli-prisma-client.js'),
        import('../prisma/prisma-pricing-repository.js'),
      ]);
    const prisma = createCliPrismaClient();
    return {
      repository: new PrismaPricingRepository(prisma),
      close: () => prisma.$disconnect(),
    };
  },
});
