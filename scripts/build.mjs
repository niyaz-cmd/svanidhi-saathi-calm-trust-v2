import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const output = resolve(root, 'dist');
const entries = [
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'service-worker.js',
  'src',
  'public'
];

await rm(output, { recursive:true, force:true });
await mkdir(output, { recursive:true });

for (const entry of entries) {
  await cp(resolve(root, entry), resolve(output, entry), { recursive:true });
}

console.log(`Prepared ${entries.length} static app entries in dist/.`);
