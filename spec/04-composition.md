# 04 — Composition

**Status:** Draft
**Version:** 0.1.0

---

## Composition Model

Effectors are designed to compose. A workflow chains skills. A workspace bundles skills, extensions, and prompts. This section defines how composition works.

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
