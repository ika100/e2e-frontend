# ADR-0005: Devbox for Reproducible Dev Environments

- **Status:** Accepted
- **Date:** 2025-01-28
- **Deciders:** Platform Agent
- **Related:** RFC-0001

## Context

Multiple agents and developers work on this repository. Without a pinned, reproducible
toolchain, "works on my machine" failures break CI parity and slow onboarding. The
`devbox.json` for this project already exists with Node.js 22, Trivy, and Gitleaks pinned.

## Decision

We will use **Devbox** (by Jetify, backed by Nix) as the single source of truth for the
development environment. All tools — Node.js, Trivy, Gitleaks — are declared in
`devbox.json`. The `devbox.lock` file pins exact package hashes for reproducibility.

All CI jobs use `jetify-com/devbox-install-action@v0.4.0` to install the pinned
environment from `devbox.lock` before running any `devbox run <script>` commands.

Standard `devbox run` scripts:

| Script | Command | Purpose |
|--------|---------|---------|
| `test` | `npx vitest run` | Run unit + component tests |
| `lint` | `npx eslint . --max-warnings=0` | TypeScript + React lint |
| `lint-fix` | `npx eslint . --fix` | Auto-fix lint issues |
| `build` | `npm run build` | Vite production build |
| `security` | `npm audit --audit-level=high && gitleaks detect --no-git --quiet` | Dep audit + secrets scan |
| `image-build` | `docker build -t $IMAGE_NAME:local .` | Local Docker build |
| `image-scan` | `trivy image --severity CRITICAL,HIGH --exit-code 1 $IMAGE_NAME:local` | Local container scan |

## Alternatives Considered

- **`.nvmrc` + Homebrew** — no reproducibility guarantee across platforms; each tool needs
  separate installation management.
- **Docker-based dev environment** — heavier; does not integrate as seamlessly with IDE
  tooling and local `npm` scripts.
- **Mise (formerly rtx)** — good alternative but Nix-backed Devbox gives stronger
  reproducibility guarantees and the platform already uses it.

## Consequences

**Positive**
- Exact tool versions pinned in `devbox.lock`; CI and local are identical.
- One command to enter the environment: `devbox shell`.
- Nix caching in CI (`enable-cache: true`) dramatically speeds up install time.

**Negative / trade-offs**
- First `devbox install` on a new machine downloads Nix — takes 5–10 min once.
- Developers unfamiliar with Nix/Devbox have a small learning curve.

**Neutral / follow-ups**
- Keep `devbox.json` and `devbox.lock` in sync; run `devbox install` after any package
  change and commit the updated `devbox.lock`.
