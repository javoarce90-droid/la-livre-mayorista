import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Readable } from 'node:stream';
import { openCatalogStream } from './open-catalog-stream.js';

const fixture = (name: string): string =>
  fileURLToPath(new URL(`../onix/__fixtures__/${name}`, import.meta.url));

const XML = readFileSync(fixture('sample.onix.xml'));

async function readAll(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

describe('openCatalogStream', () => {
  it('streams a plain .xml file', async () => {
    const stream = await openCatalogStream(fixture('sample.onix.xml'));

    expect(await readAll(stream)).toEqual(XML);
  });

  it('streams the first .xml entry of a .zip archive', async () => {
    const stream = await openCatalogStream(fixture('sample.onix.zip'));

    expect(await readAll(stream)).toEqual(XML);
  });

  it('can be destroyed before the end (early stop)', async () => {
    const stream = await openCatalogStream(fixture('sample.onix.zip'));

    for await (const chunk of stream) {
      expect(chunk).toBeDefined();
      break;
    }

    expect(stream.destroyed).toBe(true);
  });

  it('rejects a .zip without any .xml entry', async () => {
    await expect(openCatalogStream(fixture('no-xml.zip'))).rejects.toThrow(
      /no \.xml entry/,
    );
  });

  it('rejects unsupported extensions and missing files', async () => {
    await expect(openCatalogStream('/tmp/catalog.csv')).rejects.toThrow(
      /\.xml or \.zip/,
    );
    await expect(
      openCatalogStream('/nonexistent/la-livre/catalog.xml'),
    ).rejects.toThrow(/ENOENT/);
  });
});
