#!/usr/bin/env node

/**
 * validate-examples — Run validate-manifest against all example manifests.
 *
 * Usage:
 *   node validate-examples.js
 *   node validate-examples.js --types <path/to/types.json>
 *
 * Exits with code 1 if any example fails validation.
 */

import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const examplesDir = resolve(__dirname, '../schemas/examples');
const validatorPath = resolve(__dirname, 'validate-manifest.js');

const args = process.argv.slice(2);
const typesFlag = args.indexOf('--types');
const typesPath = typesFlag >= 0 ? args[typesFlag + 1] : null;

const examples = readdirSync(examplesDir).filter(f => f.endsWith('.toml'));

if (examples.length === 0) {
  console.error('No .toml examples found in', examplesDir);
  process.exit(1);
}

console.log(`\n  Validating ${examples.length} example manifests...\n`);

let passed = 0;
let failed = 0;

for (const example of examples) {
  const tomlPath = join(examplesDir, example);
  const cmdArgs = [validatorPath, tomlPath];

  if (typesPath) {
    cmdArgs.push('--types', resolve(typesPath));
  }

  try {
    const output = execFileSync('node', cmdArgs, { encoding: 'utf-8' });
    process.stdout.write(output);
    passed++;
  } catch (err) {
    process.stdout.write(err.stdout || '');
    process.stderr.write(err.stderr || '');
    failed++;
  }
}

console.log(`  ─────────────────────────────────────`);
console.log(`  Results: ${passed} passed, ${failed} failed out of ${examples.length} total\n`);

process.exit(failed > 0 ? 1 : 0);
