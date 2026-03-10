# 00 — Overview

**Status:** Draft
**Version:** 0.2.0

---

## What is an Effector?

An **Effector** is any unit of capability that enables an AI agent to act on the world — with a **typed interface** that makes composition safe, discovery intelligent, and verification possible.

The name comes from robotics: an *end effector* is the device at the end of a robotic arm — the gripper, the welder, the sensor — that lets the robot interact with its environment. Without end effectors, a robot arm is just a moving structure with no purpose.

AI agents have the same problem. A language model can reason, plan, and generate. But without capabilities that connect it to external systems — code execution, API calls, data retrieval, user interaction — it's a philosopher, not an actor. An Effector is that connection.

What makes it different from existing formats (SKILL.md, MCP tools, LangChain decorators) is the **type layer**: every Effector declares what kind of data it accepts, what it produces, and what environment it requires. This makes the difference between "a skill you pray will work" and "a capability you can verify will compose."

## The Problem This Solves

AI agent capabilities in 2026 are where JavaScript modules were in 2012 — fragmented, untyped, and impossible to compose safely.

Real numbers from the ecosystem:

- **67% of multi-agent failures** come from inter-agent composition errors ([arXiv:2501.06322](https://arxiv.org/abs/2501.06322))
- **3–15% tool calling failure rate** in production due to type mismatches
- **36% of ClawHub skills** contained malicious payloads before the Feb 2026 cleanup — enabled by zero signing and zero permission verification
- **13,729+ community skills** across 11 categories, but no way to search by interface type or verify composition compatibility

The root cause: no type system. You chain two skills and hope the output format matches. You combine three MCP tools and discover conflicts at runtime. TypeScript solved this for JavaScript — not by replacing it, but by adding a type layer. The Effector Spec does the same for AI agent capabilities.

## What This Specification Defines

**Tier 1 — The Type System** (what makes Effectors composable)

1. **Type Language** (01) — Formal type language for capability interfaces
2. **Composition Algebra** (02) — Sequential, parallel, conditional, fallback composition rules
3. **Discovery Protocol** (03) — Search by interface type, substitutability queries

**Tier 2 — The Package Format** (what makes Effectors distributable)

4. **Manifest Format** (04) — `effector.toml` with type annotations and runtime bindings
5. **Type Taxonomy** (05) — Six canonical types: skill, extension, workflow, workspace, bridge, prompt
6. **Runtime Binding** (06) — How runtimes consume Effectors (OpenClaw reference + MCP)

**Tier 3 — The Trust Model** (what makes Effectors safe)

7. **Security Model** (07) — Permission types, trust levels, signing, sandbox
8. **Lifecycle** (08) — Create → Type → Validate → Package → Publish → Discover → Compose → Execute

## Conceptual Model

```
Brain (LLM) ──► Body (Runtime) ──► Hands (Effectors)
                                         │
                                  Typed Interface
                                  ──────────────
                                  input:  CodeDiff
                                  output: ReviewReport
                                  context: [Repository]
                                         │
                                  skill  extension
                                  workflow workspace
                                  bridge  prompt
```

The **Brain** (LLM) reasons. The **Body** (OpenClaw, Claude Agent SDK, etc.) orchestrates. The **Hands** (Effectors) act — with typed interfaces that verify composition before execution.

## The Capability Graph

N typed Effectors enable O(N²) valid compositions. Discovery becomes semantic (find by type, not keyword). Composition is verified (type mismatches caught at definition time). Every new Effector multiplies possibilities for every existing one.

This is what "better invoking more resources in the digital world" means — not more APIs, but every capability discoverable and composable through the type system.

## Design Principles

1. **Types over conventions** — Formal interfaces replace hope-and-pray composition
2. **Structural, not nominal subtyping** — Compatibility by shape, not by name. `SecurityReport` is automatically compatible as `ReviewReport` input.
3. **Additive, not replacing** — Existing SKILL.md, MCP tools, LangChain tools work as-is
4. **Progressive disclosure** — 5 lines for simple, unlimited expressiveness for complex
5. **Runtime-agnostic** — Works with OpenClaw, MCP, Claude Agent SDK, or any future runtime
6. **Community-extensible** — Domain types defined by communities, not central authority

## Terminology

| Term | Definition |
|------|-----------|
| **Effector** | A distributable, typed, composable unit of AI agent capability |
| **Interface** | Typed declaration of inputs, outputs, and context requirements |
| **Manifest** | The `effector.toml` file: metadata, types, runtime bindings |
| **Entry** | Primary file the runtime loads (`SKILL.md`, `index.ts`, `pipeline.yml`) |
| **Runtime** | Agent execution environment (OpenClaw, Claude Agent SDK, etc.) |
| **Capability Graph** | Emergent network of type-compatible compositions across all Effectors |
| **Structural Subtype** | Type A is subtype of B if A has all of B's fields with compatible types |
| **Trust Level** | Security classification determining access permissions |

## Relationship to Existing Standards

| Standard | Relationship |
|----------|-------------|
| **SKILL.md** | Skill Effectors use SKILL.md as entry. Type system extends frontmatter — doesn't replace it. |
| **MCP** | MCP is the transport protocol. Effector types are the semantic interface layer — orthogonal. |
| **A2A** | Handles agent-to-agent communication. Effector types define what capabilities agents expose. |
| **WIT (WASM)** | WIT types code modules. Effector types apply the same principle to AI capabilities, with AI-specific additions (nondeterminism, cost, context). |
| **TypeScript** | Direct inspiration: types on an untyped ecosystem without replacement. |
| **npm/package.json** | Inspiration for manifest format and dependency model. |

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2026-03 | Initial draft — manifest-focused format specification |
| 0.2.0 | 2026-03 | Major revision — type system paradigm, composition algebra, discovery protocol |
