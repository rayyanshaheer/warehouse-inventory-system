import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rootsToCheck = ['src', 'public', 'scripts'];
const files = [];

function collectJsFiles(relativeDir) {
  const absoluteDir = path.join(rootDir, relativeDir);

  let entries = [];
  try {
    entries = readdirSync(absoluteDir);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return;
    }

    throw error;
  }

  for (const entry of entries) {
    const absolutePath = path.join(absoluteDir, entry);
    const relativePath = path.relative(rootDir, absolutePath);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      collectJsFiles(relativePath);
      continue;
    }

    if (/\.(mjs|js)$/.test(entry)) {
      files.push(relativePath);
    }
  }
}

for (const root of rootsToCheck) {
  collectJsFiles(root);
}

if (files.length === 0) {
  console.log('No JavaScript files found.');
  process.exit(0);
}

let failed = false;

for (const file of files.sort()) {
  const result = spawnSync(process.execPath, ['--check', file], {
    cwd: rootDir,
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    failed = true;
    process.stderr.write(result.stderr);
  } else {
    console.log(`ok ${file}`);
  }
}

process.exit(failed ? 1 : 0);

