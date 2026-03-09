# Changelog

All notable changes to the Effector Specification will be documented in this file.

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
