# 02 — Effector Types

**Status:** Draft
**Version:** 0.1.0

---

## Type Taxonomy

The Effector type system defines six canonical types. Each maps to a distinct capability pattern in the AI agent ecosystem.

```
                        Effector
                           │
          ┌────────┬───────┼───────┬──────────┬────────┐
          │        │       │       │          │        │
        Skill  Extension Workflow Workspace Bridge  Prompt
          │        │       │       │          │        │
     SKILL.md  TypeScript Lobster  Config   Adapter  Template
               Plugin    Pipeline  Bundle   Layer    Library
```

## Type: `skill`

**The most common Effector type.** A skill teaches an AI agent how to interact with a specific tool, API, or domain.

### Characteristics

- **Format:** Markdown file (`SKILL.md`) with YAML frontmatter
- **Language:** Language-agnostic (instructions, not code)
- **Execution:** The agent reads the skill and follows its instructions using available tools
- **Distribution:** ClawHub registry, GitHub, npm
- **Granularity:** One capability, one skill

### OpenClaw Mapping

| Skill Concept | OpenClaw Implementation |
|--------------|------------------------|
| Entry file | `SKILL.md` in `~/.openclaw/workspace/skills/<name>/` |
| Metadata | YAML frontmatter (`name`, `description`, `metadata.openclaw.*`) |
| Dependencies | `requires.bins`, `requires.env` |
| Installation | `install` array (brew, apt, manual) |
| Distribution | ClawHub (`clawhub publish`) |
| Tiers | Bundled (shipped with OpenClaw), Managed (ClawHub), Workspace (local) |

### Example Manifest

```toml
[effector]
name = "docker-compose"
version = "2.1.0"
type = "skill"
description = "Manage multi-container Docker applications with docker-compose"

[runtime.openclaw]
format = "skill.md"
entry = "SKILL.md"

[runtime.openclaw.requires]
bins = ["docker", "docker-compose"]
```

### When to Use

Use the `skill` type when:
- The capability is instruction-based (the agent reads and follows directions)
- No custom code execution is needed beyond CLI tools
- The skill wraps an existing CLI tool or API
- You want maximum portability across runtimes

---

## Type: `extension`

**Code-level integration.** Extensions are TypeScript packages that hook into the runtime's plugin API, adding channels, providers, actions, and deep integrations.

### Characteristics

- **Format:** TypeScript/JavaScript package with a manifest
- **Language:** TypeScript (primarily), JavaScript
- **Execution:** Code runs in the runtime's plugin sandbox
- **Distribution:** npm, GitHub Packages
- **Granularity:** Can provide multiple capabilities through a single extension

### OpenClaw Mapping

| Extension Concept | OpenClaw Implementation |
|------------------|------------------------|
| Entry file | TypeScript file exporting `register(api: OpenClawPluginApi)` |
| Manifest | `openclaw.plugin.json` (migrating to `effector.toml`) |
| Channels | `api.registerChannel(...)` — new message sources (Telegram, WhatsApp, etc.) |
| Providers | `api.registerProvider(...)` — LLM/service backends |
| Actions | `api.registerAction(...)` — custom execution primitives |
| Hooks | `api.on('message', ...)` — event lifecycle hooks |

### Example Manifest

```toml
[effector]
name = "telegram-channel"
version = "3.0.1"
type = "extension"
description = "Telegram messaging channel for OpenClaw with rich media support"

[runtime.openclaw]
format = "plugin"
entry = "dist/index.js"
min-version = "0.21.0"

[runtime.openclaw.plugin]
channels = ["telegram"]
permissions = ["network", "storage"]
config-schema = "config.schema.json"

[effector.permissions]
network = true
env-read = ["TELEGRAM_BOT_TOKEN"]
```

### When to Use

Use the `extension` type when:
- You need to run custom code in the runtime process
- You're adding a new communication channel
- You're integrating a service that requires authentication flows
- The capability can't be expressed as markdown instructions alone

---

## Type: `workflow`

**Orchestrated pipelines.** Workflows chain multiple Effectors (typically skills) into deterministic, resumable, multi-step processes.

### Characteristics

- **Format:** Pipeline definition file (YAML)
- **Language:** Declarative pipeline DSL
- **Execution:** Orchestration engine (Lobster in OpenClaw) executes steps sequentially or in parallel
- **Distribution:** GitHub, registries
- **Granularity:** Multi-step, composes other Effectors

### OpenClaw Mapping

| Workflow Concept | OpenClaw Implementation |
|-----------------|------------------------|
| Entry file | `pipeline.yml` (Lobster format) |
| Engine | Lobster — deterministic, resumable, token-efficient |
| Steps | Skill invocations, conditional branches, error handlers |
| Variables | `${VARIABLE}` interpolation |
| Resumability | Failed pipelines restart from the failed step |
| Error handling | `on_failure` hooks, retry with backoff |

### Example Manifest

```toml
[effector]
name = "deploy-and-notify"
version = "1.0.0"
type = "workflow"
description = "Build, deploy to Kubernetes, verify health, notify team on Slack"

[[effector.dependencies]]
name = "docker-compose"
version = ">=2.0.0"
type = "skill"

[[effector.dependencies]]
name = "kubernetes-deploy"
version = ">=1.0.0"
type = "skill"

[[effector.dependencies]]
name = "slack-notify"
version = ">=1.5.0"
type = "skill"

[runtime.openclaw]
format = "lobster"
entry = "pipeline.yml"
```

### When to Use

Use the `workflow` type when:
- The task requires multiple sequential or parallel steps
- You need retry logic, error handling, or conditional branching
- The workflow composes existing skills or extensions
- Determinism and resumability matter (CI/CD, incident response)

---

## Type: `workspace`

**Agent configuration bundles.** Workspaces define an agent's personality, identity, tools, and behavior as a distributable package.

### Characteristics

- **Format:** Collection of markdown configuration files
- **Language:** Markdown + structured content
- **Execution:** Runtime loads configuration at startup
- **Distribution:** GitHub, template registries
- **Granularity:** Defines a complete agent persona

### OpenClaw Mapping

| Workspace Concept | OpenClaw Implementation |
|------------------|------------------------|
| Personality | `SOUL.md` — behavioral guidelines, tone, decision-making |
| Capabilities | `AGENTS.md` — agent definitions and expertise areas |
| Tools | `TOOLS.md` — available tools and usage guidance |
| Identity | `IDENTITY.md` — name, role, branding |
| Health | `HEARTBEAT.md` — monitoring, status endpoints |
| Pattern | "Workspace-as-Kernel" — workspace files define the OS of the agent |

### Example Manifest

```toml
[effector]
name = "devops-engineer"
version = "2.0.0"
type = "workspace"
description = "Production-focused DevOps agent with Kubernetes, Docker, and CI/CD expertise"
tags = ["devops", "kubernetes", "infrastructure"]

[runtime.openclaw]
format = "workspace"
entry = "."   # The entire directory is the workspace
files = ["SOUL.md", "AGENTS.md", "TOOLS.md", "IDENTITY.md", "HEARTBEAT.md"]

[[effector.dependencies]]
name = "docker-compose"
version = ">=2.0.0"
type = "skill"

[[effector.dependencies]]
name = "kubernetes-deploy"
version = ">=1.0.0"
type = "skill"
```

### When to Use

Use the `workspace` type when:
- You're defining a complete agent persona for a specific domain
- The configuration includes personality, tools, and behavioral rules
- You want others to fork and customize the agent
- The agent needs a specific combination of skills pre-installed

---

## Type: `bridge`

**Cross-runtime adapters.** Bridges expose capabilities from one ecosystem to another — translating formats, protocols, and schemas.

### Characteristics

- **Format:** Adapter code (JavaScript/TypeScript typically)
- **Language:** Runtime-dependent
- **Execution:** Runs as a translation layer between ecosystems
- **Distribution:** npm, GitHub
- **Granularity:** One bridge per ecosystem pair

### OpenClaw → MCP Bridge (Reference)

The `openclaw-mcp` bridge (already built by effectorHQ) is the canonical example:

| Bridge Concept | Implementation |
|---------------|---------------|
| Source format | SKILL.md (OpenClaw skills) |
| Target format | MCP Tool definitions (JSON-RPC 2.0) |
| Transport | stdio (MCP standard) |
| Entry | `bin/skill-mcp.js serve <directory>` |

### Example Manifest

```toml
[effector]
name = "openclaw-mcp-bridge"
version = "1.0.0"
type = "bridge"
description = "Expose OpenClaw skills as MCP tools for Claude, Cursor, and other MCP clients"

[effector.bridge]
source-runtime = "openclaw"
source-format = "skill.md"
target-runtime = "mcp"
target-format = "mcp-tool"
transport = "stdio"

[runtime.mcp]
format = "mcp-server"
entry = "bin/skill-mcp.js"
args = ["serve"]
```

### When to Use

Use the `bridge` type when:
- You're connecting two agent ecosystems (OpenClaw ↔ MCP, OpenClaw ↔ LangChain, etc.)
- The bridge translates capability formats between runtimes
- You want existing capabilities to work in a new runtime without rewriting

---

## Type: `prompt`

**Reusable prompt templates.** Prompts package carefully crafted instructions, system prompts, or prompt chains as distributable units.

### Characteristics

- **Format:** Markdown or structured text with template variables
- **Language:** Natural language + template syntax
- **Execution:** Runtime injects the prompt at the appropriate context point
- **Distribution:** Registries, GitHub
- **Granularity:** One prompt template or a related collection

### Example Manifest

```toml
[effector]
name = "code-review-prompt"
version = "1.0.0"
type = "prompt"
description = "Structured prompt template for thorough code reviews with security focus"

[effector.prompt]
format = "template"
entry = "prompt.md"
variables = ["language", "focus_areas", "severity_threshold"]
context = "system"  # system | user | assistant
```

### Prompt Template Syntax

```markdown
# Code Review Prompt

You are reviewing {{language}} code. Focus on: {{focus_areas}}.

Flag issues at severity {{severity_threshold}} or above.

## Review Checklist
1. Correctness — Does the code do what it claims?
2. Security — Are there injection, auth, or data exposure risks?
3. Performance — Are there obvious bottlenecks?
...
```

### When to Use

Use the `prompt` type when:
- You have a well-tested prompt that others can reuse
- The prompt includes template variables for customization
- The capability is purely instruction-based (no tools, no code)
- You want to version-control and distribute prompt engineering work

---

## Type Compatibility Matrix

Not all types compose equally. The following matrix shows which types can depend on which:

| Dependent ↓ / Dependency → | skill | extension | workflow | workspace | bridge | prompt |
|-----------------------------|-------|-----------|----------|-----------|--------|--------|
| **skill** | ✓ | — | — | — | — | ✓ |
| **extension** | ✓ | ✓ | — | — | — | ✓ |
| **workflow** | ✓ | ✓ | ✓ | — | — | ✓ |
| **workspace** | ✓ | ✓ | ✓ | — | — | ✓ |
| **bridge** | ✓ | — | — | — | — | — |
| **prompt** | — | — | — | — | — | ✓ |

Key constraints:
- Workspaces can depend on anything except other workspaces
- Workflows can compose other workflows (nesting)
- Skills are leaf nodes — they don't depend on extensions or workflows
- Bridges depend only on skills (translating them to another runtime)
