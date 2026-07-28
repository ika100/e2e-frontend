# Counter Widget Specification

## Purpose

The counter widget lets a user specify a counter name, read its current value via
`GET /counters/:name`, and increment it via `POST /counters/:name`. It covers input,
reading, incrementing, loading states, and error handling.

---

## Service Contract (consumed)

- **Service:** `ika100/e2e-counter-service`
- **Endpoints:**
  - `GET /counters/:name` → `200 { name, value }` | `404 { error, name }`
  - `POST /counters/:name` → `200 { name, value }` | `400 { error }` | `429 { error }`
- **Base URL:** configured via `VITE_COUNTER_SERVICE_URL`
- **Counter name constraint:** `[a-zA-Z0-9_-]`, 1–100 characters

---

## Requirements

### Requirement: Render counter name input and action buttons

The system SHALL render a text input for the counter name, a "Read" button to fetch the
current value, and an "Increment" button to increase the counter by one.

#### Scenario: Widget is visible
- **GIVEN** the user navigates to the Counter section
- **WHEN** the widget mounts
- **THEN** a text input with placeholder "Counter name" is visible
- **AND** a "Read" button and an "Increment" button are visible
- **AND** both buttons are disabled when the input is empty

#### Scenario: Valid input enables buttons
- **GIVEN** the user has entered "visits" in the name input
- **WHEN** the input is non-empty
- **THEN** both "Read" and "Increment" buttons are enabled

---

### Requirement: Read counter value

The system SHALL call `GET /counters/:name` and display the returned value when the user
clicks the "Read" button.

#### Scenario: Counter exists
- **GIVEN** the user has entered "visits" and the counter value is 42
- **WHEN** the user clicks "Read"
- **THEN** a loading indicator is shown during the request
- **AND** on success the value "42" is displayed alongside the counter name
- **AND** the loading indicator is hidden

#### Scenario: Counter does not exist (404)
- **GIVEN** the user has entered "unknown-counter"
- **WHEN** the user clicks "Read" and the service returns `404`
- **THEN** the message "Counter 'unknown-counter' has not been created yet." is displayed
- **AND** no previous counter value is displayed

---

### Requirement: Increment counter

The system SHALL call `POST /counters/:name` and update the displayed value when the user
clicks the "Increment" button.

#### Scenario: Successful increment
- **GIVEN** the user has entered "clicks"
- **WHEN** the user clicks "Increment"
- **THEN** a loading indicator is shown during the request
- **AND** on success the new value is displayed (e.g., "clicks: 5")
- **AND** the loading indicator is hidden

#### Scenario: Auto-create on first increment
- **GIVEN** the user enters a counter name that has never been incremented
- **WHEN** the user clicks "Increment"
- **THEN** the displayed value is "1" (counter created implicitly)

#### Scenario: Multiple increments update displayed value
- **GIVEN** the displayed value is 3
- **WHEN** the user clicks "Increment" twice more (sequentially)
- **THEN** after each click the displayed value updates immediately to the value
  returned by the service (4, then 5)

---

### Requirement: Validate counter name client-side

The system SHALL validate the counter name against `[a-zA-Z0-9_-]` (1–100 characters)
before making any HTTP request, and SHALL display an inline validation error if invalid.

#### Scenario: Name contains disallowed characters
- **GIVEN** the user types "my counter!" (contains space and exclamation mark)
- **WHEN** the user attempts to click "Read" or "Increment"
- **THEN** no HTTP request is made
- **AND** an inline error "Counter name may only contain letters, digits, hyphens, and
  underscores." is displayed

#### Scenario: Name exceeds 100 characters
- **GIVEN** the user enters a string of 101 characters
- **WHEN** the user attempts to submit
- **THEN** no HTTP request is made
- **AND** an inline error "Counter name must not exceed 100 characters." is displayed

---

### Requirement: Handle counter service errors

The system SHALL display user-friendly error messages for non-200 responses and network
failures without crashing the widget.

#### Scenario: Rate limit exceeded (429)
- **GIVEN** the counter-service returns `429 Too Many Requests`
- **WHEN** the response is received
- **THEN** the widget displays "Too many requests. Please wait a moment and try again."
- **AND** the displayed counter value is not changed

#### Scenario: Network error
- **GIVEN** the counter-service is unreachable
- **WHEN** the user submits
- **THEN** the widget displays "Could not reach the counter service. Please try again."

#### Scenario: Server error (5xx)
- **GIVEN** the counter-service returns a `5xx` response
- **WHEN** the response is received
- **THEN** the widget displays "The counter service encountered an error. Please try again later."
