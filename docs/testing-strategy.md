# Testing Strategy — frontend

## Goals

- Verify every OpenSpec requirement is covered by at least one automated test.
- Provide fast feedback (unit/component tests < 30 s) during development.
- Catch regressions before merge via CI gating.
- Ensure security properties are continuously validated.

## Test Pyramid

```
         /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
        /   E2E (Playwright) \   ← few, high-value smoke tests
       /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
      /  Integration (fetch mock) \  ← component + API client integration
     /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
    /      Unit (Vitest + RTL)     \  ← most tests, fast, pure logic
   /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
  /    Non-functional (security)     \
 /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
```

## Tooling

| Level | Framework | Run command | CI step |
|-------|-----------|-------------|---------|
| Unit + Component | **Vitest** + **React Testing Library** | `devbox run test` → `npx vitest run --coverage` | `test` job |
| API client integration | Vitest + `msw` (Mock Service Worker) for fetch mocking | Same as above | `test` job |
| E2E smoke | **Playwright** | `npx playwright test` (optional, staging) | Post-deploy job (future) |
| Accessibility | `axe-core` via `@axe-core/react` or `vitest-axe` | Same as unit | `test` job |
| SAST | **CodeQL** | GH Actions only | `security` job |
| Dependency SCA | `npm audit` + **Trivy** | `devbox run security` | `security` job |
| Secrets | **Gitleaks** | `devbox run security` | `security` job |
| Container CVEs | **Trivy** image scan | `devbox run image-scan` | `build` job |

## Coverage Targets

| Scope | Target |
|-------|--------|
| `src/api/` (API clients) | ≥ 90% line coverage |
| `src/components/` (widgets) | ≥ 80% line coverage |
| `src/` overall | ≥ 80% line coverage |

Coverage enforced via `vitest --coverage` with `reporter: ['lcov', 'text']`.

## Test Environment

- **Unit/component:** JSDOM (via Vitest) — no real HTTP; `msw` intercepts fetch calls.
- **E2E:** Real browser (Chromium via Playwright) against a locally running Docker Compose
  stack (greeting-service mock + counter-service mock + frontend).
- **CI:** Ubuntu runner with devbox-installed Node.js 22; no external services required
  for unit/component tests.

## Mock Strategy

- **`msw` (Mock Service Worker)** intercepts `fetch` at the network level in JSDOM.
- Each test sets up its own MSW handlers for the specific scenarios being tested.
- MSW server is started in `vitest.setup.ts` and reset between tests.
- This approach tests the real `fetch`-based API client and React components together
  without requiring running services.

## Snapshot Policy

- **No snapshot tests** for component output — they are fragile and hard to review.
- Use **explicit assertions** (`getByRole`, `getByText`, `toBeInTheDocument`) from RTL.

## Test Data

- Greeting responses: `{ greeting: "Hello, Alice!" }`, `{ error: "name query parameter is required" }`
- Counter responses: `{ name: "visits", value: 42 }`, `{ error: "Counter not found", name: "x" }`, `{ error: "Too many requests" }`
- Invalid inputs: empty strings, whitespace-only, strings >100 chars, strings with `<script>` tags, strings with special characters

## CI Gates

| Gate | Condition | Blocks |
|------|-----------|--------|
| `devbox run lint` exits 0 | ESLint max-warnings=0 | PR merge |
| `devbox run test` exits 0 | All Vitest tests pass | PR merge |
| Coverage ≥ 80% | Vitest coverage threshold | PR merge |
| CodeQL zero CRITICAL/HIGH | SARIF uploaded | PR merge |
| `npm audit --audit-level=high` exits 0 | No HIGH/CRITICAL CVEs | PR merge |
| Gitleaks no leaks | No secrets detected | PR merge |
| Trivy fs zero CRITICAL/HIGH | SARIF uploaded | PR merge |
| Trivy image zero CRITICAL/HIGH | Container scan | Release |
