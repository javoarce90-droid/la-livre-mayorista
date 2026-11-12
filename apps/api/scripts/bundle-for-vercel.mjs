// Vercel deploys the contents of dist/ as the function root: apps/api/package.json and the pnpm
// node_modules stay outside it, so Node cannot resolve bare imports from the compiled ESM.
// Bundle the entrypoint (dependencies included) and mark dist/ as an ES module package.
import { writeFileSync } from 'node:fs';
import { build } from 'esbuild';

const dist = new URL('../dist/', import.meta.url);

await build({
  entryPoints: [new URL('main.js', dist).pathname],
  outfile: new URL('main.js', dist).pathname,
  allowOverwrite: true,
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  keepNames: true,
  logLevel: 'warning',
  // CommonJS dependencies call require() inside the ESM bundle.
  banner: { js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);" },
  // Optional Nest integrations this API does not use (loaded lazily by Nest when installed).
  external: [
    '@nestjs/microservices',
    '@nestjs/microservices/*',
    '@nestjs/websockets',
    '@nestjs/websockets/*',
    'class-validator',
    'class-transformer',
    '@fastify/static',
  ],
});

writeFileSync(new URL('package.json', dist), '{ "type": "module" }\n');
