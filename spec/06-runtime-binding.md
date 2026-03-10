# 06 — Runtime Binding

**Status:** Draft
**Version:** 0.2.0

---

## What is Runtime Binding?

A runtime binding is the configuration that tells a specific agent runtime how to consume an Effector. The Effector manifest carries one or more `[runtime.<name>]` tables, each tailored to a specific runtime's expectations.

This design means a single Effector can work across multiple runtimes without the author maintaining separate packages.

## Type Checking at Runtime Load

Before executing any step, a conformant runtime MUST perform **interface type validation**:

```
1. Read [effector.interface] for each step in the pipeline
2. For each sequential pair (A, B):
   - Assert: output(A) <: input(B)      [structural subtyping]
   - If check fails: ERROR, halt pipeline, report type mismatch
3. For context requirements:
   - Assert: all declared context types are satisfied by runtime environment
   - If unsatisfied: WARN + block (or skip if optional)
4. Log type-check result to runtime audit log
```

This is analogous to a linker's type resolution pass — it happens once, before execution starts, not per-invocation.

### Type-Check Result Codes

| Code | Meaning | Action |
|------|---------|--------|
| `TC_OK` | All types resolve and are compatible | Proceed |
| `TC_WARN_INFERRED` | One or more types are inferred (not declared) | Proceed with warning |
| `TC_ERR_MISMATCH` | A sequential type pair is incompatible | Halt, report step indices |
| `TC_ERR_UNKNOWN` | A type reference is not found in effector-types | Halt if strict mode, warn if lenient |
| `TC_ERR_CONTEXT` | Required context type is not available | Halt if required, skip if optional |

## Binding Architecture

```
                    effector.toml
                         │
          ┌──────────────┼──────────────┐
          │              │              │
   [runtime.openclaw] [runtime.mcp] [runtime.generic]
          │              │              │
          ▼              ▼              ▼
    OpenClaw loads    Claude/Cursor  Any runtime
    SKILL.md or       loads MCP      loads generic
    plugin code       tool def       function
```

The manifest is the single source of truth. Each runtime reads only its own binding section.

## Reference Runtime: OpenClaw

OpenClaw is the reference implementation for the Effector spec. This section documents how OpenClaw consumes each Effector type.

### Architecture Context

```
OpenClaw Runtime Architecture
──────────────────────────────
┌─────────────────────────────────────────┐
│              Pi Agent Runtime            │
│                                          │
│  ┌──────────────┐  ┌─────────────────┐  │
│  │   Gateway     │  │  Skill Loader   │  │
│  │  WebSocket    │  │  (SKILL.md      │  │
│  │  :18789       │  │   parser)       │  │
│  └──────┬───────┘  └───────┬─────────┘  │
│         │                   │            │
│  ┌──────┴───────┐  ┌───────┴─────────┐  │
│  │  Multi-Chan  │  │  Plugin SDK     │  │
│  │  Inbox       │  │  (extensions)   │  │
│  │  (20+ ch.)   │  │                 │  │
│  └──────────────┘  └───────┬─────────┘  │
│                             │            │
│  ┌──────────────────────────┴──────────┐ │
│  │        Workspace-as-Kernel          │ │
│  │  SOUL.md | AGENTS.md | TOOLS.md    │ │
│  │  IDENTITY.md | HEARTBEAT.md        │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  ┌─────────────────────────────────────┐ │
│  │           Lobster Engine            │ │
│  │  (workflow orchestration)           │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Skill Binding

```toml
[runtime.openclaw]
format = "skill.md"
entry = "SKILL.md"
min-version = "0.20.0"

[runtime.openclaw.requires]
bins = ["gh"]
env = ["GITHUB_TOKEN"]
skills = ["git-operations"]  # Co-dependency

[runtime.openclaw.install]
brew = { formula = "gh", bins = ["gh"] }
apt = { package = "gh", bins = ["gh"] }

[runtime.openclaw.publish]
registry = "clawhub"
tier = "managed"  # bundled | managed | workspace
```

**Loading sequence:**

1. OpenClaw scans `~/.openclaw/workspace/skills/` for directories
2. For each directory, check for `effector.toml` (or fall back to `SKILL.md` frontmatter)
3. Parse manifest and verify requirements
4. Register skill in the agent's available tool list
5. When contextually relevant, the agent reads `SKILL.md` and follows instructions

### Extension Binding

```toml
[runtime.openclaw]
format = "plugin"
entry = "dist/index.js"
min-version = "0.21.0"

[runtime.openclaw.plugin]
channels = ["telegram"]
providers = []
actions = ["send-message", "fetch-updates"]
permissions = ["network", "storage"]
config-schema = "config.schema.json"
```

**Loading sequence:**

1. OpenClaw discovers `openclaw.plugin.json` or `effector.toml` in `node_modules/`
2. Calls `require(entry).register(api)` where `api` is `OpenClawPluginApi`
3. Extension registers channels, providers, actions, and event hooks
4. Extension remains active for the runtime's lifetime

**Plugin API surface (OpenClaw-specific):**

```typescript
interface OpenClawPluginApi {
  registerChannel(channel: ChannelDefinition): void;
  registerProvider(provider: ProviderDefinition): void;
  registerAction(action: ActionDefinition): void;
  on(event: string, handler: EventHandler): void;
  getConfig<T>(schema: JSONSchema): T;
  getLogger(namespace: string): Logger;
}
```

### Workflow Binding

```toml
[runtime.openclaw]
format = "lobster"
entry = "pipeline.yml"
```

**Loading sequence:**

1. Lobster engine parses `pipeline.yml`
2. Resolves skill references to installed Effectors
3. Validates step dependencies and variable references
4. Executes pipeline (manual trigger, cron, or event-driven)

### Workspace Binding

```toml
[runtime.openclaw]
format = "workspace"
entry = "."
files = ["SOUL.md", "AGENTS.md", "TOOLS.md", "IDENTITY.md", "HEARTBEAT.md"]
```

**Loading sequence:**

1. Copy workspace files to `~/.openclaw/workspace/`
2. OpenClaw reads workspace files at startup
3. `SOUL.md` shapes agent personality; `TOOLS.md` defines available tools
4. Agent behavior reflects workspace configuration until changed

## Runtime: MCP (Model Context Protocol)

MCP is the cross-runtime interoperability layer. Any Effector with an MCP binding becomes available to Claude Desktop, Cursor, Windsurf, and other MCP clients.

### MCP Binding Format

```toml
[runtime.mcp]
format = "mcp-tool"
entry = "mcp/server.js"
transport = "stdio"  # stdio | sse | streamable-http

[runtime.mcp.tool]
name = "github_pr_review"  # snake_case per MCP convention
input-schema = "mcp/input-schema.json"
```

**Loading sequence (stdio):**

1. MCP client spawns the server process: `node mcp/server.js`
2. Client sends `initialize` JSON-RPC message
3. Server responds with `tools/list` including the Effector as an MCP tool
4. Client invokes `tools/call` with input matching the schema
5. Server executes the Effector's logic and returns results

### MCP Schema Mapping

| Effector Manifest Field | MCP Tool Field |
|------------------------|----------------|
| `effector.name` | `tool.name` (converted to snake_case) |
| `effector.description` | `tool.description` |
| `runtime.mcp.tool.input-schema` | `tool.inputSchema` |

### Bridge Effectors and MCP

The `openclaw-mcp` bridge Effector (already built) demonstrates the canonical pattern: it reads SKILL.md files and exposes them as MCP tools dynamically. This means **every skill Effector is automatically MCP-compatible** through the bridge, even without an explicit `[runtime.mcp]` binding.

## Runtime: Claude Agent SDK

For developers building custom agents with the Claude Agent SDK:

```toml
[runtime.claude-agent-sdk]
format = "tool"
entry = "src/tool.ts"
```

The entry file exports a tool definition compatible with the SDK's `Tool` interface.

## Runtime: Generic

For runtimes not yet defined in the spec, authors can provide a generic binding:

```toml
[runtime.generic]
format = "function"
entry = "src/index.js"
exports = ["execute", "validate", "describe"]
```

**Contract:**

- `execute(input: object): Promise<object>` — Run the Effector
- `validate(input: object): Promise<ValidationResult>` — Check input validity
- `describe(): EffectorDescription` — Return a machine-readable description

This provides a minimal interoperability surface for any runtime to consume.

## Binding Priority

When a runtime encounters an Effector with multiple bindings, it SHOULD use this priority:

1. **Exact match** — Use the binding for this specific runtime
2. **Bridge** — Use a bridge Effector that translates from a known binding
3. **Generic** — Fall back to the generic binding
4. **Inference** — Infer from the entry file format (e.g., SKILL.md → skill)
5. **Incompatible** — Report that no binding is available

## Runtime Registration

Runtimes that adopt the Effector spec SHOULD register themselves:

```toml
# In the runtime's own metadata (not in the Effector manifest)
[runtime]
name = "openclaw"
version = "0.21.0"
spec-version = "0.1.0"
supported-types = ["skill", "extension", "workflow", "workspace"]
```

This allows tooling to check compatibility before installation.
