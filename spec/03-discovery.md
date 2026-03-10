# 03 — Discovery Protocol

**Status:** Draft  
**Version:** 0.2.0

---

## The Discovery Problem

Across 13,729 skills indexed on ClawHub, the dominant failure mode isn't broken execution — it's **failure to find**. A developer wants an Effector that "takes a Git diff and produces a security report." Keyword search returns 340 results. Forty minutes later, they've built it themselves, reinventing something that already exists at version 2.4.0.

The root cause: skills were named, not typed. A skill called `pr-guardian` and one called `code-fence-checker` might have identical interfaces — both `CodeDiff → SecurityReport` — but nothing in the old format made that visible or searchable.

The Discovery Protocol replaces keyword search with **type-indexed search**. You query by interface, not by name.

---

## Discovery Model

### Core Principle

> An Effector is uniquely identifiable by its interface: `(Input, Output, Context)`.  
> Two Effectors with the same interface are structurally substitutable, regardless of name.

This is analogous to TypeScript's structural type system: you query by shape, not by label.

### The Type Registry

Every compliant registry (ClawHub or self-hosted) maintains a **type index** alongside the name index:

```
Registry
├── name-index:   "docker-build" → package@version
├── type-index:   "String → Markdown" → [pkg-a, pkg-b, pkg-c]
│                 "CodeDiff → ReviewReport" → [pkg-d, pkg-e]
│                 "FilePath → JSON" → [pkg-f, ...]
└── vector-index: embedding(description) → approximate nearest neighbors
```

All three indices are queried in combination for maximum recall.

---

## Typed Discovery API

### Query by Interface

```bash
# Find all Effectors that take a CodeDiff and produce any Report
effector-graph query --input CodeDiff --output "*Report"

# Find all Effectors that can run in a GitHub Actions context
effector-graph query --context GitHubCredentials

# Find code-to-report pipelines with known trust level
effector-graph query --input CodeDiff --output SecurityReport --trust verified
```

### HTTP API (Registry)

```
GET /api/v1/discover?input=CodeDiff&output=SecurityReport
GET /api/v1/discover?context=GitHubCredentials&output=Markdown
GET /api/v1/discover?input=URL&output=*
```

Response:

```json
{
  "query": { "input": "CodeDiff", "output": "SecurityReport" },
  "results": [
    {
      "name": "pr-guardian",
      "version": "2.4.0",
      "interface": {
        "input": "CodeDiff",
        "output": "SecurityReport",
        "context": ["Repository", "CodingStandards", "GitHubCredentials"]
      },
      "compatibility": 1.0,
      "trust": "verified",
      "stars": 847,
      "weekly_downloads": 12400
    },
    {
      "name": "code-fence-checker",
      "version": "1.1.0",
      "interface": {
        "input": "CodeDiff",
        "output": "SecurityReport",
        "context": ["Repository"]
      },
      "compatibility": 1.0,
      "trust": "signed",
      "stars": 203
    }
  ]
}
```

### Structural Compatibility in Search

The registry uses **structural subtyping** when matching. A query for `ReviewReport` output will also return Effectors that output `SecurityReport` (if `SecurityReport` extends `ReviewReport` by having all required fields plus extras):

```
Query: output = ReviewReport
Matches:
  ✓ output = ReviewReport        (exact match, compatibility = 1.0)
  ✓ output = SecurityReport      (structural subtype, compatibility = 0.95)
  ✓ output = CodeReviewReport    (structural subtype, compatibility = 0.92)
  ✗ output = DeploymentStatus    (incompatible shape, compatibility = 0.0)
```

---

## Interface Declaration (Manifest)

Effectors declare their typed interface in `effector.toml`:

```toml
[effector]
name = "pr-guardian"
version = "2.4.0"
type = "skill"
description = "Security-focused code review for pull requests"

[effector.interface]
input   = "CodeDiff"
output  = "SecurityReport"
context = ["Repository", "CodingStandards", "GitHubCredentials"]

[effector.interface.cost]
cost-estimate    = "medium"    # low | medium | high | variable
token-budget     = 8000
latency-p50      = "3s"
nondeterminism   = "low"       # none | low | moderate | high
idempotent       = true

[effector.permissions]
network = true
env-read = ["GITHUB_TOKEN"]
```

### Interface Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `input` | TypeRef | Yes | The primary input type (from effector-types standard library) |
| `output` | TypeRef | Yes | The primary output type |
| `context` | TypeRef[] | No | Required context types (tools, credentials, config) |
| `input-schema` | object | No | JSON Schema for custom/composite input |
| `output-schema` | object | No | JSON Schema for custom/composite output |

A `TypeRef` is either a name from the standard library (`"CodeDiff"`, `"Markdown"`) or a locally-defined type name (must be defined in `[effector.types.*]`).

---

## Type Inference for Untyped Effectors

Not all existing Effectors will have `[effector.interface]` declared — especially the 13,000+ legacy skills on ClawHub. The registry applies **type inference** to fill the gap.

### Inference Algorithm

```
For each untyped Effector:
  1. Extract YAML frontmatter from SKILL.md
  2. Map `requires.bins` + `requires.env` → context types
     e.g., GITHUB_TOKEN → GitHubCredentials
           docker       → Docker
           kubectl      → Kubernetes
  3. Analyze description with embedding model
     → nearest-neighbor lookup in typed Effector space
     → assign input/output types with confidence score
  4. Scan SKILL.md body for structural patterns:
     - "takes a diff / PR / patch" → input: CodeDiff (conf 0.85)
     - "outputs a report / summary" → output: Markdown (conf 0.78)
     - "posts to Slack" → output: SlackMessage (conf 0.91)
  5. Produce inferred interface with confidence:
     input  = "CodeDiff" (conf 0.85)
     output = "Markdown" (conf 0.78)
     context = ["GitHubCredentials", "Repository"] (conf 0.95)
```

### Confidence Display

Registry UIs display inferred types differently from declared types:

```
pr-guardian v2.4.0
  input:  CodeDiff          ← declared  
  output: SecurityReport    ← declared

legacy-checker v0.3.0
  input:  CodeDiff ~85%     ← inferred
  output: Markdown ~78%     ← inferred
```

Inferred types are used for search indexing but are marked as provisional. Authors are notified and prompted to add explicit declarations.

---

## Capability Graph Navigation

The type index enables **graph navigation** — traversing the capability network rather than searching it.

### Reachability Query

Given a starting type, what output types can be produced through one or more composition steps?

```bash
effector-graph paths --from String --to SecurityReport
```

Response:

```
String → CodeDiff → SecurityReport
  via: string-to-diff (1.2.0) → pr-guardian (2.4.0)
  latency: ~4s, tokens: ~11k

String → URL → PageContent → Markdown → Summary
  via: url-extractor (0.8.0) → web-scraper (2.1.0) → summarizer (3.0.0)
  latency: ~8s, tokens: ~6k
```

### Gap Detection

The graph also surfaces gaps — type pairs for which no direct path exists:

```bash
effector-graph gaps --high-demand
```

```
Most-requested missing paths (by query volume):
  1. AudioSegment → TranscriptWithTimestamps  (0 Effectors)
  2. DataTable → VisualizationSVG             (1 Effector, no trust=verified)
  3. IssueRef → Markdown + DeploymentStatus   (0 Effectors)
```

Gap detection drives the ecosystem's roadmap — publishing to fill gaps is more valuable than publishing in already-saturated type pairs.

---

## ClawHub Integration

ClawHub is the reference registry implementation for the Discovery Protocol. Key integration points:

### Skill Format

ClawHub skills use `SKILL.md` + YAML frontmatter. The Effector manifest (`effector.toml`) is the superset format; ClawHub can read either:

```yaml
# SKILL.md frontmatter (ClawHub format)
name: pr-guardian
description: Security-focused code review for pull requests
metadata:
  openclaw:
    interface:
      input: CodeDiff
      output: SecurityReport
      context: [Repository, CodingStandards, GitHubCredentials]
requires:
  env: [GITHUB_TOKEN]
  bins: [git]
```

```toml
# effector.toml (Effector spec format — superset)
[effector]
name = "pr-guardian"
version = "2.4.0"
type = "skill"

[effector.interface]
input   = "CodeDiff"
output  = "SecurityReport"
context = ["Repository", "CodingStandards", "GitHubCredentials"]
```

Both formats are accepted; `effector.toml` takes precedence when both are present.

### Vector Search

ClawHub's existing vector index (`text-embedding-3-small` on descriptions) is extended with **type embeddings**: each type name is embedded, enabling fuzzy type matching (e.g., `Diff` matches `CodeDiff` with high similarity).

### CLI Discovery

```bash
# Install effector-graph for local discovery
npm install -g effector-graph

# Index a local set of effectors
effector-graph index ./my-effectors/

# Query the local index
effector-graph query --input CodeDiff

# Query ClawHub remotely
effector-graph query --input CodeDiff --registry https://clawhub.io
```

---

## Discovery Protocol Conformance

A registry is **Discovery Protocol conformant** if it:

| Requirement | Level |
|------------|-------|
| Indexes `[effector.interface]` input/output/context | MUST |
| Returns results ordered by type compatibility score | MUST |
| Supports wildcard output queries (`output=*Report`) | MUST |
| Applies structural subtype matching | SHOULD |
| Runs type inference on untyped packages | SHOULD |
| Exposes capability graph traversal | MAY |
| Surfaces gap detection data | MAY |

---

## Relationship to Other Protocols

| Protocol | Relationship |
|----------|-------------|
| **npm search** | Name + keyword search only; no type index |
| **MCP Tool Discovery** | Schema-level; per-tool JSON Schema; no cross-tool type graph |
| **OpenAPI** | Per-endpoint schema; no semantic type shared vocabulary |
| **A2A (Google)** | Agent-to-agent task routing; complementary (routes agents, not skills) |
| **OASF** | Observability schema; downstream of discovery |
| **effector-types** | Defines the shared vocabulary used in discovery queries |
