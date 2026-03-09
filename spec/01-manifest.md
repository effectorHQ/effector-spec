# 01 — The Effector Manifest

**Status:** Draft
**Version:** 0.1.0

---

## File Format

The Effector manifest is a file named `effector.toml` at the root of an Effector package. It uses [TOML v1.0](https://toml.io/en/v1.0.0).

When no `effector.toml` is present, a runtime MAY infer a manifest from existing format-specific files (e.g., SKILL.md frontmatter). This enables backward compatibility with pre-Effector content.

## Required Fields

Every manifest MUST contain the `[effector]` table with these fields:

```toml
[effector]
name = "my-effector"          # kebab-case identifier, unique within a registry
version = "1.0.0"             # Semantic version (MAJOR.MINOR.PATCH)
type = "skill"                # One of: skill, extension, workflow, workspace, bridge, prompt
description = "What it does"  # One-line human-readable description
```

### `name`

- **Type:** String
- **Format:** kebab-case (`[a-z0-9-]+`), 2–64 characters
- **Uniqueness:** Within a given registry namespace
- **Examples:** `github-pr-review`, `docker-deploy`, `morning-briefing`

Scoped names are supported for organizational namespaces:

```toml
name = "@effectorhq/skill-lint"
```

### `version`

- **Type:** String
- **Format:** [Semantic Versioning 2.0.0](https://semver.org/)
- **Pre-release:** Supported (`1.0.0-alpha.1`, `2.0.0-beta.3`)
- **Build metadata:** Supported (`1.0.0+build.42`)

### `type`

- **Type:** String
- **Values:** `skill` | `extension` | `workflow` | `workspace` | `bridge` | `prompt`
- **See:** [02 — Types](02-types.md) for full semantics of each type

### `description`

- **Type:** String
- **Length:** 10–200 characters
- **Purpose:** Displayed in registries, search results, and CLI listings

## Optional Fields

### Metadata

```toml
[effector]
# ... required fields ...
license = "MIT"                          # SPDX license identifier
emoji = "🔍"                             # Single emoji for UI display
tags = ["github", "code-review", "ci"]   # Discovery tags (max 10)
authors = ["Alice <alice@example.com>"]  # Author list
repository = "https://github.com/effectorHQ/github-pr-review"
homepage = "https://effectorhq.dev/effectors/github-pr-review"
documentation = "https://docs.effectorhq.dev/github-pr-review"
min-spec-version = "0.1.0"              # Minimum spec version required
```

### Keywords and Categories

```toml
[effector.categories]
primary = "developer-tools"    # Primary category for registry browsing
secondary = ["ci-cd", "code-quality"]
```

**Standard categories:**

| Category | Examples |
|----------|---------|
| `developer-tools` | Linters, formatters, CI/CD |
| `productivity` | Calendar, email, task management |
| `data` | Databases, analytics, ETL |
| `communication` | Slack, Discord, email |
| `infrastructure` | Docker, Kubernetes, cloud |
| `security` | Scanning, auditing, secrets |
| `content` | Writing, translation, publishing |
| `research` | Web search, academic papers, analysis |

## Runtime Bindings

The `[runtime.*]` tables declare how specific runtimes should consume this Effector. Each runtime binding is optional — an Effector can support one or many runtimes.

### OpenClaw Binding

```toml
[runtime.openclaw]
format = "skill.md"              # The format this binding provides
entry = "SKILL.md"               # Entry file relative to package root
min-version = "0.20.0"           # Minimum OpenClaw version required

[runtime.openclaw.requires]
bins = ["gh", "jq"]             # Required CLI tools
env = ["GITHUB_TOKEN"]          # Required environment variables
skills = ["git-operations"]     # Required co-installed skills

[runtime.openclaw.install]
brew = { formula = "gh", bins = ["gh"] }
apt = { package = "gh", bins = ["gh"] }
manual = { steps = ["Download from https://cli.github.com"] }

[runtime.openclaw.publish]
registry = "clawhub"            # Target registry
tier = "managed"                # bundled | managed | workspace
```

### MCP Binding

```toml
[runtime.mcp]
format = "mcp-tool"
entry = "mcp-adapter.js"        # MCP server entry point
transport = "stdio"             # stdio | sse | streamable-http

[runtime.mcp.tool]
name = "github_pr_review"       # MCP tool name (snake_case)
input-schema = "schemas/input.json"  # JSON Schema for tool input
```

### Claude Agent SDK Binding

```toml
[runtime.claude-agent-sdk]
format = "tool"
entry = "src/tool.ts"
```

### Generic Runtime Binding

For runtimes not yet known, authors can use a generic binding:

```toml
[runtime.generic]
format = "function"
entry = "src/index.js"
exports = ["execute", "validate", "describe"]
```

## Dependencies

Effectors can depend on other Effectors:

```toml
[[effector.dependencies]]
name = "git-operations"
version = ">=1.0.0"
type = "skill"
optional = false

[[effector.dependencies]]
name = "slack-notify"
version = "^2.0.0"
type = "skill"
optional = true     # Used if available, not required
```

**Version constraints** follow npm-style semver ranges:

| Syntax | Meaning |
|--------|---------|
| `1.2.3` | Exact version |
| `^1.2.3` | Compatible with 1.x.y (≥1.2.3, <2.0.0) |
| `~1.2.3` | Approximately 1.2.x (≥1.2.3, <1.3.0) |
| `>=1.0.0` | Any version ≥ 1.0.0 |
| `>=1.0.0, <3.0.0` | Range |
| `*` | Any version |

## Permissions

Security-relevant declarations:

```toml
[effector.permissions]
network = true                   # Requires network access
filesystem = ["read", "write"]   # Filesystem access level
env-read = ["GITHUB_TOKEN", "HOME"]  # Environment variables read
env-write = []                   # Environment variables written
subprocess = true                # Spawns child processes
```

**See:** [06 — Security](06-security.md) for the full permission model.

## Full Example

```toml
[effector]
name = "github-pr-review"
version = "1.2.0"
type = "skill"
description = "Automated pull request review with code analysis and inline suggestions"
license = "MIT"
emoji = "🔍"
tags = ["github", "code-review", "ci", "quality"]
authors = ["effectorHQ Contributors"]
repository = "https://github.com/effectorHQ/github-pr-review"
min-spec-version = "0.1.0"

[effector.categories]
primary = "developer-tools"
secondary = ["ci-cd", "code-quality"]

[[effector.dependencies]]
name = "git-operations"
version = ">=1.0.0"
type = "skill"

[effector.permissions]
network = true
subprocess = true
env-read = ["GITHUB_TOKEN"]

[runtime.openclaw]
format = "skill.md"
entry = "SKILL.md"
min-version = "0.20.0"

[runtime.openclaw.requires]
bins = ["gh", "jq"]
env = ["GITHUB_TOKEN"]

[runtime.openclaw.install]
brew = { formula = "gh", bins = ["gh"] }

[runtime.openclaw.publish]
registry = "clawhub"
tier = "managed"

[runtime.mcp]
format = "mcp-tool"
entry = "mcp/adapter.js"
transport = "stdio"

[runtime.mcp.tool]
name = "github_pr_review"
input-schema = "mcp/input-schema.json"
```

## Manifest Inference

When no `effector.toml` exists, runtimes SHOULD attempt to infer a manifest from existing files:

| Source | Inferred Type | Inferred Fields |
|--------|--------------|----------------|
| `SKILL.md` with frontmatter | `skill` | `name`, `description`, `requires`, `install` from frontmatter |
| `openclaw.plugin.json` | `extension` | `name`, `version`, `description`, `entry` from plugin manifest |
| `pipeline.yml` with Lobster header | `workflow` | `name`, `description`, `steps` from pipeline metadata |
| `SOUL.md` + `AGENTS.md` | `workspace` | Inferred from file presence |

This inference mechanism ensures that **every existing OpenClaw skill is automatically a valid Effector** without any author action.

## Validation Rules

A valid manifest MUST satisfy:

1. All required fields are present and correctly typed
2. `name` matches `[a-z0-9@/_-]+` pattern
3. `version` is valid semver
4. `type` is one of the six defined types
5. At least one `[runtime.*]` binding is present (or inferable)
6. All referenced entry files exist in the package
7. Dependency version constraints are parseable
8. Permission declarations are consistent with the Effector's actual behavior (verified at runtime)
