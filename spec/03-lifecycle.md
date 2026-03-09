# 03 — Effector Lifecycle

**Status:** Draft
**Version:** 0.1.0

---

## Lifecycle Stages

Every Effector moves through a defined lifecycle:

```
Create → Validate → Package → Publish → Discover → Install → Execute
  │         │          │         │          │          │         │
  ▼         ▼          ▼         ▼          ▼          ▼         ▼
Author    Lint &     Bundle   Registry   Search &   Resolve   Runtime
writes    schema    into      indexes    browse     deps &    loads &
manifest  check    artifact  metadata   results    place     invokes
+ entry                                            files
```

## Stage 1: Create

The author creates the Effector package:

1. **Write the entry file(s)** — `SKILL.md`, TypeScript source, `pipeline.yml`, etc.
2. **Write the manifest** — `effector.toml` (or rely on inference for simple skills)
3. **Add supporting files** — README, LICENSE, examples, tests, schemas

### Scaffolding

The `create-effector` CLI generates the correct structure:

```bash
npx create-effector my-effector --type skill
npx create-effector my-extension --type extension
npx create-effector my-workflow --type workflow
```

See [`create-effector`](https://github.com/effectorHQ/create-effector) for details.

## Stage 2: Validate

Before packaging, the Effector is validated against the spec:

### Manifest Validation

- All required fields present and correctly typed
- `name` follows naming conventions
- `version` is valid semver
- `type` is a recognized type
- Referenced files exist
- Dependency constraints are parseable
- Permission declarations are well-formed

### Type-Specific Validation

| Type | Additional Checks |
|------|-------------------|
| `skill` | SKILL.md has valid YAML frontmatter; `name` and `description` present |
| `extension` | Entry file exports expected interface; TypeScript compiles |
| `workflow` | Pipeline YAML is valid; referenced skills exist; no circular dependencies |
| `workspace` | Required files (SOUL.md at minimum) exist |
| `bridge` | Source and target runtimes are declared; adapter entry exists |
| `prompt` | Template variables are valid; entry file is parseable |

### Tooling

```bash
# Validate manifest
effector validate .

# Validate with skill-lint (for skill type)
npx @effectorhq/skill-lint SKILL.md

# Validate in CI
# GitHub Action: effectorHQ/skill-lint-action
```

## Stage 3: Package

Packaging bundles the Effector into a distributable artifact.

### Artifact Format

An Effector package is a **tarball** (`.tar.gz`) containing:

```
my-effector-1.2.0.tar.gz
├── effector.toml          # Manifest (required)
├── SKILL.md               # Entry file (type-dependent)
├── README.md              # Documentation
├── LICENSE                # License file
├── CHANGELOG.md           # Version history
└── schemas/               # Optional: JSON Schemas, examples
```

### Package Naming

```
<name>-<version>.tar.gz
```

Example: `github-pr-review-1.2.0.tar.gz`

For scoped packages: `@effectorhq-skill-lint-2.0.0.tar.gz`

### Checksums

Every package SHOULD include a SHA-256 checksum:

```
github-pr-review-1.2.0.tar.gz.sha256
```

## Stage 4: Publish

Publishing uploads the package to a registry and indexes its metadata.

### Registry Protocol

Registries accept Effector packages and index the following from the manifest:

- `name`, `version`, `type`, `description`
- `tags`, `categories`
- `authors`, `license`
- Runtime bindings (which runtimes are supported)
- Dependencies (for resolution)
- Permissions (for security display)

### Supported Registries

| Registry | Supported Types | Notes |
|----------|----------------|-------|
| **ClawHub** | `skill` | OpenClaw's existing skill registry (3,286+ skills) |
| **npm** | `extension`, `bridge` | Standard npm publishing for code packages |
| **GitHub Releases** | All types | Universal fallback; any type can be published as a release |

### Publishing Commands

```bash
# Publish a skill to ClawHub
clawhub publish

# Publish an extension to npm
npm publish

# Publish any type to GitHub Releases
gh release create v1.2.0 ./dist/my-effector-1.2.0.tar.gz
```

## Stage 5: Discover

Users find Effectors through registry search, curated lists, or direct references.

### Discovery Channels

| Channel | Mechanism |
|---------|-----------|
| **Registry search** | `clawhub search "pr review"`, `npm search @effectorhq` |
| **Curated lists** | [`awesome-openclaw`](https://github.com/effectorHQ/awesome-openclaw) |
| **Direct reference** | GitHub URL, npm package name |
| **Recommendation** | Runtime suggests relevant Effectors based on context |

### Search Metadata

Registries SHOULD support searching by:

- Name and description (full-text)
- Tags and categories
- Effector type
- Runtime compatibility
- Author
- Popularity metrics (downloads, stars, forks)

## Stage 6: Install

Installation resolves dependencies and places files in the correct locations.

### Installation by Type

| Type | Install Location (OpenClaw) | Command |
|------|----------------------------|---------|
| `skill` | `~/.openclaw/workspace/skills/<name>/` | `clawhub install <name>` |
| `extension` | `node_modules/` (project-level) | `npm install <name>` |
| `workflow` | Project-level `pipelines/` directory | `openclaw pipeline install <name>` |
| `workspace` | `~/.openclaw/workspace/` | `cp -r <package>/* ~/.openclaw/workspace/` |
| `bridge` | Runtime-specific (e.g., MCP config) | Varies by target runtime |
| `prompt` | Project-level or workspace `prompts/` | `cp <package>/prompt.md ./prompts/` |

### Dependency Resolution

When installing an Effector with dependencies:

1. Parse the dependency tree from all `[[effector.dependencies]]` entries
2. Resolve version constraints using the target registry
3. Detect and reject circular dependencies
4. Install dependencies before the dependent Effector
5. Verify all `requires.bins` and `requires.env` are satisfied

## Stage 7: Execute

The runtime loads and invokes the Effector at the appropriate time.

### Execution by Type

| Type | Execution Model |
|------|----------------|
| `skill` | Agent reads SKILL.md and follows instructions when contextually relevant |
| `extension` | Runtime calls `register()` at startup; extension hooks into lifecycle events |
| `workflow` | Orchestration engine (Lobster) executes pipeline steps sequentially |
| `workspace` | Runtime loads config files at startup; they shape agent behavior passively |
| `bridge` | Bridge process runs continuously, translating between runtimes |
| `prompt` | Runtime injects prompt content at the appropriate context position |

### Execution Context

Runtimes SHOULD provide Effectors with:

- **Identity** — Which Effector is being executed
- **Configuration** — User-provided config values (from workspace or CLI)
- **Permissions** — What the Effector is allowed to access
- **Dependencies** — Resolved and available co-installed Effectors
- **Logging** — A structured logging interface

### Error Handling

Effectors SHOULD define error behavior:

```toml
[effector.errors]
retry = { max-attempts = 3, backoff = "exponential" }
on-failure = "log"  # log | abort | fallback
fallback = "manual-review"  # Name of fallback Effector
```

## Lifecycle Events

Runtimes MAY emit lifecycle events that extensions and workflows can observe:

| Event | When |
|-------|------|
| `effector.installed` | After successful installation |
| `effector.loaded` | After runtime loads the Effector |
| `effector.invoked` | When execution begins |
| `effector.completed` | After successful execution |
| `effector.failed` | After execution failure |
| `effector.uninstalled` | After removal |

Extensions can subscribe to these events:

```typescript
api.on('effector.installed', (event) => {
  console.log(`New effector installed: ${event.name}@${event.version}`);
});
```
