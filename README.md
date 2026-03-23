# effector-spec

[![Status: Draft](https://img.shields.io/badge/status-draft-orange.svg)](spec/00-overview.md)
[![Version: 0.2.0](https://img.shields.io/badge/version-0.2.0-blue.svg)](CHANGELOG.md)
[![License: CC-BY-4.0](https://img.shields.io/badge/license-CC--BY--4.0-green.svg)](LICENSE)
[![RFC: 0001](https://img.shields.io/badge/RFC-0001-E03E3E.svg)](https://github.com/effectorHQ/rfcs/blob/main/text/0001-effector-spec.md)

**The first type system for AI agent capabilities.**

---

> An **Effector** is any unit of capability that enables an AI agent to act on the world.
> The **Effector Spec** defines how those capabilities declare typed interfaces, compose safely, and form a discoverable capability graph.

## The Problem

AI agent capabilities in 2026 are where JavaScript modules were in 2012 — fragmented, untyped, and impossible to compose safely.

You have MCP tools (JSON-RPC functions), SKILL.md files (YAML + markdown instructions), LangChain `@tool` decorators, CrewAI BaseTool classes, Semantic Kernel plugins, OpenAI Function Calling schemas, AGENTS.md project guidance. Every framework defines capabilities differently. None of them compose.

The consequences are measurable:

- **67% of multi-agent system failures** stem from inter-agent interaction errors, not individual agent bugs ([Multi-Agent Collaboration Mechanisms Survey, arXiv:2501.06322](https://arxiv.org/abs/2501.06322))
- **3–15% tool calling failure rate** in production due to type mismatches and malformed interfaces ([n8n community reports](https://community.n8n.io/t/i-get-error-received-tool-input-did-not-match-expected-schema-before-the-agent-attempts-to-use-any-tools/179933))
- **36% of ClawHub skills** contained prompt injection or malicious payloads before the February 2026 cleanup ([Snyk ToxicSkills Report](https://snyk.io/blog/toxicskills/))
- **Token consumption doubles** when loading multiple MCP servers, with no dependency awareness or intelligent composition ([MCP Limitations Analysis](https://superface.ai/blog/mcp-today-protocol-limitations))

The root cause is simple: **there is no type system for AI agent capabilities.** You chain two skills and hope the output of one matches the input of the other. You combine three MCP tools and discover at runtime they conflict. You install a community skill and trust it blindly because there's no way to verify its interface contract.

## What This Spec Defines

The Effector Spec is not a manifest format (that was v0.1 — we've moved beyond it). It's a **type system and composition algebra for AI agent capabilities**, consisting of three primitives:

### Primitive 1: Capability Type Language

A formal type language for describing what an Effector accepts, produces, and requires:

```
effector "code-review" {
  type: Skill

  interface {
    input:   CodeDiff
    output:  ReviewReport
    context: [Repository, CodingStandards]
  }
}
```

Core concepts:
- **Input types** — what the capability receives (CodeDiff, TextDocument, ImageSet, DataTable...)
- **Output types** — what the capability produces (ReviewReport, Summary, TranslatedText, PatchSet...)
- **Context types** — what environment the capability needs (Repository, UserPreferences, APICredentials...)
- **Structural subtyping** — if Effector A's output is a structural supertype of Effector B's input, they compose automatically. Like TypeScript, not like Java.

### Primitive 2: Composition Algebra

Formal rules for combining capabilities:

```
# Sequential: A's output type must be compatible with B's input type
code-change → code-review → merge-decision

# Parallel: Independent execution, results merge into tuple type
(security-scan ‖ type-check ‖ lint) → aggregate-report

# Conditional: Branch on output type
code-review → quality-high ? auto-merge : human-review

# Fallback: Type-compatible substitute on failure
primary-review | fallback-review
```

The composition graph is **type-checked before execution.** If two Effectors don't compose (output type incompatible with input type), the system rejects the pipeline at definition time — not at runtime, not after burning tokens and API calls.

### Primitive 3: Typed Discovery Protocol

Search capabilities by interface type, not keywords:

```
# "Find any Effector that takes a CodeDiff and produces any kind of Report"
discover(input: CodeDiff, output: *Report)

# "Find substitutes for this skill"
substitutes(effector: "code-review@1.2.0")

# "What can I compose after a security-scan?"
chains-after(effector: "security-scan@2.0.0")
```

Structural subtype matching returns all compatible Effectors, ranked by precision. This enables a capability graph where N typed Effectors produce O(N²) or more valid compositions — the combinatorial surface grows with every new Effector published.

## Why This Is a Paradigm, Not a Feature

Paradigm shifts change how things compose:

| Paradigm | What changed | Composability before | Composability after |
|----------|-------------|---------------------|-------------------|
| Unix pipes | Program I/O | Monolithic binaries | `stdout → stdin`, infinite chaining |
| URL + HTTP | Document access | Protocol-specific clients | Universal addressing, hyperlinks create the web |
| npm + package.json | Code modules | Script tags, global variables | Dependency resolution, semantic versioning |
| TypeScript | JavaScript types | Runtime errors, manual checking | Compile-time verification, IDE intelligence |
| Docker + OCI | Software distribution | "Works on my machine" | Portable, composable containers |
| **Effector Spec** | **AI capabilities** | **Untyped, framework-locked, pray-and-chain** | **Typed interfaces, verified composition, cross-runtime portability** |

The Effector Spec sits in the same position TypeScript occupied in 2012 relative to JavaScript:

- It **doesn't replace** existing formats (SKILL.md, MCP tools, LangChain tools still work)
- It **adds a type layer** that enables safe composition, intelligent discovery, and verified pipelines
- It **works across runtimes** (not locked to OpenClaw, MCP, or any single framework)
- It **grows through community annotation** (like DefinitelyTyped gave types to existing npm packages)

## Spec Documents

| Document | Contents |
|----------|----------|
| [00 — Overview](spec/00-overview.md) | What an Effector is, the type system paradigm, scope, terminology |
| [01 — Type Language](spec/01-type-language.md) | Capability types, structural subtyping, type inference rules |
| [02 — Composition Algebra](spec/02-composition.md) | Sequential, parallel, conditional, fallback — formal composition rules |
| [03 — Discovery Protocol](spec/03-discovery.md) | Typed search, substitutability queries, capability graph construction |
| [04 — Manifest Format](spec/04-manifest.md) | The `effector.toml` manifest — type annotations, runtime bindings, metadata |
| [05 — Type Taxonomy](spec/05-types.md) | Canonical Effector types: skill, extension, workflow, workspace, bridge, prompt |
| [06 — Runtime Binding](spec/06-runtime-binding.md) | How runtimes consume typed Effectors (OpenClaw, MCP, Claude Agent SDK, generic) |
| [07 — Security Model](spec/07-security.md) | Permission types, trust levels, sandbox constraints, signing |
| [08 — Lifecycle](spec/08-lifecycle.md) | Create → Type → Validate → Package → Publish → Discover → Compose → Execute |

## Schemas & Tooling

- [`schemas/effector.schema.json`](schemas/effector.schema.json) — JSON Schema for `effector.toml` manifest validation
- [`schemas/types/`](schemas/types/) — Machine-readable definitions of standard capability types
- [`schemas/examples/`](schemas/examples/) — Example typed manifests for every Effector type

**Companion projects:**

| Project | What it does |
|---------|-------------|
| [`effector-types`](https://github.com/effectorHQ/effector-types) | Standard library of capability types — the `lib.d.ts` for Effectors |
| [`effector-compose`](https://github.com/effectorHQ/effector-compose) | Composition engine — build and type-check Effector pipelines |
| [`effector-audit`](https://github.com/effectorHQ/effector-audit) | Security audit + cryptographic signing for Effector packages |
| [`effector-graph`](https://github.com/effectorHQ/effector-graph) | Interactive visualization of the capability graph |

## Research Foundation

This spec is grounded in active research across multiple domains:

**Capability-based computing** — The concept of unforgeable capability tokens originates with Dennis & Van Horn (1966) and runs through Capsicum, WASI, and the WASM Component Model's WIT interface system. We extend capability-based reasoning from code modules to AI agent capabilities.

**Agent composition research** — The GAP framework (NeurIPS 2025, [arXiv:2510.25320](https://arxiv.org/abs/2510.25320)) demonstrated that graph-based planning with explicit dependency modeling outperforms sequential tool execution. Our composition algebra formalizes this insight. DALIA ([arXiv:2601.17435](https://arxiv.org/abs/2601.17435)) proposed formal semantic models for capabilities — we provide the concrete type system.

**Cost-aware agent execution** — Google's BATS framework ([arXiv:2511.17006](https://arxiv.org/abs/2511.17006)) proved that agents without budget awareness waste resources. Our resource typing (cost-estimate, token-budget) makes cost a first-class citizen in capability declarations.

**Tool discovery at scale** — The Tool-to-Agent Retrieval framework ([arXiv:2511.01854](https://arxiv.org/abs/2511.01854)) showed that embedding tools and agents in a shared vector space enables semantic discovery. Our typed discovery protocol provides the formal interface for this, moving beyond keyword search to structural type matching.

**Security** — The Snyk ToxicSkills audit (February 2026) and the ClawHavoc campaign revealed systemic trust failures in capability registries. Our security model (07-security.md) defines permission types, trust levels, and signing requirements as part of the type system — not as an afterthought.

## Design Principles

1. **Types over conventions** — Formal interfaces replace hope-and-pray composition
2. **Structural, not nominal** — Compatibility is determined by shape, not by name or inheritance
3. **Additive, not replacing** — Works with existing SKILL.md, MCP tools, LangChain tools — adds types on top
4. **Progressive disclosure** — A simple Effector needs 5 lines. A fully-typed one can express complex interface contracts.
5. **Runtime-agnostic** — The type system is independent of any specific runtime or framework
6. **Community-extensible** — Domain-specific types are defined by communities, not by us

## Quick Start

A minimal typed Effector manifest (`effector.toml`):

```toml
[effector]
name = "github-pr-review"
version = "1.2.0"
type = "skill"
description = "Automated pull request review with code analysis"

[effector.interface]
input = "CodeDiff"
output = "ReviewReport"
context = ["Repository", "CodingStandards"]

[effector.compose]
chains-after = ["code-change", "pull-request"]
chains-before = ["merge-decision", "notify-team"]
parallel-with = ["security-scan", "type-check"]

[effector.resources]
requires = ["github-api", "llm-inference"]
permissions = ["read:repository", "write:comments"]
cost-estimate = "~0.02 USD"

[runtime.openclaw]
format = "skill.md"
entry = "SKILL.md"
```

## Versioning

This spec follows [Semantic Versioning](https://semver.org/).

- **0.1.x** — Manifest-only format (deprecated, superseded by v0.2)
- **0.2.x** — Type system + composition algebra (current draft)
- **1.0.0** — Stable. Backward compatibility guaranteed.

## Contributing

This is a living specification. Changes go through the [RFC process](https://github.com/effectorHQ/rfcs).

- For clarifications and typo fixes: open a PR directly
- For substantive changes: submit an RFC first
- For questions: open an issue or start a [Discussion](https://github.com/orgs/effectorHQ/discussions)

## License


This project is currently licensed under the Apache 2.0 License 。

[CC-BY-4.0](./LICENSE)

---

<sub>Part of the <a href="https://github.com/effectorHQ">effectorHQ</a> studio. We build hands for AI that moves first.</sub>
