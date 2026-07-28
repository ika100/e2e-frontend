# frontend

React + Vite + TypeScript SPA for the **e2e-platform** — calls `greeting-service` and
`counter-service` from the browser.

## Purpose

The `frontend` provides an interactive UI for two platform capabilities:

1. **Greeting widget** — retrieves a personalised greeting from `greeting-service`
   (`GET /greet?name=X`) and displays it.
2. **Counter widget** — reads and increments named counters via `counter-service`
   (`GET /counters/:name` / `POST /counters/:name`).

Built assets are served by an **nginx:alpine** container on port **8080**.

---

## Local Development Setup

### Prerequisites

- [Devbox](https://www.jetify.com/devbox/docs/quickstart/) (manages Node.js 22 and tools)
- Docker (for building/running the container image)

### Getting started

```bash
# Enter the Devbox shell (installs Node 22, Trivy, Gitleaks automatically)
devbox shell

# Install npm dependencies (also runs on devbox shell init)
npm install

# Start the Vite dev server
npm run dev
# → http://localhost:5173
```

### Environment variables

Copy `.env.example` to `.env` and fill in the service URLs:

```bash
cp .env.example .env
```

| Variable | Required | Default (local) | Description |
|----------|----------|-----------------|-------------|
| `VITE_GREETING_SERVICE_URL` | Yes | `http://localhost:3000` | Base URL for greeting-service (no trailing slash) |
| `VITE_COUNTER_SERVICE_URL` | Yes | `http://localhost:3001` | Base URL for counter-service (no trailing slash) |

> ⚠️ `VITE_` prefixed variables are **public** — they are embedded in the JS bundle at
> build time. Never put secrets in `VITE_*` variables.

---

## Available Scripts

```bash
devbox run build    # TypeScript compile + Vite production build → dist/
devbox run test     # Run Vitest with coverage report
devbox run lint     # ESLint (--max-warnings=0)
devbox run lint-fix # ESLint auto-fix
devbox run security # npm audit + gitleaks secret scan
devbox run image-build  # Build Docker image as ghcr.io/ika100/e2e-frontend:local
devbox run image-scan   # Trivy CRITICAL/HIGH scan of the local image
```

Or using npm directly:

```bash
npm run build
npm run test
npm run lint
```

---

## Docker Build & Run

### Build the image

```bash
devbox run image-build
# or
docker build -t ghcr.io/ika100/e2e-frontend:local .
```

### Run the container

```bash
docker run -p 8080:8080 \
  -e VITE_GREETING_SERVICE_URL=http://localhost:3000 \
  -e VITE_COUNTER_SERVICE_URL=http://localhost:3001 \
  ghcr.io/ika100/e2e-frontend:local
```

Open [http://localhost:8080](http://localhost:8080).

### Docker Compose (with backend services)

```bash
docker compose up
# → frontend at http://localhost:8080
# → greeting-service at http://localhost:3000
# → counter-service at http://localhost:3001

docker compose down
```

---

## CI/CD Pipeline

The pipeline runs on GitHub Actions on every PR and push to `main`:

| Stage | What it does | Gate |
|-------|-------------|------|
| **security** | CodeQL SAST, `npm audit`, gitleaks, Trivy fs scan | CRITICAL/HIGH → block |
| **test** | ESLint + Vitest with coverage | Any failure → block |
| **build** | Docker build + Trivy image scan + push to ghcr.io | Build failure → block |
| **release** | Tag push (`v*`) → push `{semver}` + `latest` image + GitHub Release | On `v*` tags only |
| **gitops-update** | PR to `ika100/e2e-gitops` updating `apps/frontend/values.yaml` | Requires `GITOPS_PAT` secret |

### Required GitHub Secrets

| Secret | Purpose |
|--------|---------|
| `GITHUB_TOKEN` | Auto-provided; push to ghcr.io and create releases |
| `GITOPS_PAT` | Personal Access Token with push access to `ika100/e2e-gitops` |
| `GITOPS_REPO` | `ika100/e2e-gitops` |

---

## Architecture

```
Browser
  └─ React SPA (Vite build → static HTML/JS/CSS)
       ├─ GET /greet?name=X  → greeting-service (VITE_GREETING_SERVICE_URL)
       └─ GET/POST /counters/:name → counter-service (VITE_COUNTER_SERVICE_URL)

Container
  └─ nginx:alpine (port 8080, non-root UID 1001)
       ├─ Security headers (CSP, X-Frame-Options, ...)
       ├─ gzip compression
       └─ SPA routing (try_files → index.html)
```

See [docs/architecture.md](docs/architecture.md) for full details.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for conventional commit format and PR rules.
