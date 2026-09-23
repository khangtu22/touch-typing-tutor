import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const output = new URL('dist-desktop/', root);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
// Only ship application assets; never embed tests, dependencies, or Rust output.
for (const path of ['js', 'styles', 'assets', 'manifest.json']) {
  await cp(new URL(path, root), new URL(path, output), { recursive: true });
}
let html = await readFile(new URL('index.html', root), 'utf8');
// Desktop works on first launch without internet. Use the existing system font fallbacks.
html = html.replace(/\s*<link[^>]+href="https:\/\/fonts\.(?:googleapis|gstatic)\.com[^>]*>/g, '');
await writeFile(new URL('index.html', output), html);
console.log(`Desktop assets ready: ${fileURLToPath(output)}`);
