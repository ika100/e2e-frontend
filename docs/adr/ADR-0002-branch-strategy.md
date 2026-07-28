# ADR-0002: Branch Strategy — Squash-Merge to Main, Task Branches, Worktrees

- **Status:** Accepted
- **Date:** 2025-01-28
- **Deciders:** Platform Agent
- **Related:** RFC-0001, ADR-0001

## Context

Parallel coding agents (build skill) work on independent tasks simultaneously using git
worktrees. A branch and merge strategy is needed that keeps `main` clean, supports
parallel feature branches, and produces a linear, readable commit history for release
automation.

## Decision

We will use the following branch strategy:

- **`main`** — single integration branch; always deployable.
- **Task branches** — `task/T-NNN-<kebab-slug>` created per task in isolated git
  worktrees under `.worktrees/`.
- **Chore branches** — `chore/setup-<timestamp>` for serial foundational work.
- **Release branches** — `release/v<semver>` managed by the release skill.
- **Hotfix branches** — `hotfix/T-NNN-<slug>` branched from release tags.
- **Merge strategy** — squash merge only; one conventional-commit message per PR on `main`.
- **Branch protection** — `main` requires: PR, CI green (`ci/test`, `ci/security`),
  branches up-to-date. No direct pushes.

## Alternatives Considered

- **GitFlow (main + develop + feature)** — additional `develop` branch adds coordination
  overhead without benefit for a single-team project with automated CI.
- **Trunk-based with feature flags** — simpler but requires feature flag infrastructure
  that is out of scope.

## Consequences

**Positive**
- Linear, readable `main` history powers conventional-commit release automation.
- Parallel worktrees enable concurrent agent coding without branch conflicts.
- Squash merge keeps `main` clean regardless of WIP commit quality in task branches.

**Negative / trade-offs**
- Squash merges lose individual commit granularity on `main` (acceptable by design).

**Neutral / follow-ups**
- Add `.worktrees/` and `planning/.build/` to `.gitignore`.
- Configure GitHub branch protection via Settings → Branches.
