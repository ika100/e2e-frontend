---
project-type: microservice
github-repo: ika100/e2e-frontend
docker-registry: ghcr.io/ika100
docker-image: ghcr.io/ika100/e2e-frontend
gitops-repo: https://github.com/ika100/e2e-gitops.git
gitops-values-path: apps/frontend/values.yaml
base-branch: main
version: 0.1.2
---

# frontend

React + Vite + TypeScript SPA — calls greeting-service and counter-service.

## Purpose

The `frontend` service is the browser-facing user interface for the `e2e-platform`. It is a
single-page application (SPA) built with React, Vite, and TypeScript that provides an
interactive UI for two platform capabilities:

1. **Greeting widget** — retrieves a personalised greeting from `greeting-service` via
   `GET /greet?name=X` and displays it to the user.
2. **Counter widget** — reads and increments named counters via `counter-service`
   (`GET /counters/:name` / `POST /counters/:name`) and shows live counts.

The SPA is compiled to static assets and served by an nginx container, making it a
deployable microservice just like its back-end peers.

## Users & Context

- **End users:** Human users accessing the platform through a web browser.
- **Environment:** Kubernetes cluster, exposed via Ingress. Managed by ArgoCD from
  `ika100/e2e-gitops`.
- **Back-end consumers:** Calls `greeting-service` and `counter-service` directly from the
  browser using environment-configured base URLs injected at build time via Vite env vars.

## Scope & Non-Goals

**In scope:**
- React + Vite + TypeScript SPA with greeting and counter widgets.
- Nginx-served Docker image (multi-stage build).
- CI/CD pipeline: lint → test → build → Docker push → GitOps update.
- Security scanning: CodeQL (JS), Trivy, Gitleaks, container scan.

**Out of scope:**
- Authentication / user accounts.
- Server-side rendering (SSR).
- Persistent storage (all state is ephemeral or delegated to back-end services).
- Mobile native apps.

## Conventions

- Language: TypeScript (strict mode)
- Framework: React 18+ with functional components and hooks
- Build tool: Vite
- Test framework: Vitest + React Testing Library
- Lint: ESLint with TypeScript and React plugins
- Style: CSS Modules or Tailwind (decided in RFC-0001)
- Container: nginx:alpine serving `/dist`
- Env vars: `VITE_GREETING_SERVICE_URL`, `VITE_COUNTER_SERVICE_URL`

## Links

- Platform: [platform.yaml](../../platform.yaml)
- GitHub: https://github.com/ika100/e2e-frontend
- Architecture: [docs/architecture.md](../docs/architecture.md)
- Tech-stack RFC: [docs/rfcs/RFC-0001-tech-stack.md](../docs/rfcs/RFC-0001-tech-stack.md)
- CI/CD: [docs/ci-cd.md](../docs/ci-cd.md)
- Task plan: [planning/task-plan.md](../planning/task-plan.md)
- Depends on:
  - `ika100/e2e-greeting-service` — `GET /greet?name=X`
  - `ika100/e2e-counter-service` — `GET /counters/:name`, `POST /counters/:name`
