# Security Specification

## Purpose

Define security requirements for the `frontend` SPA: input handling, dependency hygiene,
content security policy, HTTPS transport, and container hardening. Security is a first-class
requirement, not an afterthought.

---

## Requirements

### Requirement: Sanitize and validate all user inputs before use

The system SHALL treat all user-supplied text (name fields, counter names) as untrusted
and SHALL rely on React's built-in JSX escaping for rendering, never injecting raw HTML
from API responses or user input.

#### Scenario: XSS via greeting response
- **GIVEN** the greeting-service returns `{ "greeting": "<script>alert(1)</script>" }`
- **WHEN** the frontend renders the greeting
- **THEN** the string is rendered as escaped text, not executed as HTML
- **AND** no alert dialog appears

#### Scenario: XSS via user input display
- **GIVEN** the user enters `<img src=x onerror=alert(1)>` in the name field
- **WHEN** the value is displayed on screen
- **THEN** it is shown as literal text, not interpreted as HTML

---

### Requirement: Content Security Policy header

The nginx server SHALL set a `Content-Security-Policy` response header that restricts
script sources to `'self'` and disallows inline scripts, `eval`, and external resources
not explicitly listed.

#### Scenario: CSP header present
- **GIVEN** a browser requests the SPA root URL
- **WHEN** the response is received
- **THEN** the `Content-Security-Policy` header is present
- **AND** it includes at minimum `default-src 'self'; script-src 'self'; object-src 'none'`

#### Scenario: Inline script blocked by CSP
- **GIVEN** a hypothetical injected inline `<script>` tag
- **WHEN** the browser processes it
- **THEN** the CSP directive blocks execution and logs a violation

---

### Requirement: HTTPS-only in production

All communication between the browser and the SPA, and between the SPA and back-end
services, SHALL be over HTTPS in production. The nginx container SHALL NOT serve HTTP
(HTTP → HTTPS redirect is handled at the Ingress/load-balancer layer).

#### Scenario: API calls use HTTPS base URLs
- **GIVEN** `VITE_GREETING_SERVICE_URL` and `VITE_COUNTER_SERVICE_URL` are set to
  `https://` URLs in production
- **WHEN** any API call is made
- **THEN** the request is sent over TLS

---

### Requirement: No secrets in the browser bundle

The system SHALL NOT embed secrets (API keys, tokens, passwords) in the Vite build output.
Vite env vars prefixed `VITE_` are public by design; only non-sensitive configuration
(service base URLs) SHALL use this mechanism.

#### Scenario: Secret accidentally added to .env
- **GIVEN** a developer adds `VITE_SECRET_KEY=abc123` to `.env`
- **WHEN** the bundle is built
- **THEN** the secret is visible in the built JS bundle (this is expected Vite behaviour)
- **AND** gitleaks / CI secrets scan MUST block this from reaching `main`

#### Scenario: Gitleaks detects secret
- **GIVEN** a `.env` file containing a high-entropy string is committed
- **WHEN** gitleaks runs in CI
- **THEN** the pipeline fails and the PR is blocked

---

### Requirement: No CRITICAL/HIGH CVEs in dependencies

The system SHALL keep all npm dependencies free of known CRITICAL or HIGH severity CVEs.
`npm audit --audit-level=high` SHALL exit 0 in CI.

#### Scenario: Dependency CVE introduced
- **GIVEN** a PR adds or updates an npm package that has a known HIGH CVE
- **WHEN** the CI security job runs `npm audit --audit-level=high`
- **THEN** the job exits non-zero and the PR is blocked from merging

---

### Requirement: Container runs as non-root

The Docker image SHALL configure nginx (or the static file server) to run as a non-root
user. The container SHALL not require `privileged: true` or any Linux capabilities beyond
`NET_BIND_SERVICE` (if binding to port 80) or none (if binding to 8080+).

#### Scenario: Container user is non-root
- **GIVEN** the production Docker image is built
- **WHEN** `docker run --user` is inspected or the Dockerfile is reviewed
- **THEN** the entrypoint process runs as a user with UID ≥ 1000
- **AND** Trivy image scan reports zero CRITICAL/HIGH OS-level CVEs

---

### Requirement: No CRITICAL/HIGH SAST alerts

The system SHALL have no CRITICAL or HIGH severity findings from CodeQL static analysis
on any PR targeting `main`.

#### Scenario: CodeQL scan on PR
- **GIVEN** a developer opens a PR
- **WHEN** the GitHub Actions security job runs CodeQL with `security-extended` queries
- **THEN** zero CRITICAL/HIGH alerts are reported to the GitHub Security tab
- **AND** if any alerts are found, the PR is blocked from merging

---

### Requirement: Subresource Integrity (SRI) for external assets (SHOULD)

If any external CDN assets are referenced (fonts, icons), the system SHOULD include
`integrity` attributes with hash values to protect against CDN compromise.

#### Scenario: External font with SRI
- **GIVEN** a `<link>` to an external font stylesheet is in `index.html`
- **WHEN** the browser loads the page
- **THEN** the `<link>` tag includes an `integrity` attribute with a SHA-384 or SHA-512 hash
- **AND** a `crossorigin="anonymous"` attribute is present
