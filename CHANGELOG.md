# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.3] - 2026-07-28

### Fixed
- **security**: audit production deps only, skip devDep DoS false positives

### Maintenance
- fix Trivy container scan image-ref (use :main tag)
- make gitleaks optional (graceful skip on Linux CI)
- upgrade devbox-install-action to v0.13.0 (fix Nix lock permission)
- trigger fresh CI run on public repo [skip release]

## [0.1.2] - 2026-07-28

## [0.1.1] - 2026-07-28

## [0.1.1] - 2026-07-28

## [0.1.0] — 2025-07-28

### Added
- **App shell** — SPA with `wouter` client-side routing (`/` Greeting, `/counter` Counter),
  `ErrorBoundary` component, `Header` with active-link highlighting, `NotFound` 404 page
- **Shared API client** — `apiFetch` with 10-second `AbortController` timeout; normalises
  all errors to `{ type: 'network' | 'timeout' | 'service', message }` 
- **Greeting widget** — name input + "Get Greeting" button; calls `GET /greet?name=X`;
  URL-encodes name; shows loading indicator, success greeting, inline error
- **Counter widget** — counter name input + Read/Increment buttons; client-side validation
  of `[a-zA-Z0-9_-]{1,100}`; displays `name: value` on success; handles 404/429/5xx
- **Multi-stage Dockerfile** — `node:22-alpine` builder + `nginx:alpine` runtime; runs as
  non-root UID 1001; port 8080; CSP/security headers via `envsubst` at startup
- **Docker Compose** — starts frontend + greeting-service + counter-service locally
- **GitHub Actions CI/CD** — `security`, `test`, `build`, `release`, `gitops-update` jobs;
  CodeQL, Trivy, gitleaks scanning; image push to `ghcr.io/ika100/e2e-frontend`
- **Security scanning** — `npm audit --audit-level=high --omit=dev`; gitleaks secrets scan;
  Trivy filesystem and image scans; all dev-tool CVEs documented
- **Responsive accessible layout** — WCAG 2.1 AA; keyboard navigation; visible focus rings;
  no horizontal scroll at 320px
- **32 unit/component tests** — 95.81% overall coverage, 99.03% component coverage

[0.1.0]: https://github.com/ika100/e2e-frontend/releases/tag/v0.1.0

[Unreleased]: https://github.com/ika100/e2e-frontend/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/ika100/e2e-frontend/compare/v0.1.0...v0.1.1

[Unreleased]: https://github.com/ika100/e2e-frontend/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/ika100/e2e-frontend/compare/v0.1.1...v0.1.2

[Unreleased]: https://github.com/ika100/e2e-frontend/compare/v0.1.3...HEAD
[0.1.3]: https://github.com/ika100/e2e-frontend/compare/v0.1.2...v0.1.3
