# 01 — Type Language

**Status:** Draft
**Version:** 0.2.0

---

## Overview

The Effector Type Language defines how capabilities declare their interface contracts. It is a formal language for expressing what an Effector accepts as input, what it produces as output, and what environment it requires.

The type system uses **structural subtyping** — compatibility is determined by shape, not by name or inheritance hierarchy. This means:

- No explicit "implements" or "extends" declarations
- Any type with the right fields is compatible
- Domain-specific types compose automatically with standard types
- The type library grows organically without central coordination

This design follows TypeScript's structural type system rather than Java's nominal type system — because coordination-free growth is essential for a community-driven capability ecosystem.

## Core Type Categories

### Input Types

What an Effector receives as its primary data argument.

```
InputType :=
  | PrimitiveType
  | DocumentType
  | CodeType
  | ReferenceType
  | StructuredType
  | FileType
```

**Primitive types** — atomic values:
```
TextString      { value: string }
NumberValue     { value: number }
BooleanFlag     { value: boolean }
URLString       { value: string, format: "url" }
EmailAddress    { value: string, format: "email" }
EnumSelection   { value: string, options: string[] }
```

**Document types** — text-based content:
```
TextDocument    { content: string, format: "plain" | "markdown" | "html" | "rst" }
MarkdownContent { content: string }
JSONPayload     { data: object, schema?: JSONSchema }
YAMLContent     { content: string }
```

**Code types** — source code with language context:
```
CodeSnippet     { code: string, language: string, path?: string }
CodeFile        { path: string, language: string, content?: string }
CodeDiff        { files: FileDiff[], baseBranch?: string, headBranch?: string }
PatchSet        { patches: Patch[], description: string }
SQLQuery        { query: string, dialect?: string }
```

**Reference types** — pointers to external resources:
```
RepositoryRef   { url: string, provider: "github" | "gitlab" | "bitbucket", branch?: string }
IssueRef        { number: integer, repository: string }
PullRequestRef  { number: integer, repository: string, branch: string }
CommitRef       { sha: string, repository: string }
FilePath        { path: string, absolute?: boolean }
DirectoryPath   { path: string }
```

**Structured types** — data containers:
```
DataTable       { headers: string[], rows: unknown[][], types?: ColumnType[] }
KeyValueMap     { entries: Record<string, unknown> }
ConfigObject    { settings: Record<string, unknown>, format?: string }
SearchQuery     { query: string, filters?: Record<string, unknown> }
NaturalLanguage { instruction: string }
```

**File types** — binary and file system:
```
FileRef         { path: string, mimeType: string, size?: number }
ImageRef        { path?: string, url?: string, mimeType: string }
DocumentFile    { path: string, format: "pdf" | "docx" | "xlsx" | "pptx" }
DataFile        { path: string, format: "csv" | "tsv" | "json" | "parquet" }
```

### Output Types

What an Effector produces as its result.

```
OutputType :=
  | ReportType
  | NotificationType
  | CodeOutputType
  | FileOutputType
  | StatusType
  | DataOutputType
```

**Report types** — analysis results:
```
MarkdownReport  { content: string, summary?: string }
ReviewReport    { findings: Finding[], severity: Severity, summary: string }
SecurityReport  { vulnerabilities: Vulnerability[], riskLevel: RiskLevel, findings: Finding[], severity: Severity, summary: string }
PerformanceReport { metrics: Metric[], summary: string, recommendations: string[] }
AggregateReport { reports: Report[], overallSeverity: Severity, summary: string }
```

**Note on structural subtyping**: `SecurityReport` is a structural subtype of `ReviewReport` because it contains all required fields of `ReviewReport` (`findings`, `severity`, `summary`) plus additional fields. This means any Effector expecting `ReviewReport` will accept `SecurityReport` automatically.

**Notification types** — messages to humans or systems:
```
SlackMessage    { channel: string, text: string, blocks?: object[] }
DiscordMessage  { channelId: string, content: string, embeds?: object[] }
EmailDraft      { to: string[], subject: string, body: string, format: "plain" | "html" }
WebhookPayload  { url: string, payload: object, method: "POST" | "PUT" }
Notification    { channel: "slack" | "discord" | "email" | "webhook", content: string }
```

**Code output types** — generated or modified code:
```
GeneratedCode   { content: string, language: string, path?: string }
GitCommit       { message: string, files: string[], sha?: string }
PullRequest     { title: string, body: string, branch: string, url?: string }
Diff            { content: string, format: "unified" | "context" }
```

**File output types** — created or modified files:
```
FileOutput      { path: string, content: string, mimeType?: string }
DocumentOutput  { path: string, format: "pdf" | "docx" | "md" }
DataExport      { path: string, format: "csv" | "json" | "xlsx", rowCount?: number }
```

**Status types** — operation results:
```
OperationStatus { success: boolean, message: string, code?: integer }
DeploymentStatus { environment: string, version: string, status: "success" | "failed" | "pending" }
TestResult      { passed: integer, failed: integer, skipped: integer, details: string }
LogOutput       { lines: string[], level: "info" | "warn" | "error" }
```

**Data output types** — structured results:
```
SearchResults   { items: SearchResult[], total: integer, query: string }
DataTable       { headers: string[], rows: unknown[][] }
JSONResult      { data: object, schema?: object }
Summary         { text: string, keyPoints: string[], confidence: number }
```

### Context Types

What environment an Effector requires to function.

```
ContextType :=
  | CredentialContext
  | ToolContext
  | ConfigContext
  | AgentContext
```

**Credential contexts** — authentication and API access:
```
GitHubCredentials  { token: string, username?: string }
GitLabCredentials  { token: string, host?: string }
SlackCredentials   { token: string, workspaceId?: string }
AWSCredentials     { accessKeyId: string, secretKey: string, region: string }
GenericAPIKey      { key: string, service: string }
```

**Tool contexts** — required binaries and services:
```
GitContext        { binPath: string, version?: string }
DockerContext     { socketPath?: string, version?: string }
KubernetesContext { kubeconfig: string, namespace?: string }
NodeContext       { version: string, npmVersion?: string }
PythonContext     { version: string, pipVersion?: string }
```

**Config contexts** — runtime configuration:
```
Repository        { url: string, branch: string, provider?: string }
CodingStandards   { rules: Rule[], linter?: string, style?: string }
UserPreferences   { language?: string, timezone?: string, verbosity?: "minimal" | "normal" | "detailed" }
```

**Agent contexts** — agent state:
```
ConversationHistory { messages: Message[], tokenCount: integer }
AgentMemory       { entries: MemoryEntry[], workingSet: string[] }
```

## The Interface Declaration

Every Effector declares its typed interface in `effector.toml`:

```toml
[effector.interface]
input   = "CodeDiff"        # Input type name (from stdlib or custom)
output  = "ReviewReport"    # Output type name
context = ["Repository", "CodingStandards", "GitHubCredentials"]  # Required contexts
```

For more precision, inline type declarations are supported:

```toml
[effector.interface]
input = { type = "CodeDiff", required = true, description = "The PR diff to review" }
output = { type = "ReviewReport", format = "markdown" }
context = [
  { type = "Repository", required = true },
  { type = "CodingStandards", required = false, description = "If absent, uses defaults" }
]
```

## Structural Subtyping Rules

Two types are **compatible** if:

1. **Identical types**: `CodeDiff` is compatible with `CodeDiff` (precision 1.0)

2. **Structural superset**: Type A is compatible with Type B (as input) if A has all of B's required fields with compatible types. Extra fields in A are ignored. Precision = `|matched fields| / |A fields|`.

3. **Wildcard matching**: Type pattern `*Report` matches any type whose name ends with "Report" (precision 0.8).

4. **Explicit subtype declaration** (optional, increases precision):
   ```toml
   [effector.interface]
   output = "SecurityReport"
   output-subtypes = ["ReviewReport", "AggregateReport"]
   ```

Runtimes MUST use structural subtype matching when checking composition compatibility. Nominal type checking (requiring exact name match) is PROHIBITED — it breaks community-extensible composition.

## Cost and Resource Typing

Every Effector SHOULD declare resource consumption estimates:

```toml
[effector.resources]
cost-estimate  = "~0.02 USD"    # Per-invocation cost estimate
token-budget   = 2000           # Approximate LLM tokens consumed
latency-p50    = "3s"           # Median latency
latency-p99    = "30s"          # Tail latency
requires       = ["github-api", "llm-inference"]  # External resource dependencies
```

These declarations enable cost-aware pipeline composition — the composition engine can warn when a pipeline's estimated cost exceeds a budget, or suggest cheaper alternatives with compatible types.

## Nondeterminism Annotation

AI capabilities are nondeterministic. The same input can produce different outputs across invocations. This is different from pure functions and affects composition guarantees:

```toml
[effector.interface]
nondeterminism = "high"     # "none" | "low" | "moderate" | "high"
idempotent     = false      # Whether re-execution produces the same result
```

Composition rules for nondeterministic Effectors:

- **Sequential composition** with a nondeterministic Effector requires the downstream Effector to handle the full output type union, not just the "happy path" type.
- **Parallel composition** of two nondeterministic Effectors requires explicit merge semantics.
- **Deterministic Effectors** (code execution, data transformation) can be composed without nondeterminism annotations.

## Standard Library Types

The standard library (`effector-types`) provides pre-defined types for the most common patterns observed in real-world skills:

**Top input types by usage frequency** (from analysis of 13,729+ community skills):

| Type | Frequency | Primary Use |
|------|-----------|-------------|
| `TextString` | 62% | Queries, prompts, instructions |
| `FilePath` | 18% | Code files, documents, data |
| `URLString` | 12% | APIs, web pages, resources |
| `JSONPayload` | 5% | Structured API data |
| `RepositoryRef` | 4% | GitHub/GitLab repositories |
| `CodeDiff` | 3% | PR review, code analysis |
| `IssueRef` | 2% | Issue triage and management |

**Top output types by usage frequency**:

| Type | Frequency | Primary Use |
|------|-----------|-------------|
| `MarkdownReport` | 45% | Analysis, summaries, docs |
| `JSONResult` | 28% | Structured API responses |
| `LogOutput` | 15% | Operation results, debug |
| `FileOutput` | 8% | Generated code, exports |
| `Notification` | 3% | Slack, Discord, email alerts |

**Top context types by usage frequency**:

| Type | Frequency | Primary Use |
|------|-----------|-------------|
| `GitHubCredentials` | 38% | GitHub API, PR automation |
| `GitContext` | 34% | Version control operations |
| `DockerContext` | 22% | Container operations |
| `GenericAPIKey` | 20% | External service APIs |
| `NodeContext` / `PythonContext` | 18% | Build tools, scripts |
| `KubernetesContext` | 15% | Cluster management |
| `AWSCredentials` | 14% | Cloud infrastructure |
| `SlackCredentials` | 12% | Notifications, messaging |

Community packages extend the standard library with domain-specific types following the same structural subtyping rules.

## Type Inference

For existing Effectors without explicit type declarations, runtimes and tooling SHOULD infer types:

1. **From SKILL.md frontmatter**: Parse `env:`, `input:`, and resource declarations to infer context and input types
2. **From MCP tool schema**: Map JSON Schema parameters to Effector types
3. **From LLM analysis**: Use the skill description to suggest probable input/output types
4. **From usage patterns**: Observe real invocations and infer types from actual data shapes

Inferred types have lower precision than declared types and SHOULD be marked as such:

```toml
[effector.interface]
input  = "TextString"        # inferred: true
output = "MarkdownReport"    # inferred: true
inferred-confidence = 0.87
```
