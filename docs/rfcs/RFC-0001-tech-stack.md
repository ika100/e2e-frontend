# RFC-0001: Frontend Tech Stack

- **Status:** Accepted
- **Date:** 2025-01-28
- **Author:** Platform Agent
- **Related:** ADR-0001 through ADR-0007

---

## Summary

Select the technology stack for the `frontend` SPA: UI framework, build tool, language,
test framework, styling approach, and container runtime. The frontend calls two existing
Node.js back-end microservices, so the toolchain should align with the broader platform
ecosystem.

---

## Background & Constraints

1. The service is described as "React + Vite + TypeScript SPA" in the platform manifest —
   the framework choices are pre-decided; this RFC ratifies and elaborates on them.
2. The platform runs on Node.js 22 (per `devbox.json`). Using the same JS ecosystem for
   the frontend reduces tooling friction.
3. The output must be a static asset bundle served by a lightweight HTTP server in a
   Docker container.
4. CI uses devbox + GitHub Actions. All scripts must be runnable via `devbox run <script>`.
5. Security scanning is mandatory: CodeQL (JS), Trivy (fs + container), Gitleaks.

---

## Layer-by-Layer Decisions

### 1. UI Framework

| Option | Fit | Team familiarity | Ecosystem | Verdict |
|--------|-----|-----------------|-----------|---------|
| **React 18** | Excellent — component model, hooks, wide ecosystem | High | Dominant | ✅ **Selected** |
| Vue 3 | Good — simpler template syntax | Medium | Strong | ❌ Not selected |
| Svelte | Good — smaller bundle | Lower | Smaller | ❌ Not selected |

**Recommendation:** React 18 with functional components and hooks. It is explicitly named
in the platform description and has the largest ecosystem and tooling support.

### 2. Build Tool

| Option | DX | Performance | Ecosystem | Verdict |
|--------|-----|------------|-----------|---------|
| **Vite 5** | Excellent — instant HMR, fast builds | ≈10× faster than CRA | Modern, growing | ✅ **Selected** |
| Create React App | Poor — deprecated, slow | Slow webpack | Declining | ❌ Not selected |
| webpack | Full control | Slow without configuration | Large | ❌ Too much config |

**Recommendation:** Vite 5. Explicitly named in the platform manifest. Produces optimised
ES-module bundles with code splitting out of the box.

### 3. Language

**TypeScript** in strict mode. Pre-decided by the platform manifest. Enables type-safe
API response handling, reducing runtime errors when parsing back-end responses.

### 4. Test Framework

| Option | Integration with Vite | Features | Verdict |
|--------|----------------------|---------|---------|
| **Vitest** | Native Vite plugin — shares config | Jest-compatible API, fast | ✅ **Selected** |
| Jest | Requires transform setup | Mature | ❌ Extra config |
| Playwright | E2E only | Excellent for e2e | Used for e2e layer |

**Recommendation:** Vitest for unit + component tests (shares Vite config); React Testing
Library for component rendering; Playwright for e2e smoke tests.

### 5. Styling

| Option | Complexity | Performance | Verdict |
|--------|-----------|------------|---------|
| **CSS Modules** | Low — scoped by default, no runtime | Zero runtime cost | ✅ **Selected** |
| Tailwind CSS | Medium — utility-first, large class sets | No runtime, but large HTML | ❌ Adds build complexity |
| styled-components | Higher — CSS-in-JS, runtime | Runtime style injection | ❌ Runtime cost |

**Recommendation:** CSS Modules. Native Vite support, no extra dependencies, familiar
CSS syntax, zero runtime.

### 6. HTTP Client

**`fetch` (native browser API).** No additional library needed. A thin `apiClient`
wrapper handles timeout (AbortController), JSON parsing, and error normalisation.

| Option | Bundle size | Verdict |
|--------|------------|---------|
| **Native fetch** | 0 kB | ✅ **Selected** |
| axios | +13 kB | ❌ Unnecessary |
| ky | +4 kB | ❌ Unnecessary |

### 7. Container Runtime

| Option | Image size | Security | Verdict |
|--------|-----------|---------|---------|
| **nginx:alpine** | ~7 MB base | Well-hardened | ✅ **Selected** |
| node:alpine (serve) | ~50 MB base | Larger attack surface | ❌ |
| Caddy | ~20 MB | Good | ❌ Less familiar |

**Recommendation:** `nginx:alpine`. Minimal image, well-understood configuration,
built-in gzip, and CSP header support.

---

## Accepted Stack Summary

| Layer | Choice | Version |
|-------|--------|---------|
| Framework | React | 18.x |
| Build tool | Vite | 5.x |
| Language | TypeScript | 5.x (strict) |
| Unit/component tests | Vitest + React Testing Library | latest |
| E2E tests | Playwright | latest |
| Styling | CSS Modules | n/a |
| HTTP client | Fetch (native) | browser API |
| Linter | ESLint + typescript-eslint + eslint-plugin-react | latest |
| Container | nginx:alpine | latest stable |
| Node.js (build) | 22.x | via devbox |

---

## Resulting ADRs

- ADR-0001: GitHub Actions as CI/CD platform
- ADR-0002: Branch strategy (squash-merge to main, task branches, worktrees)
- ADR-0003: Security scanning (CodeQL + Trivy + Gitleaks)
- ADR-0004: Release strategy (semver + conventional commits)
- ADR-0005: Devbox for reproducible dev environments
- ADR-0006: React + Vite + TypeScript as frontend framework
- ADR-0007: Multi-stage Docker image with nginx:alpine
