// Vercel deploys the contents of dist/ as the function root, without apps/api/package.json,
// so Node would load the compiled ESM as CommonJS. Mark dist/ as an ES module package.
import { writeFileSync } from 'node:fs';

writeFileSync(new URL('../dist/package.json', import.meta.url), '{ "type": "module" }\n');
