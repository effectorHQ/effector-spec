#!/usr/bin/env node

/**
 * validate-manifest — Validate an effector.toml against the Effector spec.
 *
 * Usage:
 *   node validate-manifest.js <path/to/effector.toml>
 *   node validate-manifest.js <path/to/effector.toml> --types <path/to/types.json>
 *
 * Checks:
 *   1. Required fields: name, version, type, description
 *   2. Name pattern: kebab-case, 2-64 chars, optional @scope
 *   3. Version: valid semver
 *   4. Type: one of skill | extension | workflow | workspace | bridge | prompt
 *   5. Description: 10-200 characters
 *   6. If --types: validates interface type names against types.json
 *
 * Zero external dependencies.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';

// ─── Minimal TOML Parser ─────────────────────────────────────

function parseToml(content) {
  const result = {};

  const extractString = (line) => {
    const m = line.match(/=\s*"(.+?)"/);
    return m ? m[1] : null;
  };
  const extractBool = (line) => {
    const m = line.match(/=\s*(true|false)/);
    return m ? m[1] === 'true' : null;
  };
  const extractInt = (line) => {
    const m = line.match(/=\s*(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  };
  const extractArray = (line) => {
    const m = line.match(/=\s*\[([^\]]*)\]/);
    if (!m) return null;
    return m[1].split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
  };

  // Extract fields
  const fields = ['name', 'version', 'type', 'description', 'license', 'emoji',
    'min-spec-version', 'repository', 'homepage', 'documentation'];

  for (const field of fields) {
    const match = content.match(new RegExp(`^\\s*${field}\\s*=\\s*"(.+?)"`, 'm'));
    if (match) result[field] = match[1];
  }

  // Extract arrays
  for (const field of ['tags', 'authors']) {
    const val = extractArray(content.match(new RegExp(`^\\s*${field}\\s*=\\s*\\[([^\\]]*)\\]`, 'm'))?.[0] || '');
    if (val) result[field] = val;
  }

  // Extract interface section
  const iface = {};
  const inputMatch = content.match(/^\s*input\s*=\s*"(.+?)"/m);
  const outputMatch = content.match(/^\s*output\s*=\s*"(.+?)"/m);
  const contextMatch = content.match(/^\s*context\s*=\s*\[([^\]]*)\]/m);

  if (inputMatch) iface.input = inputMatch[1];
  if (outputMatch) iface.output = outputMatch[1];
  if (contextMatch) {
    iface.context = contextMatch[1].split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
  }

  if (Object.keys(iface).length > 0) result.interface = iface;

  // Extract permissions
  const perms = {};
  const networkMatch = content.match(/^\s*network\s*=\s*(true|false)/m);
  const subprocessMatch = content.match(/^\s*subprocess\s*=\s*(true|false)/m);
  if (networkMatch) perms.network = networkMatch[1] === 'true';
  if (subprocessMatch) perms.subprocess = subprocessMatch[1] === 'true';

  const envReadMatch = content.match(/^\s*env-read\s*=\s*\[([^\]]*)\]/m);
  if (envReadMatch) {
    perms['env-read'] = envReadMatch[1].split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
  }

  if (Object.keys(perms).length > 0) result.permissions = perms;

  return result;
}

// ─── Schema Validation ───────────────────────────────────────

function validateManifest(manifest) {
  const errors = [];
  const warnings = [];

  // Required fields
  for (const field of ['name', 'version', 'type', 'description']) {
    if (!manifest[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Name pattern
  if (manifest.name) {
    const namePattern = /^(@[a-z0-9-]+\/)?[a-z0-9-]{2,64}$/;
    if (!namePattern.test(manifest.name)) {
      errors.push(`Invalid name "${manifest.name}": must be kebab-case, 2-64 chars, optional @scope prefix`);
    }
  }

  // Version (basic semver check)
  if (manifest.version) {
    const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[\w.]+)?(?:\+[\w.]+)?$/;
    if (!semverPattern.test(manifest.version)) {
      errors.push(`Invalid version "${manifest.version}": must be valid semver (MAJOR.MINOR.PATCH)`);
    }
  }

  // Type enum
  if (manifest.type) {
    const validTypes = ['skill', 'extension', 'workflow', 'workspace', 'bridge', 'prompt'];
    if (!validTypes.includes(manifest.type)) {
      errors.push(`Invalid type "${manifest.type}": must be one of ${validTypes.join(', ')}`);
    }
  }

  // Description length
  if (manifest.description) {
    if (manifest.description.length < 10) {
      errors.push(`Description too short (${manifest.description.length} chars): minimum 10 characters`);
    }
    if (manifest.description.length > 200) {
      errors.push(`Description too long (${manifest.description.length} chars): maximum 200 characters`);
    }
  }

  // Tags limit
  if (manifest.tags && manifest.tags.length > 10) {
    warnings.push(`Too many tags (${manifest.tags.length}): maximum 10`);
  }

  // Interface existence recommendation
  if (!manifest.interface && manifest.type !== 'workspace') {
    warnings.push(`No [effector.interface] declared — strongly recommended for type-checked composition`);
  }

  return { errors, warnings };
}

// ─── Type Validation ─────────────────────────────────────────

function validateTypes(manifest, typesCatalog) {
  const warnings = [];

  if (!manifest.interface) return { warnings };

  const allTypes = new Set();
  for (const role of ['input', 'output', 'context']) {
    if (typesCatalog.types[role]) {
      for (const [name, def] of Object.entries(typesCatalog.types[role])) {
        allTypes.add(name);
        if (def.aliases) {
          for (const alias of def.aliases) allTypes.add(alias);
        }
      }
    }
  }

  if (manifest.interface.input && !allTypes.has(manifest.interface.input)) {
    warnings.push(`Unknown input type "${manifest.interface.input}" — not in effector-types stdlib`);
  }

  if (manifest.interface.output && !allTypes.has(manifest.interface.output)) {
    warnings.push(`Unknown output type "${manifest.interface.output}" — not in effector-types stdlib`);
  }

  if (manifest.interface.context) {
    for (const ctx of manifest.interface.context) {
      if (!allTypes.has(ctx)) {
        warnings.push(`Unknown context type "${ctx}" — not in effector-types stdlib`);
      }
    }
  }

  return { warnings };
}

// ─── Exports (for programmatic use) ──────────────────────────

export { parseToml, validateManifest, validateTypes };

// ─── Main (CLI) ──────────────────────────────────────────────

const isCLI = process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.url.replace('file://', ''));

if (isCLI) {
  const args = process.argv.slice(2);
  const tomlPath = args.find(a => !a.startsWith('--'));
  const typesFlag = args.indexOf('--types');
  const typesPath = typesFlag >= 0 ? args[typesFlag + 1] : null;

  if (!tomlPath) {
    console.log(`
validate-manifest — Validate effector.toml against the Effector spec

Usage:
  node validate-manifest.js <path/to/effector.toml>
  node validate-manifest.js <path/to/effector.toml> --types <path/to/types.json>
`);
    process.exit(0);
  }

  try {
    const content = readFileSync(resolve(tomlPath), 'utf-8');
    const manifest = parseToml(content);
    const { errors, warnings } = validateManifest(manifest);

    // Type validation
    let typeWarnings = [];
    if (typesPath) {
      const typesCatalog = JSON.parse(readFileSync(resolve(typesPath), 'utf-8'));
      const result = validateTypes(manifest, typesCatalog);
      typeWarnings = result.warnings;
    }

    const allWarnings = [...warnings, ...typeWarnings];

    // Output
    console.log(`\n  Validating: ${tomlPath}`);
    console.log(`  Name: ${manifest.name || '(missing)'} v${manifest.version || '(missing)'} [${manifest.type || '(missing)'}]`);

    if (manifest.interface) {
      const input = manifest.interface.input || '*';
      const output = manifest.interface.output || '*';
      const ctx = manifest.interface.context?.join(', ') || 'none';
      console.log(`  Interface: ${input} → ${output} [${ctx}]`);
    }

    if (errors.length === 0 && allWarnings.length === 0) {
      console.log(`\n  \x1b[32m✓ Valid\x1b[0m — no errors or warnings\n`);
      process.exit(0);
    }

    if (errors.length > 0) {
      console.log(`\n  \x1b[31mErrors (${errors.length}):\x1b[0m`);
      for (const err of errors) {
        console.log(`    ✗ ${err}`);
      }
    }

    if (allWarnings.length > 0) {
      console.log(`\n  \x1b[33mWarnings (${allWarnings.length}):\x1b[0m`);
      for (const warn of allWarnings) {
        console.log(`    ⚠ ${warn}`);
      }
    }

    console.log('');
    process.exit(errors.length > 0 ? 1 : 0);

  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
