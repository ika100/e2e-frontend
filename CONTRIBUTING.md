# Contributing

## Conventional Commits

This project uses [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).
All commits to `main` (via PR squash-merge) **must** follow this format:

```
<type>(<scope>): <short summary>

[optional body]

[optional footer(s)]
```

### Types

| Type | When to use |
|------|------------|
| `feat` | New feature — triggers a **minor** version bump |
| `fix` | Bug fix — triggers a **patch** version bump |
| `chore` | Maintenance (deps, CI, tooling) — no version bump |
| `docs` | Documentation changes — no version bump |
| `test` | Adding or updating tests — no version bump |
| `refactor` | Code refactoring — no version bump |
| `perf` | Performance improvements — triggers a patch bump |
| `ci` | CI/CD changes — no version bump |
| `build` | Build system changes — no version bump |

### Breaking Changes

A breaking change triggers a **major** version bump. Mark with:
- `!` after the type: `feat!: remove deprecated endpoint`
- Or add a footer: `BREAKING CHANGE: <description>`

### Examples

```
feat(greeting-widget): add keyboard shortcut for submit
fix(api-client): handle AbortError correctly on Firefox
chore(deps): bump vite to 6.1.0
docs(readme): update env var documentation
```

## Branch Strategy

- `main` — integration branch; all merges must pass CI
- `task/T-NNN-<slug>` — task branches (created by build agent or manually)
- `hotfix/T-NNN-<slug>` — emergency fixes

## Pull Request Rules

1. Branch must be up-to-date with `main`
2. All CI jobs must be green (`security`, `test`, `build`)
3. PR title must follow conventional commits format
4. Squash-merge only — one commit per PR on `main`

## Release Process

See `docs/adr/ADR-0004-release-strategy.md`. Run `/skill:release` to cut a release.
