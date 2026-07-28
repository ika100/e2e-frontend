# ADR-0007: Multi-Stage Docker Image with nginx:alpine

- **Status:** Accepted
- **Date:** 2025-01-28
- **Deciders:** Platform Agent
- **Related:** RFC-0001, ADR-0003

## Context

The `frontend` SPA must be packaged as a Docker image and pushed to
`ghcr.io/ika100/e2e-frontend`. The image must be small, secure (no CRITICAL/HIGH CVEs),
and serve static files efficiently. The container is deployed on Kubernetes via ArgoCD.

## Decision

We will use a **two-stage Dockerfile**:

1. **Builder stage** — `node:22-alpine`: installs dependencies, runs `npm run build`,
   outputs `/app/dist`.
2. **Runtime stage** — `nginx:alpine`: copies `/app/dist` to `/usr/share/nginx/html`,
   uses a custom `nginx.conf` that:
   - Serves static files with gzip.
   - Sets security headers (CSP, X-Frame-Options, X-Content-Type-Options).
   - Returns `index.html` for all non-asset paths (SPA routing).
   - Listens on port `8080` (non-privileged).
   - Runs nginx as a non-root user (UID 1001).

The builder stage is discarded in the final image, keeping it minimal (~20–30 MB).

## Alternatives Considered

- **Single-stage `node:alpine` with `serve` package** — produces a larger image (~80 MB),
  larger attack surface, and `serve` is not production-grade.
- **Caddy** — good alternative; rejected because nginx is more widely understood and has
  better platform precedent.
- **Distroless** — ideal for security; nginx:alpine is simpler to configure for SPA routing
  and is already minimal.

## Consequences

**Positive**
- Final image is ~20–30 MB; no Node.js runtime in production.
- `nginx:alpine` is well-hardened and receives regular CVE patches.
- Running on port 8080 as non-root eliminates the need for `CAP_NET_BIND_SERVICE`.
- Trivy image scan runs in CI before push, blocking any OS-level CVEs.

**Negative / trade-offs**
- Custom `nginx.conf` must be maintained; SPA routing `try_files` must be set correctly.
- CSP headers need to list allowed API origins; these are baked into the nginx config at
  image build time (or templated via `envsubst` at container start).

**Neutral / follow-ups**
- Use `envsubst` in the nginx entrypoint to inject `VITE_GREETING_SERVICE_URL` and
  `VITE_COUNTER_SERVICE_URL` into the CSP `connect-src` directive at container startup,
  so the same image can be used across environments.
- Publish image to `ghcr.io/ika100/e2e-frontend` using `GITHUB_TOKEN` in CI.
