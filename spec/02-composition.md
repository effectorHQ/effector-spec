# 02 — Composition Algebra

**Status:** Draft
**Version:** 0.2.0

---

## Composition Is Type-Checked

Effectors are designed to compose. But composition without type checking is guesswork — an agent runtime wiring `docker-build → slack-notify` has no way to know whether the output of one is a valid input for the other, until it fails at 2am in production.

The Effector Composition Algebra solves this: every composition operation has a **type rule** that the runtime verifies before execution. A type error at wire-up time is infinitely cheaper than a runtime failure.

---

## The Four Composition Operators

### Sequential (`→`)

One Effector feeds its output directly into the next Effector's input.

```
A → B   iff   output(A) <: input(B)
```

The `<:` relation is structural subtyping: `output(A)` must have at least all the fields required by `input(B)`, with compatible types.

```yaml
# pipeline.yml
pipeline:
  - effector: code-analyzer     # input: CodeDiff, output: ReviewReport
  - effector: report-formatter  # input: ReviewReport, output: Markdown
  - effector: slack-poster      # input: Markdown, output: Notification
```

Type check:
```
code-analyzer.output    = ReviewReport
report-formatter.input  = ReviewReport   ✓ (exact match)
report-formatter.output = Markdown
slack-poster.input      = Markdown       ✓ (exact match)
```

If `code-analyzer` were replaced with a skill outputting `DeploymentStatus`, the pipeline would reject at type-check time: `DeploymentStatus </: ReviewReport`.

### Parallel (`‖`)

Multiple Effectors run concurrently from the same input, their outputs merged.

```
A ‖ B   iff   input(A) <: T  and  input(B) <: T  (same input source T)
```

```yaml
pipeline:
  - source: code-diff
  - parallel:
      - effector: security-scanner    # input: CodeDiff, output: SecurityReport
      - effector: style-checker       # input: CodeDiff, output: StyleReport
      - effector: test-runner         # input: CodeDiff, output: TestResult
  - effector: report-aggregator       # input: [SecurityReport, StyleReport, TestResult]
```

The `report-aggregator`'s input type is validated against the merged output array of all parallel branches.

### Conditional (`?`)

One of several branches is selected at runtime based on a predicate. The type rule requires all branches to produce compatible outputs:

```
A ? B : C   iff   output(B) <: R  and  output(C) <: R  (some common supertype R)
```

```yaml
pipeline:
  - effector: lang-detector       # input: String, output: LangTag
  - conditional:
      predicate: "output.lang == 'python'"
      then:
        effector: python-linter   # output: LintReport
      else:
        effector: generic-linter  # output: LintReport
  - effector: report-poster       # input: LintReport
```

Both branches output `LintReport` — the downstream Effector sees a consistent type regardless of which branch ran.

### Fallback (`|`)

If the primary Effector fails (error, timeout, permission denied), the fallback runs. Type rule: fallback must accept the same input and produce a compatible output.

```
A | B   iff   input(B) <: input(A)  and  output(B) <: output(A)
```

```yaml
pipeline:
  - effector: gpt4-reviewer       # input: CodeDiff, output: ReviewReport
    fallback:
      effector: basic-linter      # input: CodeDiff, output: ReviewReport (simplified)
```

This enables graceful degradation: a high-quality LLM-based reviewer falls back to a deterministic linter when the LLM is unavailable, without the downstream pipeline noticing.

---

## Type Checking Rules (Normative)

A runtime implementing composition MUST reject a pipeline if any of the following conditions hold:

```
RULE 1: Sequential type mismatch
  output(step[i]) </: input(step[i+1])
  → ERROR: "Type mismatch at step N: output ${T1} is not assignable to input ${T2}"

RULE 2: Parallel merge type conflict
  ∃ branch b: output(b) </: declared_merge_input
  → ERROR: "Parallel branch ${B} output ${T} is not assignable to merge target"

RULE 3: Conditional branch divergence
  ¬∃ supertype R s.t. output(then) <: R ∧ output(else) <: R
  → ERROR: "Conditional branches produce incompatible types: ${T1} vs ${T2}"

RULE 4: Fallback signature mismatch
  input(fallback) </: input(primary)  OR  output(fallback) </: output(primary)
  → ERROR: "Fallback must be substitutable for primary"

RULE 5: Unknown type
  A type reference not in effector-types standard library and not locally defined
  → WARNING: "Unresolved type ${T} — treating as unknown (skipping type check for this step)"
```

Rule 5 produces a warning (not an error) to preserve backward compatibility with untyped legacy skills.

---

## Composition Model

## Dependencies

### Declaration

Dependencies are declared as an array of tables in the manifest:

```toml
[[effector.dependencies]]
name = "git-operations"
version = ">=1.0.0"
type = "skill"
optional = false
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | The dependency's package name |
| `version` | string | Yes | Semver constraint |
| `type` | string | No | Expected Effector type (validated at install time) |
| `optional` | boolean | No | If `true`, the Effector works without it (default: `false`) |
| `registry` | string | No | Override the default registry for this dependency |

### Resolution Algorithm

1. **Collect** — Gather all dependency declarations from the Effector and its transitive dependencies
2. **Resolve** — For each dependency, find the highest version that satisfies all constraints
3. **Detect conflicts** — If two Effectors require incompatible versions of the same dependency, report an error
4. **Flatten** — Produce a flat list of resolved dependencies (no duplicates)
5. **Validate** — Check that resolved types match declared types
6. **Install** — Install in dependency order (leaves first)

### Circular Dependency Detection

Circular dependencies are **not allowed**. The resolver MUST detect and reject cycles:

```
A depends on B
B depends on C
C depends on A   ← REJECTED: circular dependency
```

## Composition Patterns

### Pattern 1: Skill Chaining (via Workflow)

A workflow Effector chains skill Effectors:

```toml
# deploy-and-notify/effector.toml
[effector]
name = "deploy-and-notify"
type = "workflow"

[[effector.dependencies]]
name = "docker-build"
version = ">=1.0.0"
type = "skill"

[[effector.dependencies]]
name = "kubernetes-apply"
version = ">=1.0.0"
type = "skill"

[[effector.dependencies]]
name = "slack-notify"
version = ">=2.0.0"
type = "skill"
```

The pipeline file references these skills by name:

```yaml
# pipeline.yml
steps:
  - skill: docker-build
    params:
      image: ${IMAGE_NAME}
      tag: ${VERSION}
  - skill: kubernetes-apply
    params:
      manifest: ./k8s/deployment.yml
  - skill: slack-notify
    params:
      channel: "#deployments"
      message: "Deployed ${IMAGE_NAME}:${VERSION}"
```

### Pattern 2: Workspace Bundling

A workspace Effector bundles a complete agent configuration:

```toml
# devops-engineer/effector.toml
[effector]
name = "devops-engineer"
type = "workspace"

[[effector.dependencies]]
name = "docker-compose"
version = ">=2.0.0"
type = "skill"

[[effector.dependencies]]
name = "kubernetes-deploy"
version = ">=1.0.0"
type = "skill"

[[effector.dependencies]]
name = "terraform-plan"
version = ">=1.0.0"
type = "skill"

[[effector.dependencies]]
name = "security-scan"
version = ">=1.0.0"
type = "skill"

[[effector.dependencies]]
name = "deploy-and-notify"
version = ">=1.0.0"
type = "workflow"
```

When installed, the workspace's skills are co-installed automatically.

### Pattern 3: Extension Enhancement

An extension Effector can enhance skills with additional capabilities:

```toml
# github-enhanced/effector.toml
[effector]
name = "github-enhanced"
type = "extension"

[[effector.dependencies]]
name = "github-pr-review"
version = ">=1.0.0"
type = "skill"

[[effector.dependencies]]
name = "github-issue-triage"
version = ">=1.0.0"
type = "skill"
```

The extension provides code-level hooks (webhooks, authentication) that the skills can leverage.

### Pattern 4: Prompt + Skill Combination

A prompt Effector provides the instruction template; a skill provides the tooling:

```toml
# thorough-review/effector.toml
[effector]
name = "thorough-review"
type = "prompt"

[[effector.dependencies]]
name = "code-analysis"
version = ">=1.0.0"
type = "skill"
optional = true
```

## Capability Negotiation

When a runtime loads an Effector, it negotiates capabilities:

1. **Check runtime bindings** — Does the Effector have a binding for this runtime?
2. **Check requirements** — Are required binaries, env vars, and skills available?
3. **Check permissions** — Does the runtime's security policy allow the declared permissions?
4. **Fallback** — If the primary binding fails, can the Effector fall back to a generic binding?

### Negotiation Result

| Outcome | Meaning |
|---------|---------|
| `ready` | All requirements met; Effector can execute |
| `degraded` | Optional dependencies missing; partial functionality |
| `blocked` | Required dependency or permission unavailable; cannot execute |
| `incompatible` | No runtime binding exists for this runtime |

Runtimes SHOULD report the negotiation result to the user with actionable resolution steps.

## Lock Files

For reproducible installations, runtimes SHOULD support lock files:

```toml
# effector.lock
# Auto-generated. Do not edit.

[[package]]
name = "docker-compose"
version = "2.1.3"
type = "skill"
checksum = "sha256:abc123..."
registry = "clawhub"

[[package]]
name = "slack-notify"
version = "2.3.0"
type = "skill"
checksum = "sha256:def456..."
registry = "clawhub"
```

Lock files pin exact versions and checksums, ensuring that `install` produces identical results across environments.
