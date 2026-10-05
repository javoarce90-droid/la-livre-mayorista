import { createReadStream } from 'node:fs';
import { access } from 'node:fs/promises';
import { extname } from 'node:path';
import type { Readable } from 'node:stream';
import yauzl from 'yauzl';

/**
 * Opens an ONIX catalog as a byte stream: either a plain `.xml` file or the
 * first `.xml` entry of a `.zip` archive, decompressed on the fly (the archive
 * is never extracted to disk nor loaded in memory).
 */
export async function openCatalogStream(path: string): Promise<Readable> {
  const extension = extname(path).toLowerCase();
  if (extension === '.xml') {
    await access(path);
    return createReadStream(path);
  }
  if (extension === '.zip') return openFirstXmlEntry(path);
  throw new Error(`Unsupported catalog file "${path}": expected .xml or .zip`);
}

async function openFirstXmlEntry(path: string): Promise<Readable> {
  const zipfile = await yauzl.openPromise(path, {
    lazyEntries: true,
    autoClose: false,
  });
  try {
    for await (const entry of zipfile.eachEntry()) {
      if (entry.fileName.toLowerCase().endsWith('.xml')) {
        return await zipfile.openReadStreamPromise(entry);
      }
    }
    throw new Error(`Catalog archive "${path}" has no .xml entry`);
  } finally {
    // Stops reading further entries; the file descriptor is released once the
    // returned stream ends or is destroyed.
    zipfile.close();
  }
}
