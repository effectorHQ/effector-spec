# 06 — Security

**Status:** Draft
**Version:** 0.1.0

---

## Security Model

Effectors run inside agent runtimes that have access to user data, external APIs, and system resources. The security model defines how Effectors declare their requirements and how runtimes enforce boundaries.

The model follows two principles:

1. **Declare everything** — Effectors must declare every permission they need
2. **Deny by default** — Runtimes grant no permissions unless explicitly declared and approved

## Permission Declarations

### Manifest Permissions

```toml
[effector.permissions]
network = true                          # Requires network access
filesystem = ["read"]                   # "read" | "write" | "read-write"
env-read = ["GITHUB_TOKEN", "HOME"]     # Environment variables read
env-write = []                          # Environment variables written
subprocess = true                       # Spawns child processes
secrets = ["github-token"]              # Named secrets from secret store
```

### Permission Types

| Permission | Values | Default | Description |
|-----------|--------|---------|-------------|
| `network` | `true` / `false` | `false` | Can make HTTP/TCP connections |
| `filesystem` | `[]` / `["read"]` / `["write"]` / `["read-write"]` | `[]` | File system access |
| `env-read` | string array | `[]` | Environment variables the Effector reads |
| `env-write` | string array | `[]` | Environment variables the Effector modifies |
| `subprocess` | `true` / `false` | `false` | Can spawn child processes |
| `secrets` | string array | `[]` | Named secrets from the runtime's secret store |
| `system` | `true` / `false` | `false` | Access to system-level operations (rare) |

### Filesystem Scoping

Filesystem permissions can be scoped to specific paths:

```toml
[effector.permissions]
filesystem = ["read"]
filesystem-paths = [
  "~/.openclaw/workspace/",
  "./output/"
]
```

If `filesystem-paths` is omitted, the runtime determines the default scope (typically the workspace directory).

## Trust Levels

Effectors are classified into trust levels based on their source and verification status:

| Level | Source | Verification | Permissions |
|-------|--------|-------------|-------------|
| **Bundled** | Shipped with the runtime | Signed by runtime team | Full (within declared scope) |
| **Verified** | Published to an official registry | Passed automated security checks | Declared permissions honored |
| **Community** | Published by community authors | Basic validation only | Declared permissions + user approval |
| **Local** | Installed from filesystem | No verification | Declared permissions + user approval |
| **Untrusted** | Unknown source | None | Sandboxed; all permissions require explicit approval |

### Trust Escalation

A community Effector can be escalated to "verified" if:

1. It passes the security toolkit checks (`@effectorhq/security-audit`)
2. A maintainer reviews and signs the package
3. It maintains a clean security record over time

### Trust Downgrade

Verification can be revoked if:

1. A vulnerability is discovered
2. The Effector's behavior changes to exceed declared permissions
3. The author's registry account is compromised

## Runtime Enforcement

### Pre-Install Checks

Before installing an Effector, the runtime SHOULD:

1. **Display permissions** — Show the user what the Effector requires
2. **Compare trust level** — Warn if the Effector's trust level is lower than expected
3. **Check for conflicts** — Flag if permissions conflict with the runtime's security policy
4. **Verify checksums** — Validate the package integrity against the registry's checksum

### Example: Permission Prompt

```
Installing: github-pr-review v1.2.0 (skill)
Trust level: Community

Permissions requested:
  ✓ Network access (to connect to GitHub API)
  ✓ Subprocess execution (to run gh CLI)
  ✓ Read env: GITHUB_TOKEN
  ✗ No filesystem write access
  ✗ No system access

Install and grant permissions? [y/N]
```

### Runtime Sandbox

For `extension` type Effectors (which run code), the runtime SHOULD enforce:

| Constraint | Enforcement |
|-----------|-------------|
| Network | Proxy or firewall; allow only declared destinations |
| Filesystem | chroot or permission mask; limit to declared paths |
| Subprocess | Allowlist of permitted binaries |
| Memory | Limit memory allocation per extension |
| CPU | Limit execution time per invocation |
| Secrets | Inject only declared secrets; redact from logs |

### Skill-Specific Security

Skills (SKILL.md) are instruction-based — they don't execute code directly. But they instruct the agent to use tools, which can be dangerous. Security checks for skills:

1. **Tool usage audit** — Does the skill instruct use of destructive commands (rm, DROP, etc.)?
2. **Credential handling** — Does the skill handle API keys safely (env vars, not hardcoded)?
3. **Scope creep** — Does the skill instruct actions beyond its declared purpose?
4. **Injection risk** — Could the skill's instructions be manipulated by untrusted input?

The [`security-toolkit`](https://github.com/effectorHQ/security-toolkit) CLI performs these checks:

```bash
npx @effectorhq/security-audit ./SKILL.md
```

## Vulnerability Reporting

### For Effector Authors

If you discover a vulnerability in your Effector:

1. Immediately publish a patched version
2. Add a `[effector.security]` advisory to the manifest:

```toml
[effector.security]
advisory = "https://github.com/effectorHQ/my-effector/security/advisories/GHSA-xxxx-xxxx-xxxx"
deprecated-versions = ["<1.2.1"]
```

3. Notify the registry to flag affected versions

### For Users

If you discover a vulnerability in an Effector:

1. Do **not** open a public issue (to avoid exploitation)
2. Report to the author via GitHub Security Advisory
3. If the author is unresponsive, report to the registry administrators

## Security Checklist for Authors

Before publishing an Effector:

- [ ] All permissions are declared in `effector.toml`
- [ ] No credentials are hardcoded (use environment variables)
- [ ] No destructive commands without explicit user confirmation
- [ ] Dependencies are pinned to specific versions (no `*` in production)
- [ ] The Effector passes `@effectorhq/security-audit` with no critical findings
- [ ] CHANGELOG documents any permission changes between versions
- [ ] README clearly states what the Effector accesses and why
