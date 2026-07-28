# ADR-0003: Security Scanning — CodeQL + Trivy + Gitleaks

- **Status:** Accepted
- **Date:** 2025-01-28
- **Deciders:** Platform Agent
- **Related:** RFC-0001, ADR-0001, openspec/specs/security/spec.md

## Context

The `frontend` SPA processes user inputs, calls external services, and is served as a
Docker container. All three layers (source code, dependencies, container image) must be
scanned for vulnerabilities before reaching production. Security scanning must be automated
in CI and must block merges on CRITICAL/HIGH findings.

## Decision

We will integrate three scanning layers in CI:

| Layer | Tool | Gate |
|-------|------|------|
| SAST (source code) | **GitHub CodeQL** (`security-extended` queries, JS/TS) | Blocks PR on CRITICAL/HIGH |
| Dependency SCA | **`npm audit --audit-level=high`** + **Trivy fs** | Blocks PR on CRITICAL/HIGH |
| Secrets detection | **Gitleaks** (`detect --no-git --quiet`) | Blocks PR on any finding |
| Container image CVEs | **Trivy image** | Blocks release on CRITICAL/HIGH |

All scanning runs via `devbox run security` (audit + gitleaks) and dedicated GitHub Actions
steps (CodeQL action, Trivy action with SARIF upload).

## Alternatives Considered

- **Snyk** — paid beyond free tier; requires external account.
- **SonarQube** — requires self-hosted server or paid cloud; CodeQL covers the same SAST
  gaps for free on GitHub.
- **TruffleHog** instead of Gitleaks — both are good; Gitleaks is already in `devbox.json`
  and runs locally too.

## Consequences

**Positive**
- Zero cost for public repos; SARIF results surface in GitHub Security tab.
- Local parity: `devbox run security` runs the same checks as CI.
- Container scan before push prevents vulnerable images reaching the registry.

**Negative / trade-offs**
- CodeQL analysis adds ≈ 3–5 min to CI on every PR.
- False positives from `security-extended` queries may require occasional suppression.

**Neutral / follow-ups**
- Add `.gitleaks.toml` if legitimate high-entropy strings (test fixtures) need allowlisting.
- Review CodeQL SARIF results after first run; tune queries if needed.
