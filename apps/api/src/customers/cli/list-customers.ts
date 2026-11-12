import { customersCliDependencies } from './customers-cli-dependencies.js';
import { runListCli } from './run-customers-cli.js';

// Entry point of `pnpm customers:list`.
process.exitCode = await runListCli(
  process.argv.slice(2),
  customersCliDependencies(),
);
