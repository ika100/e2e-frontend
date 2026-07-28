# ADR-0004: Release Strategy — Semver + Conventional Commits + Automated CHANGELOG

- **Status:** Accepted
- **Date:** 2025-01-28
- **Deciders:** Platform Agent
- **Related:** RFC-0001, ADR-0001

## Context

The `frontend` service ships as a Docker image pushed to `ghcr.io/ika100/e2e-frontend`.
After a successful build the release skill tags a semver version, pushes the image, creates
a GitHub Release, and opens a PR against the GitOps repo (`ika100/e2e-gitops`) to update
`apps/frontend/values.yaml` with the new image tag.

A consistent versioning and changelog strategy is needed to automate this lifecycle.

## Decision

We will use **Semantic Versioning 2.0.0** with **Conventional Commits** to drive automated
version bumps and CHANGELOG generation:

- Commit types determine version bumps:
  - `feat:` → minor; `fix: / perf: / security:` → patch; `BREAKING CHANGE` footer → major.
  - `chore: / ci: / docs: / refactor: / test:` → no bump (listed in changelog under Maintenance).
- `CHANGELOG.md` follows **Keep a Changelog** format.
- Release tags: `v{MAJOR}.{MINOR}.{PATCH}` on `main`.
- First release: `v0.1.0` (initial development).
- GitHub Release created with AI-generated release notes (release skill).
- Docker image tagged: `{semver}` + `latest` on stable releases.
- GitOps update: `apps/frontend/values.yaml` `.image.tag` set to the new semver.

## Alternatives Considered

- **CalVer** — date-based versioning provides no semantic meaning about compatibility.
- **Manual versioning** — error-prone and not automation-friendly.
- **semantic-release npm package** — powerful but adds a large dependency and config file;
  the release skill covers this use case without it.

## Consequences

**Positive**
- Release automation is fully deterministic from commit history.
- GitOps consumers always know exactly which version is deployed.
- CHANGELOG is auto-maintained; no manual editing required.

**Negative / trade-offs**
- Developers must follow conventional commit format. Linting enforced via PR title check
  in CI (future: add `commitlint` if the team grows).

**Neutral / follow-ups**
- Document commit format in `CONTRIBUTING.md`.
- Configure `GITOPS_PAT` and `GITOPS_REPO` secrets in GitHub repo settings to enable the
  GitOps update step in the CI pipeline.
