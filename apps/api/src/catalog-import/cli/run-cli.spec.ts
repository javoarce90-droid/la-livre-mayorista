import { fileURLToPath } from 'node:url';
import type { CatalogEntry } from '../domain/catalog-entry.js';
import type { CatalogWriter } from '../ports/catalog-writer.js';
import { parseCliArgs, runCli } from './run-cli.js';
import type { CliDependencies } from './run-cli.js';

const FIXTURE = fileURLToPath(
  new URL('../onix/__fixtures__/sample.onix.xml', import.meta.url),
);

function harness(writer?: CatalogWriter & { batches?: CatalogEntry[][] }) {
  const out: string[] = [];
  const err: string[] = [];
  const close = vi.fn(async () => {});
  const createWriter = vi.fn(async () => {
    if (!writer) throw new Error('no writer configured');
    return { writer, close };
  });
  const deps: CliDependencies = {
    stdout: (line) => out.push(line),
    stderr: (line) => err.push(line),
    createWriter,
  };
  return {
    deps,
    createWriter,
    close,
    out: () => out.join('\n'),
    err: () => err.join('\n'),
  };
}

function recordingWriter() {
  const batches: CatalogEntry[][] = [];
  const writeBatch = vi.fn(async (entries: CatalogEntry[]) => {
    batches.push(entries);
  });
  const writer: CatalogWriter = { prepare: vi.fn(async () => {}), writeBatch };
  return { writer, writeBatch, batches };
}

describe('parseCliArgs', () => {
  it('parses every option and ignores the "--" separator forwarded by pnpm', () => {
    expect(
      parseCliArgs(
        [
          '--',
          '--file',
          'catalog.zip',
          '--limit',
          '1000',
          '--include-publisher',
          'DEBOLSILLO',
          '--include-publisher',
          'ALFAGUARA',
          '--dry-run',
          '--batch-size',
          '250',
        ],
        '/data',
      ),
    ).toEqual({
      file: '/data/catalog.zip',
      limit: 1000,
      includePublishers: ['DEBOLSILLO', 'ALFAGUARA'],
      dryRun: true,
      batchSize: 250,
    });
  });

  it('applies defaults', () => {
    expect(parseCliArgs(['--file', '/abs/onix.xml'], '/data')).toEqual({
      file: '/abs/onix.xml',
      limit: undefined,
      includePublishers: [],
      dryRun: false,
      batchSize: 500,
    });
  });

  it.each([
    [[]],
    [['--file', 'x.xml', '--limit', 'abc']],
    [['--file', 'x.xml', '--limit', '-3']],
    [['--file', 'x.xml', '--batch-size', '0']],
    [['--file', 'x.xml', '--unknown']],
  ])('rejects invalid arguments %j', (argv) => {
    expect(() => parseCliArgs(argv, '/data')).toThrow();
  });
});

describe('runCli', () => {
  it('dry-run parses and selects without creating a writer, printing a summary and samples', async () => {
    const h = harness();

    const code = await runCli(['--file', FIXTURE, '--dry-run'], h.deps);

    expect(code).toBe(0);
    expect(h.createWriter).not.toHaveBeenCalled();
    expect(h.out()).toMatch(/Read:\s+4/);
    expect(h.out()).toMatch(/Selected:\s+2/);
    expect(h.out()).toMatch(
      /Skipped:\s+2 \(missing ISBN: 1, missing title: 1\)/,
    );
    expect(h.out()).toMatch(/Written:\s+0 \(dry run\)/);
    expect(h.out()).toContain('9788466359207');
    expect(h.out()).toContain('9786072650688');
  });

  it('dry-run honours --limit and --include-publisher', async () => {
    const limited = harness();
    await runCli(
      ['--file', FIXTURE, '--dry-run', '--limit', '1'],
      limited.deps,
    );
    expect(limited.out()).toMatch(/Selected:\s+1/);

    const included = harness();
    await runCli(
      [
        '--file',
        FIXTURE,
        '--dry-run',
        '--limit',
        '0',
        '--include-publisher',
        'manual moderno',
      ],
      included.deps,
    );
    expect(included.out()).toMatch(/Selected:\s+1/);
    expect(included.out()).toContain('9786072650688');
    expect(included.out()).not.toContain('"9788466359207"');
  });

  it('writes through the writer and always closes it', async () => {
    const { writer, batches } = recordingWriter();
    const h = harness(writer);

    const code = await runCli(['--file', FIXTURE], h.deps);

    expect(code).toBe(0);
    expect(batches.flat().map((e) => e.isbn13)).toEqual([
      '9788466359207',
      '9786072650688',
    ]);
    expect(h.out()).toMatch(/Written:\s+2/);
    expect(h.close).toHaveBeenCalledOnce();
  });

  it('reports failures with exit code 1 and still closes the writer', async () => {
    const { writer, writeBatch } = recordingWriter();
    writeBatch.mockRejectedValue(new Error('db down'));
    const h = harness(writer);

    const code = await runCli(['--file', FIXTURE], h.deps);

    expect(code).toBe(1);
    expect(h.err()).toContain('db down');
    expect(h.close).toHaveBeenCalledOnce();
  });

  it('prints usage and exits with 2 on invalid arguments', async () => {
    const h = harness();

    const code = await runCli(['--limit', '5'], h.deps);

    expect(code).toBe(2);
    expect(h.err()).toMatch(/Usage/);
  });
});
