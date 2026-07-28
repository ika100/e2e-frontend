# OpenSpec — About Capability

**Capability:** About  
**Service:** frontend (`ika100/e2e-frontend`)  
**Cross-service:** greeting-service, counter-service (each adds `GET /version`)  
**Status:** Draft  
**Created:** 2026-07-28

---

## Overview

The **About** capability adds a dedicated _About_ page to the frontend, reachable via a
new navigation entry alongside the existing _Greeting_ and _Counter_ entries. The page
lists every platform service with its currently deployed version number and a link to its
GitHub repository, giving operators and developers a quick at-a-glance view of what is
running.

---

## Scope

**In scope:**
- "About" nav entry in the top navigation bar.
- `/about` route rendered by `AboutPage`.
- `AboutWidget` component that fetches and displays service info.
- `GET /version` endpoint on `greeting-service` and `counter-service`.
- Frontend's own version self-reported via Vite build-time env vars.

**Out of scope:**
- Deployment timestamps or git SHAs.
- Authentication of the `/version` endpoint.
- Historical version history or changelogs in the UI.
- Real-time refresh / polling.

---

## Stakeholders

- **End users / operators:** Need to quickly verify which versions are running.
- **Developers:** Debug version mismatches across services.

---

## Requirements

---

### Requirement: NAV-001 — About nav entry

The header navigation SHALL include an "About" link that activates the `/about` route.

#### Scenario: About link is visible alongside existing nav entries

```
Given the user loads any page of the application
When the header renders
Then the navigation SHALL contain three entries: "Greeting", "Counter", and "About"
And the "About" link SHALL be accessible via keyboard Tab navigation
```

#### Scenario: Active state on About page

```
Given the user is on the /about route
When the Header component renders
Then the "About" nav link SHALL have the `aria-current="page"` attribute
And the active link style SHALL match the existing active-link style used for Greeting and Counter
```

---

### Requirement: ABOUT-001 — About page renders a service list

The About page SHALL render a list of all platform services.

#### Scenario: Page heading

```
Given the user navigates to /about
When the AboutPage renders
Then a heading "About" SHALL be visible and labelled with an id usable as aria-labelledby
```

#### Scenario: Service list present

```
Given the user navigates to /about
When all service /version fetches succeed
Then the page SHALL display one row per service: greeting-service, counter-service, and frontend
And each row SHALL contain: the service display name, the version string, and a GitHub link
```

---

### Requirement: ABOUT-002 — Per-service version info

Each service row SHALL display the service's current deployed version number.

#### Scenario: Backend version fetched from /version endpoint

```
Given the greeting-service and counter-service are healthy
When the AboutWidget mounts
Then it SHALL call GET /version on each backend service
And display the version string returned in the response body
```

#### Scenario: Frontend version injected at build time

```
Given the frontend is built with VITE_FRONTEND_VERSION set (e.g. "0.1.3")
When the AboutWidget renders the frontend row
Then it SHALL display that version string without making an HTTP call
```

---

### Requirement: ABOUT-003 — GitHub link per service

Each service row SHALL include a clickable link to the service's GitHub repository.

#### Scenario: Link opens the correct repository

```
Given the About page is displayed
When the user clicks the GitHub link for greeting-service
Then the browser SHALL navigate to "https://github.com/ika100/e2e-greeting-service"
And the link SHALL open in a new tab (target="_blank")
And the link SHALL have rel="noopener noreferrer" for security
```

#### Scenario: Links for all three services

```
Given the About page is displayed
Then greeting-service SHALL link to https://github.com/ika100/e2e-greeting-service
And counter-service SHALL link to https://github.com/ika100/e2e-counter-service
And frontend SHALL link to https://github.com/ika100/e2e-frontend
```

---

### Requirement: ABOUT-004 — Loading state

While version data is being fetched the About page SHALL indicate loading.

#### Scenario: Loading indicator shown during fetch

```
Given the user navigates to /about
When the version fetches are in flight
Then the AboutWidget SHALL display a loading indicator (e.g. "Loading…")
And the loading state SHALL have role="status" and aria-live="polite"
```

---

### Requirement: ABOUT-005 — Per-service error handling

If a service's `/version` endpoint is unreachable or returns an error, the row SHALL
display a graceful error message without blocking other rows.

#### Scenario: One service unavailable

```
Given greeting-service is unreachable
When the AboutWidget fetches version info
Then greeting-service row SHALL show an error message (e.g. "Unavailable")
And counter-service and frontend rows SHALL still display their version info
```

#### Scenario: Timeout

```
Given a service /version call takes longer than 10 seconds
When the AboutWidget fetches version info
Then the affected row SHALL show a timeout error message
```

---

### Requirement: VER-001 — GET /version endpoint (greeting-service and counter-service)

Each backend service SHALL expose a `GET /version` endpoint.

#### Scenario: Successful response

```
Given the service is running
When a client calls GET /version
Then the response SHALL be 200 OK
And the body SHALL be:
  {
    "name": "<service-name>",
    "version": "<semver>",
    "gitUrl": "<github-url>"
  }
```

#### Scenario: Version read from package.json

```
Given the service package.json has "version": "0.0.3"
When GET /version is called
Then the response.version SHALL equal "0.0.3"
```

---

## Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|------------|
| NFR-001 | Performance | Version data SHALL load within 3 seconds under normal network conditions |
| NFR-002 | Accessibility | All rows, links, and headings SHALL meet WCAG 2.1 AA criteria |
| NFR-003 | Security | The `/version` endpoint SHALL NOT expose sensitive runtime data (env vars, file paths, secrets) |
| NFR-004 | Security | GitHub links SHALL use `rel="noopener noreferrer"` on `target="_blank"` anchors |

---

## Data / Interface Contracts

### GET /version (greeting-service and counter-service)

**URL:** `GET /version`  
**Auth:** none  
**Rate limiting:** same as other endpoints (200 req/min per IP on counter-service)

**Response 200:**
```json
{
  "name": "greeting-service",
  "version": "0.0.3",
  "gitUrl": "https://github.com/ika100/e2e-greeting-service"
}
```

**Response schema:**
```json
{
  "type": "object",
  "required": ["name", "version", "gitUrl"],
  "properties": {
    "name":    { "type": "string" },
    "version": { "type": "string" },
    "gitUrl":  { "type": "string", "format": "uri" }
  }
}
```

### Frontend version env vars

| Env var | Injected by | Example value |
|---------|-------------|---------------|
| `VITE_FRONTEND_VERSION` | CI build step (read from `package.json`) | `0.1.3` |
| `VITE_FRONTEND_GIT_URL` | CI build step or static `.env` | `https://github.com/ika100/e2e-frontend` |

### AboutWidget data model

```typescript
interface ServiceInfo {
  name: string        // Display name e.g. "greeting-service"
  version: string     // e.g. "0.0.3" or "error"
  gitUrl: string      // e.g. "https://github.com/ika100/e2e-greeting-service"
  status: 'ok' | 'error' | 'loading'
  errorMessage?: string
}
```
