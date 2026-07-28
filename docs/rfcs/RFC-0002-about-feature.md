# RFC-0002 — About Feature Architecture

**Status:** Accepted  
**Date:** 2026-07-28  
**Feature:** About page with per-service version info

---

## Problem

Operators and developers have no quick in-browser way to verify which version of each
platform service is currently deployed. Debugging version mismatches requires checking the
GitOps repo or the container registry manually.

---

## Decision

Add an **About page** to the frontend that lists every platform service with its deployed
version and a GitHub link.

---

## Alternatives Considered

### Option A — Build-time env var injection for all services (rejected)
Bake all service versions into the frontend as Vite env vars at build time. Simple, but
stale: the frontend would show versions as of _its own_ build, not the currently running
backend. If greeting-service is independently updated, the frontend still shows the old
version.

### Option B — `GET /version` on each backend + build-time for frontend (chosen)
Each backend service exposes `GET /version` returning `{ name, version, gitUrl }` read
directly from its own `package.json` at startup. The frontend fetches live version data
from each service. The frontend's own version is injected at Vite build time via
`VITE_FRONTEND_VERSION` (no HTTP call needed for self-reporting).

**Rationale:** Each service is the single source of truth for its own version. Live
fetching catches independent rollouts. The endpoint is trivial to implement and adds no
external dependencies.

### Option C — Centralised metadata API (rejected)
A new microservice or API gateway endpoint aggregates version info from all services.
Over-engineered for a three-service platform; adds infra complexity and a new failure mode.

---

## Architecture

```
Browser (React)
│
│  /about route
│
▼
AboutPage ─── AboutWidget
                  │
                  ├── versionClient.fetchVersion(VITE_GREETING_SERVICE_URL)
                  │        └── GET /version → { name, version, gitUrl }
                  │
                  ├── versionClient.fetchVersion(VITE_COUNTER_SERVICE_URL)
                  │        └── GET /version → { name, version, gitUrl }
                  │
                  └── Frontend row (no HTTP call)
                           └── import.meta.env.VITE_FRONTEND_VERSION
                               import.meta.env.VITE_FRONTEND_GIT_URL
```

Each fetch is **independent** — a failure in one row does not block the others.
All fetches run in parallel via `Promise.allSettled`.

---

## Implementation Summary

### greeting-service
- Add `src/routes/version.js` → `GET /version` returns `{ name, version, gitUrl }`
- `version` read from `package.json` imported at module load (Node.js ESM `import … assert { type: 'json' }` or `fs.readFileSync`)
- `gitUrl` hardcoded as `https://github.com/ika100/e2e-greeting-service`

### counter-service
- Same pattern, `gitUrl = https://github.com/ika100/e2e-counter-service`
- Exclude `/version` from rate limiting (same as `/health`)

### frontend
- `src/api/versionClient.ts` — calls `apiFetch<VersionResponse>(url + '/version')`
- `src/components/AboutWidget.tsx` — fetches on mount, renders rows
- `src/components/AboutPage` function in `App.tsx` — wraps `AboutWidget`
- Header: add "About" `<Link href="/about">` nav entry
- App.tsx: add `<Route path="/about" component={AboutPage} />`
- `.env.example`: add `VITE_FRONTEND_VERSION` and `VITE_FRONTEND_GIT_URL`

---

## ADRs

No new ADRs required — this feature follows existing ADRs for API design, security, and
testing. Noted as an amendment to the existing architecture.
