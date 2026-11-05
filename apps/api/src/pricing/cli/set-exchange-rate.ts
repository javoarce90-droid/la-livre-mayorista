import { runSetRateCli } from './run-set-rate.js';

// Entry point of `pnpm pricing:set-rate`.
process.exitCode = await runSetRateCli(process.argv.slice(2), {
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
