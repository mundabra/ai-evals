import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = dirname(scriptDir);
const packDir = join(rootDir, '.tmp-pack');
const unpackDir = join(packDir, 'unpacked');

rmSync(packDir, { force: true, recursive: true });
mkdirSync(packDir, { recursive: true });
mkdirSync(unpackDir, { recursive: true });

execFileSync('pnpm', ['pack', '--pack-destination', '.tmp-pack'], {
  cwd: rootDir,
  stdio: 'inherit',
});

const tarball = readdirSync(packDir)
  .filter((entry) => entry.endsWith('.tgz'))
  .map((entry) => join(packDir, entry))
  .at(0);

if (!tarball) {
  throw new Error('Pack smoke test failed: no tarball was produced.');
}

execFileSync('tar', ['-xzf', tarball, '-C', unpackDir], {
  cwd: rootDir,
  stdio: 'inherit',
});

const packedPackageDir = join(unpackDir, 'package');
const rootEntry = join(packedPackageDir, 'dist', 'index.js');
const aiSdkEntry = join(packedPackageDir, 'dist', 'ai-sdk.js');

if (!existsSync(rootEntry) || !existsSync(aiSdkEntry)) {
  throw new Error('Pack smoke test failed: expected dist entrypoints are missing from the tarball.');
}

await import(pathToFileURL(rootEntry).href);
await import(pathToFileURL(aiSdkEntry).href);

console.log(`Packed tarball imported successfully from ${tarball}`);
