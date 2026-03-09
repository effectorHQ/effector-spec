# The Effector Specification

[![Status: Draft](https://img.shields.io/badge/status-draft-orange.svg)](spec/00-overview.md)
[![Version: 0.1.0](https://img.shields.io/badge/version-0.1.0-blue.svg)](CHANGELOG.md)
[![License: CC-BY-4.0](https://img.shields.io/badge/license-CC--BY--4.0-green.svg)](LICENSE)
[![RFC: 0001](https://img.shields.io/badge/RFC-0001-E03E3E.svg)](https://github.com/effectorHQ/rfcs/blob/main/text/0001-effector-spec.md)

**[中文文档 →](./README.zh.md)**

---

> An **Effector** is any unit of capability that enables an AI agent to act on the world.

This repository contains the formal specification for the Effector standard — a unified format for packaging, distributing, and composing AI agent capabilities across runtimes.

## Why a Spec

The AI agent ecosystem has a fragmentation problem. Skills, extensions, plugins, workflows, prompts, templates, and bridge adapters each solve a piece of the capability puzzle, but they don't compose. They don't share a manifest format. They can't be discovered through a common protocol.

The Effector Spec unifies these under one framework — the way `package.json` unified JavaScript modules, the way OCI unified container images.

**Current reference runtime:** [OpenClaw](https://github.com/openclaw/openclaw)
**Designed for:** Any AI agent runtime that adopts the standard

## Spec Documents

| Document | Contents |
|----------|----------|
| [00 — Overview](spec/00-overview.md) | What an Effector is, design principles, scope |
| [01 — Manifest](spec/01-manifest.md) | The `effector.toml` manifest format |
| [02 — Types](spec/02-types.md) | Type taxonomy: skill, extension, workflow, workspace, bridge, prompt |
| [03 — Lifecycle](spec/03-lifecycle.md) | Create → validate → package → publish → discover → install → execute |
| [04 — Composition](spec/04-composition.md) | Dependencies, composition, and capability negotiation |
| [05 — Runtime Binding](spec/05-runtime-binding.md) | How runtimes consume Effectors (OpenClaw reference) |
| [06 — Security](spec/06-security.md) | Permission model, trust levels, sandboxing |

## Schemas

Machine-readable schemas for tooling and validation:

- [`schemas/effector.schema.json`](schemas/effector.schema.json) — JSON Schema for `effector.toml`
- [`schemas/examples/`](schemas/examples/) — Example manifests for every Effector type

## Quick Example

A minimal Effector manifest (`effector.toml`):

```toml
[effector]
name = "github-pr-review"
version = "1.2.0"
type = "skill"
description = "Automated pull request review with code analysis"
license = "MIT"

[effector.metadata]
emoji = "🔍"
tags = ["github", "code-review", "ci"]
authors = ["effectorHQ Contributors"]

[runtime.openclaw]
format = "skill.md"
entry = "SKILL.md"
requires.bins = ["gh"]
requires.env = ["GITHUB_TOKEN"]

[runtime.mcp]
format = "mcp-tool"
entry = "mcp-adapter.js"
```

This manifest describes a skill Effector that works with OpenClaw natively (via SKILL.md) and also provides an MCP adapter for cross-runtime compatibility.

## Design Principles

1. **Format-agnostic** — The manifest describes capabilities; the runtime decides how to consume them
2. **Backward-compatible** — Existing SKILL.md files are valid skill Effectors with zero changes
3. **Composable** — Effectors can declare dependencies on other Effectors
4. **Multi-runtime** — One Effector can provide bindings for multiple runtimes
5. **Human-readable** — TOML manifest, not JSON or YAML blobs
6. **Progressive disclosure** — Simple Effectors need 5 lines; complex ones can express anything

## Relationship to Existing Formats

| Before | After | Notes |
|--------|-------|-------|
| `SKILL.md` (frontmatter) | `effector.toml` + `SKILL.md` | SKILL.md becomes the `entry` file; manifest adds cross-runtime metadata |
| `openclaw.plugin.json` | `effector.toml` + TypeScript source | Plugin manifest unifies under Effector manifest |
| `pipeline.yml` (Lobster) | `effector.toml` + `pipeline.yml` | Workflow pipelines become first-class Effectors |
| Workspace configs | `effector.toml` + `SOUL.md` + `AGENTS.md` + ... | Workspace templates become distributable Effectors |
| MCP tool definitions | `effector.toml` + MCP adapter | Bridge adapters formalized as Effectors |

## Versioning

This spec follows [Semantic Versioning](https://semver.org/). The current version is **0.1.0** (draft).

- **0.x.y** — Draft phase. Breaking changes expected.
- **1.0.0** — Stable release. Backward compatibility guaranteed.

## Contributing

This is a living specification. Changes go through the [RFC process](https://github.com/effectorHQ/rfcs).

- For clarifications and typo fixes: open a PR directly
- For substantive changes: submit an RFC first
- For questions: open an issue or start a [Discussion](https://github.com/orgs/effectorHQ/discussions)

## License

[CC-BY-4.0](./LICENSE) — Same as all effectorHQ documentation.
