# Changelog

All notable changes to the Effector Specification will be documented in this file.

## [0.2.0] — 2026-03-10

### Added

- **Type Language (01)** — New core document: InputType, OutputType, ContextType taxonomies; structural subtyping rules; nondeterminism + cost annotations (`nondeterminism`, `idempotent`, `token-budget`, `latency-p50`); standard library grounded in 13,729+ ClawHub skills; type inference algorithm for untyped Effectors
- **Composition Algebra (02)** — Four operators with type rules: Sequential (`→`), Parallel (`‖`), Conditional (`?`), Fallback (`|`); five normative type-check error codes (`TC_OK` through `TC_ERR_CONTEXT`)
- **Discovery Protocol (03)** — Type-indexed search API; structural subtype matching in results; capability graph traversal; gap detection; ClawHub SKILL.md frontmatter mapping
- **`[effector.interface]` block** — All 6 type descriptions in doc 05 updated with canonical interface patterns
- **Type step in lifecycle (08)** — Stage 2 "Type" inserted between Create and Validate
- **Permission-as-type framing (07)** — Static analysis of permission consistency against declared interface
- **Runtime type-check pass (06)** — Pre-execution type validation pass with result codes

### Changed

- **Spec numbering restructured** — Old 7-doc manifest-centric → New 8-doc type-system-centric (00–08); order: overview → type-language → composition → discovery → manifest → types → runtime-binding → security → lifecycle
- **`effector-audit` rename** — All `@effectorhq/security-audit` / `security-toolkit` refs → `effector-audit`
- **effector-types stdlib expanded** — 18 new types grounded in ClawHub data: `RepositoryRef`, `IssueRef`, `CommitRef`, `PullRequestRef`, `URL`, `FilePath`, `PlainText`, `Markdown`, `JSON`, `LangTag`, `TestResult`, `DeploymentStatus`, `OperationStatus`, `LintReport`, `Notification`, `SlackMessage`, `DiscordMessage`; 8 new context types: `GitHubCredentials`, `GenericAPIKey`, `Docker`, `Kubernetes`, `AWSCredentials`, `SlackCredentials`, `ShellEnvironment`, `PromptContext`
- **`effector-audit/src/permissions/diff.js`** — Fixed top-level `await import()` in sync function; use static import

### Research Foundation

Type standard library grounded in automated analysis of 13,729 ClawHub skills (March 2026). Input: String (62%), FilePath (18%), URL (12%), JSON (5%), RepositoryRef (4%), CodeDiff (3%). Output: Markdown (45%), JSON (28%), PlainText (15%), File (8%), Notification (3%). Context: GitHubCredentials (38%), Git (34%), Docker (22%), GenericAPIKey (20%), Kubernetes (15%).

## [0.1.0] — 2026-03-09

### Added

- Initial draft specification
- Overview document (00) — scope, principles, conceptual model, terminology
- Manifest format (01) — `effector.toml` with required/optional fields, runtime bindings, dependencies, permissions
- Type taxonomy (02) — skill, extension, workflow, workspace, bridge, prompt types with OpenClaw mappings
- Lifecycle (03) — create, validate, package, publish, discover, install, execute stages
- Composition model (04) — dependencies, composition patterns, capability negotiation, lock files
- Runtime binding (05) — OpenClaw reference binding, MCP binding, generic binding, binding priority
- Security model (06) — permission declarations, trust levels, runtime enforcement, vulnerability reporting
- JSON Schema for manifest validation (`schemas/effector.schema.json`)
- Example manifests for all six Effector types (`schemas/examples/`)
