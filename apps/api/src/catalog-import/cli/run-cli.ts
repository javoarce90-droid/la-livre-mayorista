import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import {
  DEFAULT_BATCH_SIZE,
  importCatalog,
} from '../application/import-catalog.js';
import type { ImportSummary } from '../application/import-catalog.js';
import type { CatalogEntry } from '../domain/catalog-entry.js';
import { parseOnix } from '../onix/onix-parser.js';
import type { CatalogWriter } from '../ports/catalog-writer.js';
import { openCatalogStream } from '../source/open-catalog-stream.js';

export interface CliOptions {
  file: string;
  limit: number | undefined;
  includePublishers: string[];
  dryRun: boolean;
  batchSize: number;
}

export interface CliDependencies {
  stdout: (line: string) => void;
  stderr: (line: string) => void;
  /** Only called for real imports, never in dry-run mode. */
  createWriter: () => Promise<{
    writer: CatalogWriter;
    close: () => Promise<void>;
  }>;
}

export const USAGE = `Usage: import:onix --file <catalog.zip|catalog.xml> [options]

Options:
  --file <path>                ONIX 3.0 file (.xml, or .zip with an .xml inside)
  --limit <n>                  products to take from publishers not included below
                               (default: all, or 0 when --include-publisher is used)
  --include-publisher <name>   import all products of this publisher (exact name,
                               case-insensitive); repeatable
  --dry-run                    parse and select only; never touches the database
  --batch-size <n>             products per database transaction (default ${DEFAULT_BATCH_SIZE})`;

const SAMPLE_DESCRIPTION_LENGTH = 160;

class UsageError extends Error {}

/**
 * Parses CLI arguments. Relative paths resolve against `baseDir` (the
 * directory the user ran pnpm from, not the package directory).
 */
export function parseCliArgs(argv: string[], baseDir: string): CliOptions {
  let values;
  try {
    ({ values } = parseArgs({
      // pnpm forwards the "--" separator literally.
      args: argv.filter((arg) => arg !== '--'),
      options: {
        file: { type: 'string' },
        limit: { type: 'string' },
        'include-publisher': { type: 'string', multiple: true },
        'dry-run': { type: 'boolean', default: false },
        'batch-size': { type: 'string' },
      },
      strict: true,
      allowPositionals: false,
    }));
  } catch (error) {
    throw new UsageError((error as Error).message);
  }

  if (!values.file) throw new UsageError('--file is required');

  return {
    file: resolve(baseDir, values.file),
    limit:
      values.limit === undefined
        ? undefined
        : nonNegativeInt('--limit', values.limit),
    includePublishers: values['include-publisher'] ?? [],
    dryRun: values['dry-run'],
    batchSize:
      values['batch-size'] === undefined
        ? DEFAULT_BATCH_SIZE
        : positiveInt('--batch-size', values['batch-size']),
  };
}

/** Runs the importer and returns the process exit code. */
export async function runCli(
  argv: string[],
  deps: CliDependencies,
  baseDir: string = process.cwd(),
): Promise<number> {
  let options: CliOptions;
  try {
    options = parseCliArgs(argv, baseDir);
  } catch (error) {
    deps.stderr(`${(error as Error).message}\n\n${USAGE}`);
    return 2;
  }

  let target: Awaited<ReturnType<CliDependencies['createWriter']>> | null =
    null;
  try {
    if (!options.dryRun) target = await deps.createWriter();

    deps.stdout(
      `Importing ${options.file}${options.dryRun ? ' (dry run)' : ''}...`,
    );
    const input = await openCatalogStream(options.file);
    const summary = await importCatalog(parseOnix(input), {
      selection: {
        limit: options.limit,
        includePublishers: options.includePublishers,
      },
      writer: target?.writer ?? null,
      batchSize: options.batchSize,
      log: deps.stdout,
    });
    printSummary(summary, options, deps.stdout);
    return 0;
  } catch (error) {
    deps.stderr(`Import failed: ${(error as Error).stack ?? String(error)}`);
    return 1;
  } finally {
    await target?.close();
  }
}

function printSummary(
  summary: ImportSummary,
  options: CliOptions,
  print: (line: string) => void,
): void {
  const { skippedByReason } = summary;
  print(
    [
      '',
      `Source sent at: ${summary.sourceSentAt?.toISOString() ?? 'unknown'}`,
      `Read:     ${summary.read}${summary.stoppedEarly ? ' (stopped early, limit reached)' : ''}`,
      `Selected: ${summary.selected}`,
      `Skipped:  ${summary.skipped} (missing ISBN: ${skippedByReason['missing-isbn']}, missing title: ${skippedByReason['missing-title']})`,
      `Written:  ${summary.written}${options.dryRun ? ' (dry run)' : ''}`,
      `Duration: ${(summary.durationMs / 1000).toFixed(1)} s`,
    ].join('\n'),
  );
  if (options.dryRun && summary.samples.length > 0) {
    print(`\nSample of ${summary.samples.length} mapped products:`);
    print(JSON.stringify(summary.samples.map(forDisplay), null, 2));
  }
}

function forDisplay(entry: CatalogEntry): CatalogEntry {
  const { description } = entry;
  return {
    ...entry,
    description:
      description && description.length > SAMPLE_DESCRIPTION_LENGTH
        ? `${description.slice(0, SAMPLE_DESCRIPTION_LENGTH)}…`
        : description,
  };
}

function nonNegativeInt(flag: string, value: string): number {
  if (!/^\d+$/.test(value)) {
    throw new UsageError(`${flag} must be an integer >= 0, got "${value}"`);
  }
  return Number(value);
}

function positiveInt(flag: string, value: string): number {
  const n = nonNegativeInt(flag, value);
  if (n === 0) throw new UsageError(`${flag} must be greater than 0`);
  return n;
}
