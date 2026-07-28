# Coding Task Plan — frontend

> Traceability: each task links to the requirement(s) and ADR(s) it implements and the
> test(s) that verify it. Tasks that can run in parallel are marked **[parallel]** — the
> build skill uses this to dispatch concurrent agents in isolated git worktrees.

## Project Type

`project-type: microservice`  
Stack: React 18 + Vite 5 + TypeScript 5, tested with Vitest + RTL, served by nginx:alpine.

## Milestones

- **M1 — Foundation:** CI pipeline, security scanning, project scaffolding, Docker image green.
- **M2 — Walking skeleton:** App shell, routing, and API client layer deployed and reachable.
- **M3 — Feature complete:** Greeting widget + counter widget both functional.
- **M4 — Release ready:** All features complete, security clean, release automation live.

---

## Foundational Tasks (serial — run in this order)

| ID | Title | Implements | Depends on | Acceptance criteria | Tests | Est | Milestone |
|----|-------|-----------|------------|---------------------|-------|-----|-----------|
| T-001 | Project scaffolding & structure | — | — | `package.json` with React/Vite/TS deps; `tsconfig.json` (strict); `vite.config.ts` with Vitest; `eslint.config.js`; `.env.example` with `VITE_GREETING_SERVICE_URL` and `VITE_COUNTER_SERVICE_URL`; `.gitignore` includes `.worktrees/`, `planning/.build/`, `node_modules/`, `dist/`; `src/main.tsx` entry point; `npm run build` exits 0 | — | S | M1 |
| T-DEVBOX-001 | Devbox environment setup | ADR-0005 | T-001 | Update `devbox.json` `scripts.test` to `npx vitest run --coverage`; `devbox install` run to update `devbox.lock`; `devbox run test` exits 0; `devbox run lint` exits 0; `devbox run build` exits 0 | — | S | M1 |
| T-CI-001 | GitHub Actions CI pipeline | ADR-0001 | T-DEVBOX-001 | `.github/workflows/ci.yml` created from template in `docs/ci-cd.md`; `security`, `test`, `build` jobs defined; uses `jetify-com/devbox-install-action@v0.4.0`; all commands via `devbox run <script>`; `release` + `gitops-update` jobs on `v*` tags; pipeline passes on a clean push to `main` | TC-CI-001 | M | M1 |
| T-SEC-001 | Security scanning integration | ADR-0003 | T-CI-001 | CodeQL (`security-extended`, `javascript`) configured in CI; `devbox run security` runs `npm audit --audit-level=high` and `gitleaks detect --no-git --quiet`; Trivy `fs` scan with SARIF upload; Trivy `image` scan in build job; all scans exit 0 on a clean codebase; SARIF results visible in GitHub Security tab | TC-SEC-001, TC-SEC-002, TC-SEC-003, TC-SEC-004 | M | M1 |
| T-REL-001 | Semver & CHANGELOG automation | ADR-0004 | T-001 | `openspec/project.md` version set to `0.1.0`; `package.json` version set to `0.1.0`; `CHANGELOG.md` stub created (Unreleased section); `CONTRIBUTING.md` documents conventional commit format; release skill can run end-to-end | — | S | M1 |
| T-DOCKER-001 | Dockerfile (multi-stage) | ADR-0007 | T-001 | Two-stage Dockerfile: stage 1 `node:22-alpine` builds `/dist`; stage 2 `nginx:alpine` serves `/dist` on port 8080; custom `nginx.conf` with SPA routing (`try_files`), gzip, security headers (CSP, X-Frame-Options, X-Content-Type-Options); runs as non-root UID 1001; `devbox run image-build` succeeds; `docker run -p 8080:8080 $IMAGE:local` serves `index.html`; Trivy image scan exits 0 | TC-SEC-004, TC-DOCKER-001 | S | M1 |
| T-DOCKER-002 | Docker Compose for local dev/test | — | T-DOCKER-001 | `docker-compose.yml` starts `frontend` (built image), `greeting-service` (mock or real), `counter-service` (mock or real) with env vars; `docker compose up` brings all services up; frontend reachable at `http://localhost:8080`; `docker compose down` cleans up | — | S | M1 |

---

## Feature Tasks

### Wave 1 **[parallel]** — Core infrastructure, no cross-widget dependencies

| ID | Title | Implements | Depends on | Acceptance criteria | Tests | Est | Milestone |
|----|-------|-----------|------------|---------------------|-------|-----|-----------|
| T-010 | App shell, routing & error boundary | ui-shell/spec.md REQ-1,2,3 | T-001 | `App.tsx` renders header with "Greeting" and "Counter" nav links; client-side routing (`react-router-dom` or `wouter`) between `/` and `/counter`; `ErrorBoundary` component catches render errors and shows recovery screen; active nav link is highlighted; `<title>` set to `e2e-platform`; unknown routes show 404 message with home link | TC-011, TC-012, TC-013 | M | M2 |
| T-011 | Shared API client (`apiClient`) | contracts/spec.md REQ-1,2 | T-001 | `src/api/apiClient.ts` exports `apiFetch(url, options)`: wraps `fetch` with 10-second `AbortController` timeout; normalises all errors to `{ type: 'network' \| 'timeout' \| 'service', message: string }`; returns parsed JSON on success; unit tests cover timeout, network error, 4xx, 5xx, and 200 paths | TC-021, TC-022, TC-023, TC-024 | M | M2 |
| T-012 | Responsive layout & accessibility baseline | ui-shell/spec.md REQ-4,5 | T-010 | Layout renders without horizontal scroll at 320px and 1440px; all interactive elements have accessible labels (confirmed by `axe-core` via `vitest-axe` or `@testing-library/jest-dom`); keyboard Tab order is logical; focus ring visible on all focusable elements | TC-014, TC-015 | M | M2 |

### Wave 2 **[parallel]** — Feature widgets (depend on T-010, T-011 being merged)

| ID | Title | Implements | Depends on | Acceptance criteria | Tests | Est | Milestone |
|----|-------|-----------|------------|---------------------|-------|-----|-----------|
| T-020 | Greeting widget | greeting-widget/spec.md REQ-1,2,3,4 | T-010, T-011 | `GreetingWidget.tsx` renders name input + "Get Greeting" button; button disabled when input empty/whitespace; calls `greetingClient.fetchGreeting(name)` using `apiFetch`; shows loading indicator during fetch; displays `response.greeting` on success; shows inline error on 400 or network failure; shows timeout message after 10 s; Enter key submits; name is URL-encoded before appending to query string | TC-031, TC-032, TC-033, TC-034, TC-035, TC-036, TC-037 | M | M3 |
| T-021 | Counter widget | counter-widget/spec.md REQ-1,2,3,4,5 | T-010, T-011 | `CounterWidget.tsx` renders counter name input + "Read" + "Increment" buttons; buttons disabled when input empty; client-side validation of `[a-zA-Z0-9_-]{1,100}` before any HTTP call; calls `counterClient.readCounter(name)` on Read; calls `counterClient.incrementCounter(name)` on Increment; shows loading indicator during fetch; displays `{ name, value }` on success; shows inline "not found" message on 404; shows inline error on 400/429/5xx/network failure | TC-041, TC-042, TC-043, TC-044, TC-045, TC-046, TC-047, TC-048 | M | M3 |

### Wave 3 **[parallel]** — Polish (depend on Wave 2 merged)

| ID | Title | Implements | Depends on | Acceptance criteria | Tests | Est | Milestone |
|----|-------|-----------|------------|---------------------|-------|-----|-----------|
| T-030 | Security hardening — CSP & nginx headers | security/spec.md REQ-2,3 | T-DOCKER-001, T-020, T-021 | `nginx.conf` sets `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`; CSP `connect-src` includes service URLs; `curl -I http://localhost:8080` shows all headers; no inline script execution allowed by CSP | TC-SEC-005, TC-SEC-006 | S | M4 |
| T-031 | README & `.env.example` documentation | contracts/spec.md REQ-env | T-020, T-021 | `README.md` documents: project purpose, local dev setup (`devbox shell` + `devbox run build`), env vars (`VITE_GREETING_SERVICE_URL`, `VITE_COUNTER_SERVICE_URL`), Docker build + run, CI/CD overview; `.env.example` has both VITE vars with placeholder values | — | S | M4 |
| T-032 | Dependency audit & remediation | security/spec.md REQ-5 | T-001 | `npm audit --audit-level=high` exits 0; all known HIGH/CRITICAL CVEs resolved or documented with justification; Trivy fs scan exits 0 | TC-SEC-002 | S | M4 |

---

## Release Tasks (serial — run after all feature waves)

| ID | Title | Implements | Depends on | Acceptance criteria | Tests | Est | Milestone |
|----|-------|-----------|------------|---------------------|-------|-----|-----------|
| T-REL-002 | First versioned release | ADR-0004 | all feature tasks | `planning/.build/release-version.txt` written with `0.1.0`; `CHANGELOG.md` updated with v0.1.0 entries; `v0.1.0` tag pushed to GitHub; GitHub Release created; Docker image `ghcr.io/ika100/e2e-frontend:0.1.0` + `:latest` pushed; GitOps PR opened in `ika100/e2e-gitops` updating `apps/frontend/values.yaml` | — | S | M4 |

---

## Sequencing

```
T-001 → T-DEVBOX-001 → T-CI-001 → T-SEC-001
T-001 → T-REL-001
T-001 → T-DOCKER-001 → T-DOCKER-002

Wave 1 (parallel, branch from main after foundational tasks):
  T-010 [App shell]
  T-011 [API client]
  T-012 [Responsive + a11y]

Wave 2 (parallel, branch from main after Wave 1 merged):
  T-020 [Greeting widget]
  T-021 [Counter widget]

Wave 3 (parallel, branch from main after Wave 2 merged):
  T-030 [Security hardening]
  T-031 [README]
  T-032 [Dependency audit]

T-REL-002 (serial, after all waves merged)
```

**Critical path:** T-001 → T-DEVBOX-001 → T-CI-001 → T-010 + T-011 → T-020 + T-021 → T-REL-002

## Git Flow (per task in parallel waves)

```
main (HEAD)
├─ .worktrees/T-010/ → branch: task/T-010-app-shell          [agent A]
├─ .worktrees/T-011/ → branch: task/T-011-api-client         [agent B]
└─ .worktrees/T-012/ → branch: task/T-012-responsive-a11y    [agent C]

After Wave 1 merged → pull main → start Wave 2:
├─ .worktrees/T-020/ → branch: task/T-020-greeting-widget    [agent A]
└─ .worktrees/T-021/ → branch: task/T-021-counter-widget     [agent B]
```

## Size Estimates

| Size | Meaning |
|------|---------|
| S | < 2 hours |
| M | 2–6 hours |
| L | 6–12 hours |

## Definition of Done (all tasks)

Code implemented · tests written and passing · acceptance criteria met ·
`devbox run lint` exits 0 · `devbox run test` exits 0 · `devbox run build` exits 0 ·
security scans pass (no CRITICAL/HIGH) · PR opened with conventional commit title ·
CI green · squash-merged to `main` · worktree cleaned up.

## Release Definition of Done

All feature tasks merged · CI green on `main` · no open security alerts ·
CHANGELOG.md updated · GitHub Release created · Docker image `0.1.0` pushed ·
GitOps PR opened.
