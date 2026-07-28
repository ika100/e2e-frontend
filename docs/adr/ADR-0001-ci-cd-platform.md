# ADR-0001: GitHub Actions as CI/CD Platform

- **Status:** Accepted
- **Date:** 2025-01-28
- **Deciders:** Platform Agent
- **Related:** RFC-0001, ADR-0002, ADR-0003, ADR-0004

## Context

The `frontend` service needs a CI/CD pipeline that: lints, tests, builds the Docker image,
scans for security vulnerabilities, and triggers GitOps updates on release. The code is
hosted on GitHub (`ika100/e2e-frontend`). A platform-wide CI/CD tool must be chosen.

## Decision

We will use **GitHub Actions** as the CI/CD platform, with workflow files at
`.github/workflows/ci.yml`. All job steps invoke tooling through `devbox run <script>`,
ensuring local and CI environments are identical.

## Alternatives Considered

- **CircleCI** — requires external account, billing, and credential management. Adds
  operational overhead that is not justified for a GitHub-hosted project.
- **GitLab CI** — the project is on GitHub; GitLab CI would require mirroring.
- **Jenkins** — requires self-hosted infrastructure; overkill for this project size.

## Consequences

**Positive**
- Zero additional infrastructure; uses free tier for public repos.
- Native integration with GitHub Security tab (CodeQL SARIF upload, Dependabot).
- `GITHUB_TOKEN` auto-provisioned for package pushes to `ghcr.io`.
- Marketplace actions for Docker, Trivy, CodeQL reduce boilerplate.

**Negative / trade-offs**
- Vendor lock-in to GitHub. Migrating CI would require rewriting workflows.
- Concurrency limits on free tier may slow PRs at high throughput.

**Neutral / follow-ups**
- Configure branch protection rules to require `ci / test` and `ci / security` to pass
  before merging (see ADR-0002).
