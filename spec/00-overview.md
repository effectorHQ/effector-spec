# 00 — Overview

**Status:** Draft
**Version:** 0.1.0

---

## What is an Effector?

An **Effector** is any unit of capability that enables an AI agent to act on the world.

The name comes from robotics: an *end effector* is the device at the end of a robotic arm — the gripper, the welder, the sensor — that lets the robot interact with its environment. Without end effectors, a robot arm is just a moving structure with no purpose.

AI agents have the same problem. A language model can reason, plan, and generate. But without capabilities that connect it to external systems — code execution, API calls, data retrieval, user interaction — it's a philosopher, not an actor.

An Effector is that connection. It packages a discrete capability — with its metadata, documentation, dependencies, security constraints, and runtime bindings — into a distributable, composable, discoverable unit.

## Scope

This specification defines:

1. **The Effector Manifest** (`effector.toml`) — a machine-readable description of an Effector's identity, type, requirements, and runtime bindings
2. **The Effector Type System** — a taxonomy of capability types (skill, extension, workflow, workspace, bridge, prompt) with distinct semantics
3. **The Effector Lifecycle** — stages from creation through validation, packaging, publication, discovery, installation, and execution
4. **The Composition Model** — how Effectors declare dependencies, compose with each other, and negotiate capabilities
5. **Runtime Binding** — how agent runtimes consume Effectors, with OpenClaw as the reference implementation
6. **Security Model** — permission declarations, trust levels, and sandboxing constraints

This specification does **not** define:

- The internal behavior of any specific Effector (that's the author's domain)
- The wire protocol for runtime communication (that's MCP, ACP, or runtime-specific)
- The registry API for publishing and discovery (that's a separate spec)
- Pricing, licensing enforcement, or commercial distribution mechanics

## Design Principles

### 1. Backward Compatibility

The most important design constraint. There are 3,286+ skills on ClawHub today. Every one of them must be a valid Effector without modification.

A SKILL.md file without an `effector.toml` is implicitly a skill-type Effector. The runtime infers the manifest from the SKILL.md frontmatter. This means adoption cost is zero for existing skill authors.

### 2. Progressive Disclosure

A trivial Effector needs five lines:

```toml
[effector]
name = "hello-world"
version = "0.1.0"
type = "skill"
description = "A minimal example"
```

A complex Effector can express multi-runtime bindings, fine-grained permissions, composition dependencies, and custom metadata — but none of that is required to get started.

### 3. Format Agnosticism

The manifest describes *what* the Effector provides. The runtime decides *how* to consume it. A skill Effector might be consumed as a SKILL.md file by OpenClaw, as an MCP tool by Claude Desktop, or as a function call schema by a custom runtime. The manifest carries bindings for each.

### 4. Human Readability

We chose TOML over JSON or YAML for the manifest because:

- TOML has unambiguous semantics (unlike YAML's type coercion gotchas)
- TOML is more readable than JSON for configuration
- TOML maps cleanly to nested key-value structures
- TOML has first-class support for inline tables and arrays of tables

The manifest should be something a developer reads and understands in under 30 seconds.

### 5. Composability First

Effectors are designed to compose. A workflow Effector can depend on skill Effectors. A workspace Effector can bundle skill, extension, and prompt Effectors. The composition model is explicit, version-constrained, and runtime-validated.

## Conceptual Model

```
┌──────────────────────────────────────────────────────┐
│                     AI Agent                          │
│                                                       │
│  ┌─────────┐    ┌──────────┐    ┌──────────────────┐ │
│  │  Brain   │───▶│   Body   │───▶│     Hands        │ │
│  │ (LLM)   │    │(Runtime) │    │  (Effectors)     │ │
│  └─────────┘    └──────────┘    │                  │ │
│                                  │  ┌────────────┐ │ │
│                                  │  │   Skill    │ │ │
│                                  │  ├────────────┤ │ │
│                                  │  │ Extension  │ │ │
│                                  │  ├────────────┤ │ │
│                                  │  │ Workflow   │ │ │
│                                  │  ├────────────┤ │ │
│                                  │  │ Workspace  │ │ │
│                                  │  ├────────────┤ │ │
│                                  │  │  Bridge    │ │ │
│                                  │  ├────────────┤ │ │
│                                  │  │  Prompt    │ │ │
│                                  │  └────────────┘ │ │
│                                  └──────────────────┘ │
└──────────────────────────────────────────────────────┘
```

The **Brain** (language model) reasons and plans. The **Body** (runtime — OpenClaw, Claude Agent SDK, LangChain, etc.) orchestrates execution. The **Hands** (Effectors) are the capabilities that connect the agent to external systems and actions.

This spec defines the Hands layer.

## Terminology

| Term | Definition |
|------|-----------|
| **Effector** | A distributable, composable unit of AI agent capability |
| **Manifest** | The `effector.toml` file describing an Effector's metadata and bindings |
| **Entry** | The primary file the runtime loads (e.g., `SKILL.md`, `index.ts`, `pipeline.yml`) |
| **Runtime** | The agent execution environment that consumes Effectors (e.g., OpenClaw, Claude Desktop) |
| **Binding** | A runtime-specific configuration block in the manifest |
| **Registry** | A service that indexes Effectors for discovery (e.g., ClawHub) |
| **Composition** | The mechanism by which Effectors declare dependencies on other Effectors |
| **Trust Level** | A security classification determining what an Effector is allowed to access |

## Relationship to Existing Standards

| Standard | Relationship |
|----------|-------------|
| **SKILL.md** (OpenClaw) | Skill Effectors use SKILL.md as their entry file. The Effector manifest extends (not replaces) the frontmatter. |
| **MCP** (Model Context Protocol) | Bridge Effectors can expose capabilities as MCP tools. The manifest declares MCP bindings. |
| **ACP/ACPX** (Agent Client Protocol) | Effectors can be invoked through ACP sessions. The manifest can declare ACP-compatible execution modes. |
| **OCI** (Open Container Initiative) | Conceptual parallel — OCI standardized container images; Effectors standardize agent capabilities. |
| **npm/package.json** | Direct inspiration for the manifest format and composition model. |

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2026-03 | Initial draft |
