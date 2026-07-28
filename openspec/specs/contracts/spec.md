# Cross-Service Contracts Specification

## Purpose

Documents the interface contracts that the `frontend` service depends upon from its
upstream services. This spec is the canonical reference for all cross-service integration
assumptions held by the frontend. Each contract section corresponds to one upstream service.

---

## Contract 1 — greeting-service (`ika100/e2e-greeting-service`)

### Base URL

Configured via environment variable `VITE_GREETING_SERVICE_URL` at Vite build time.

| Environment | Example value |
|-------------|---------------|
| Local dev | `http://localhost:3000` |
| Kubernetes | `http://greeting-service:3000` |

### Endpoint consumed: `GET /greet`

| Field | Value |
|-------|-------|
| Method | `GET` |
| Path | `/greet` |
| Query param | `name` (string, required, 1–100 chars, URL-encoded) |

**Expected success response:**
```json
{ "greeting": "Hello, Alice!" }
```
- Status: `200 OK`
- `Content-Type: application/json`

**Expected error response:**
```json
{ "error": "<human-readable message>" }
```
- Status: `400 Bad Request`

### Requirements

#### Requirement: greeting-service success shape is stable

The frontend SHALL assume the success body contains a `greeting` string field. Any change
to this shape in `ika100/e2e-greeting-service` is a breaking change requiring a major
version bump in that service.

##### Scenario: Frontend parses greeting field
- **GIVEN** greeting-service returns `200 { "greeting": "Hello, Alice!" }`
- **WHEN** the frontend receives the response
- **THEN** it renders the value of `response.greeting` as the displayed greeting
- **AND** does not crash if additional unknown fields are present (forward-compatible)

#### Requirement: greeting-service error shape is stable

The frontend SHALL assume error responses contain an `error` string field and display it
to the user.

##### Scenario: Frontend displays error field
- **GIVEN** greeting-service returns `400 { "error": "name query parameter is required" }`
- **WHEN** the frontend receives the response
- **THEN** the value of `response.error` is shown as an inline error message

---

## Contract 2 — counter-service (`ika100/e2e-counter-service`)

### Base URL

Configured via environment variable `VITE_COUNTER_SERVICE_URL` at Vite build time.

| Environment | Example value |
|-------------|---------------|
| Local dev | `http://localhost:3001` |
| Kubernetes | `http://counter-service:3001` |

### Endpoints consumed

#### `POST /counters/:name`

Increments a named counter by 1 (auto-creates at 1 if not found).

**Expected success response:**
```json
{ "name": "visits", "value": 43 }
```
- Status: `200 OK`

**Expected error responses:**

| Status | Body | Meaning |
|--------|------|---------|
| `400` | `{ "error": "Invalid counter name" }` | Name violates `[a-zA-Z0-9_-]` |
| `429` | `{ "error": "Too many requests" }` | Rate limit exceeded |

#### `GET /counters/:name`

Reads the current value without modification.

**Expected success response:**
```json
{ "name": "visits", "value": 42 }
```
- Status: `200 OK`

**Expected not-found response:**
```json
{ "error": "Counter not found", "name": "visits" }
```
- Status: `404 Not Found`

### Requirements

#### Requirement: counter-service success shape is stable

The frontend SHALL assume the success body for both `GET` and `POST /counters/:name`
contains `name` (string) and `value` (integer ≥ 0).

##### Scenario: Frontend reads value field
- **GIVEN** counter-service returns `200 { "name": "visits", "value": 42 }`
- **WHEN** the frontend receives the response
- **THEN** it renders `42` as the counter display value
- **AND** does not crash if additional unknown fields are present

#### Requirement: counter-service 404 is handled gracefully

The frontend SHALL treat a `404` from `GET /counters/:name` as "counter not yet created"
rather than as an application error.

##### Scenario: Frontend shows not-found message
- **GIVEN** counter-service returns `404 { "error": "Counter not found", "name": "x" }`
- **WHEN** the frontend receives the response
- **THEN** it displays a message indicating the counter has not been created yet
- **AND** does not display an error modal or application error boundary

---

## Contract 3 — Environment Variable Injection

The frontend depends on two Vite build-time environment variables. If these are absent or
empty at build time, the SPA SHALL start but API calls will fail, and the widgets SHALL
display service-unreachable error messages.

| Variable | Purpose | Required |
|----------|---------|----------|
| `VITE_GREETING_SERVICE_URL` | Base URL for greeting-service (no trailing slash) | Yes |
| `VITE_COUNTER_SERVICE_URL` | Base URL for counter-service (no trailing slash) | Yes |

### Requirement: Environment variables documented in README

The system SHALL document required environment variables in `README.md` and in
`.env.example` so that operators can configure them correctly.

#### Scenario: Missing env var at runtime
- **GIVEN** `VITE_GREETING_SERVICE_URL` is not set at build time
- **WHEN** the greeting widget makes an API call
- **THEN** the request fails with a network error
- **AND** the widget displays the standard network-error message ("Could not reach the
  greeting service...")
- **AND** the rest of the SPA remains functional
