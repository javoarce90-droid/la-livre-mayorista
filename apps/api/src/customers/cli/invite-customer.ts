import { customersCliDependencies } from './customers-cli-dependencies.js';
import { runInviteCli } from './run-customers-cli.js';

// Entry point of `pnpm customers:invite`.
process.exitCode = await runInviteCli(
  process.argv.slice(2),
  customersCliDependencies(),
);
