import { runCli } from './run-cli.js';

// Entry point of `pnpm import:onix`. pnpm runs scripts from apps/api, so
// relative paths resolve against INIT_CWD (where the user ran pnpm).
process.exitCode = await runCli(
  process.argv.slice(2),
  {
    stdout: (line) => console.log(line),
    stderr: (line) => console.error(line),
    createWriter: async () => {
      const { createPrismaWriter } = await import('./create-prisma-writer.js');
      return createPrismaWriter();
    },
  },
  process.env.INIT_CWD ?? process.cwd(),
);
