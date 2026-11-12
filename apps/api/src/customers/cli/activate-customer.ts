import { customersCliDependencies } from './customers-cli-dependencies.js';
import { runSetStatusCli } from './run-customers-cli.js';

// Entry point of `pnpm customers:activate`.
process.exitCode = await runSetStatusCli(
  process.argv.slice(2),
  'ACTIVE',
  customersCliDependencies(),
);
