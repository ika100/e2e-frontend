# Test Plan — frontend

> Every OpenSpec scenario maps to at least one test case. Every coding task names the
> tests that prove it. See `docs/testing-strategy.md` for tooling, coverage targets, and
> CI gates.

## Coverage Summary

| Level | Framework/Tool | Where it runs | Target |
|-------|----------------|---------------|--------|
| Unit (API client) | Vitest + MSW | local + CI | ≥ 90% `src/api/` |
| Component | Vitest + React Testing Library | local + CI | ≥ 80% `src/components/` |
| Accessibility | axe-core / vitest-axe | local + CI | Zero WCAG 2.1 AA violations |
| E2E smoke | Playwright | CI (staging, future) | Critical journeys pass |
| Non-functional (security) | CodeQL, Trivy, Gitleaks | CI | Zero CRITICAL/HIGH |

---

## Test Cases

### UI Shell

| Test ID | Level | Verifies (Spec / Scenario) | For task | Preconditions | Steps | Expected result |
|---------|-------|---------------------------|----------|---------------|-------|-----------------|
| TC-011 | component | ui-shell/spec.md / Render application shell — Initial page load | T-010 | React app mounted in JSDOM | Render `<App />` | Document title is `e2e-platform`; root element is present |
| TC-012 | component | ui-shell/spec.md / Render application shell — Unknown route | T-010 | Navigate to `/nonexistent` | Render `<App />` with route `/nonexistent` | "Not Found" text visible; link to home page visible |
| TC-013 | component | ui-shell/spec.md / Display header — Header visible on all pages | T-010 | App mounted | Render `<App />` on `/` and on `/counter` | Header is present on both routes; nav links "Greeting" and "Counter" visible |
| TC-014 | component | ui-shell/spec.md / Responsive layout — Mobile viewport | T-012 | JSDOM viewport set to 375px | Render `<App />`; check for overflow | No horizontal scroll; all interactive elements present |
| TC-015 | component | ui-shell/spec.md / Accessible markup — Keyboard navigation | T-012 | App mounted | Query all focusable elements | Focus order is logical; no element is inaccessible via keyboard |
| TC-016 | component | ui-shell/spec.md / Accessible markup — Screen reader labels | T-012 | App mounted | Run axe-core on rendered `<App />` | Zero WCAG 2.1 AA violations reported |
| TC-017 | component | ui-shell/spec.md / Handle global errors — Component throws | T-010 | Error boundary wrapping a throwing child | Render throwing child inside `ErrorBoundary` | "Something went wrong" message visible; "Reload" button present; no blank page |

### Shared API Client (`apiClient`)

| Test ID | Level | Verifies (Spec / Scenario) | For task | Preconditions | Steps | Expected result |
|---------|-------|---------------------------|----------|---------------|-------|-----------------|
| TC-021 | unit | contracts/spec.md / greeting-service success shape | T-011 | MSW handler returns `200 { greeting: "Hi!" }` | Call `apiFetch(url)` | Resolves with `{ greeting: "Hi!" }` |
| TC-022 | unit | greeting-widget/spec.md / Handle errors — Timeout | T-011 | MSW handler delays > 10 s | Call `apiFetch(url)` with 10 s timeout | Rejects with `{ type: "timeout", message: "Request timed out..." }` |
| TC-023 | unit | greeting-widget/spec.md / Handle errors — Network error | T-011 | MSW handler throws network error | Call `apiFetch(url)` | Rejects with `{ type: "network", message: "..." }` |
| TC-024 | unit | greeting-widget/spec.md / Handle errors — 4xx | T-011 | MSW handler returns `400 { error: "..." }` | Call `apiFetch(url)` | Rejects with `{ type: "service", message: error.error }` |
| TC-025 | unit | counter-widget/spec.md / Handle errors — 5xx | T-011 | MSW handler returns `500 {}` | Call `apiFetch(url)` | Rejects with `{ type: "service", message: "..." }` |

### Greeting Widget

| Test ID | Level | Verifies (Spec / Scenario) | For task | Preconditions | Steps | Expected result |
|---------|-------|---------------------------|----------|---------------|-------|-----------------|
| TC-031 | component | greeting-widget/spec.md / Render input — Widget is visible | T-020 | MSW idle | Render `<GreetingWidget />` | Input with placeholder "Enter your name" visible; "Get Greeting" button visible |
| TC-032 | component | greeting-widget/spec.md / Render input — Empty input disables button | T-020 | Input is empty | Check button disabled state | "Get Greeting" button is disabled |
| TC-033 | component | greeting-widget/spec.md / Fetch greeting — Successful fetch | T-020 | MSW returns `200 { greeting: "Hello, Alice!" }` | Type "Alice"; click "Get Greeting" | Loading indicator shown; "Hello, Alice!" displayed; loading hidden |
| TC-034 | component | greeting-widget/spec.md / Fetch greeting — Greeting replaces previous | T-020 | "Hello, Alice!" already displayed | Type "Bob"; click "Get Greeting" | "Hello, Bob!" replaces "Hello, Alice!" |
| TC-035 | component | greeting-widget/spec.md / Fetch greeting — Enter key submits | T-020 | MSW returns success | Type "Alice"; press Enter | Request fired; greeting displayed |
| TC-036 | component | greeting-widget/spec.md / Handle errors — 400 from service | T-020 | MSW returns `400 { error: "name must not exceed 100 characters" }` | Submit long name | Error message displayed; loading hidden; previous greeting not erased |
| TC-037 | component | greeting-widget/spec.md / Handle errors — Network error | T-020 | MSW throws network error | Submit any name | "Could not reach the greeting service. Please try again." displayed |
| TC-038 | component | greeting-widget/spec.md / URL-encode — Name with spaces | T-020 | MSW captures request URL | Type "Jean-Luc Picard"; submit | Request URL contains `name=Jean-Luc%20Picard` |
| TC-039 | component | greeting-widget/spec.md / URL-encode — Name with special chars | T-020 | MSW captures request URL | Type "María"; submit | Request URL contains `name=Mar%C3%ADa` |

### Counter Widget

| Test ID | Level | Verifies (Spec / Scenario) | For task | Preconditions | Steps | Expected result |
|---------|-------|---------------------------|----------|---------------|-------|-----------------|
| TC-041 | component | counter-widget/spec.md / Render — Widget is visible | T-021 | MSW idle | Render `<CounterWidget />` | Input, "Read" button, "Increment" button all visible |
| TC-042 | component | counter-widget/spec.md / Render — Empty input disables buttons | T-021 | Input is empty | Check button states | Both buttons disabled |
| TC-043 | component | counter-widget/spec.md / Read counter — Counter exists | T-021 | MSW returns `200 { name: "visits", value: 42 }` | Type "visits"; click "Read" | "visits: 42" displayed |
| TC-044 | component | counter-widget/spec.md / Read counter — 404 not found | T-021 | MSW returns `404 { error: "Counter not found", name: "x" }` | Type "x"; click "Read" | "Counter 'x' has not been created yet." displayed |
| TC-045 | component | counter-widget/spec.md / Increment — Successful increment | T-021 | MSW returns `200 { name: "clicks", value: 5 }` | Type "clicks"; click "Increment" | Loading shown; "clicks: 5" displayed; loading hidden |
| TC-046 | component | counter-widget/spec.md / Increment — Auto-create on first increment | T-021 | MSW returns `200 { name: "new", value: 1 }` | Type "new"; click "Increment" | "new: 1" displayed |
| TC-047 | component | counter-widget/spec.md / Validate — Disallowed characters | T-021 | No MSW needed | Type "my counter!"; click "Increment" | No HTTP request made; "Counter name may only contain letters, digits, hyphens, and underscores." displayed |
| TC-048 | component | counter-widget/spec.md / Validate — Name >100 chars | T-021 | No MSW needed | Type 101-char string; click "Read" | No HTTP request made; "Counter name must not exceed 100 characters." displayed |
| TC-049 | component | counter-widget/spec.md / Handle errors — 429 rate limit | T-021 | MSW returns `429 { error: "Too many requests" }` | Click "Increment" | "Too many requests. Please wait a moment and try again." displayed; value unchanged |
| TC-050 | component | counter-widget/spec.md / Handle errors — 5xx | T-021 | MSW returns `500` | Click "Read" | "The counter service encountered an error. Please try again later." displayed |

### CI / Pipeline

| Test ID | Level | Verifies | For task | Preconditions | Steps | Expected result |
|---------|-------|---------|----------|---------------|-------|-----------------|
| TC-CI-001 | non-functional | CI pipeline runs on PR | T-CI-001 | `.github/workflows/ci.yml` committed; PR opened | Push commit; open PR | `security`, `test`, `build` jobs all green; no manual steps required |

### Docker

| Test ID | Level | Verifies | For task | Preconditions | Steps | Expected result |
|---------|-------|---------|----------|---------------|-------|-----------------|
| TC-DOCKER-001 | non-functional | Image builds and serves SPA | T-DOCKER-001 | Dockerfile committed | `devbox run image-build`; `docker run -p 8080:8080 $IMAGE:local` | `curl http://localhost:8080/` returns HTML with React app; status 200 |
| TC-DOCKER-002 | non-functional | SPA routing works in nginx | T-DOCKER-001 | Container running | `curl http://localhost:8080/counter` | Returns `index.html` (status 200, not 404) — SPA `try_files` works |

### Security

| Test ID | Level | Verifies | For task | Preconditions | Steps | Expected result |
|---------|-------|---------|----------|---------------|-------|-----------------|
| TC-SEC-001 | non-functional | No CRITICAL/HIGH SAST alerts | T-SEC-001 | CodeQL in CI | Push to PR branch | Zero CRITICAL/HIGH alerts in GitHub Security → Code Scanning |
| TC-SEC-002 | non-functional | No CRITICAL/HIGH dependency CVEs | T-SEC-001, T-032 | `package-lock.json` committed | `devbox run security` | `npm audit` exits 0; Trivy fs exits 0 |
| TC-SEC-003 | non-functional | No secrets in codebase | T-SEC-001 | Codebase committed | `devbox run security` (gitleaks) | Gitleaks exits 0; no leaks reported |
| TC-SEC-004 | non-functional | Container CVE-free | T-DOCKER-001, T-SEC-001 | Docker image built | `devbox run image-scan` | Trivy image exits 0; zero CRITICAL/HIGH |
| TC-SEC-005 | non-functional | CSP header present | T-030 | nginx container running | `curl -I http://localhost:8080/` | `Content-Security-Policy` header in response |
| TC-SEC-006 | non-functional | XSS via React rendering (script tag) | T-020, T-021 | Component rendered with `<script>alert(1)</script>` as greeting | Render greeting widget with malicious response | No alert executes; script tag rendered as escaped text |

---

## Traceability Check

- [x] All ui-shell/spec.md scenarios covered (TC-011 – TC-017)
- [x] All greeting-widget/spec.md scenarios covered (TC-031 – TC-039)
- [x] All counter-widget/spec.md scenarios covered (TC-041 – TC-050)
- [x] All contracts/spec.md requirements covered (TC-021 – TC-025, TC-038, TC-039)
- [x] All security/spec.md requirements covered (TC-SEC-001 – TC-SEC-006)
- [x] Every coding task appears in the "For task" column at least once
- [x] Error and negative cases have dedicated test cases
- [x] Security test cases TC-SEC-001 through TC-SEC-004 are present (mandatory)
