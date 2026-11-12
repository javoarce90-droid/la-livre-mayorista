import { customersCliDependencies } from './customers-cli-dependencies.js';
import { runSetStatusCli } from './run-customers-cli.js';

// Entry point of `pnpm customers:suspend`.
process.exitCode = await runSetStatusCli(
  process.argv.slice(2),
  'SUSPENDED',
  customersCliDependencies(),
);
