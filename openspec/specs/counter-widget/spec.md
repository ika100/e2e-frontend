# Counter Widget Specification

## Purpose

The counter widget displays a live list of all named counters fetched from the counter
service (`GET /counters`). Users can add new counters by entering a name and incrementing
them for the first time. Each counter row has an **Increment** button (increments by 1)
and a **Reset** button (deletes the counter, removing it from the list). The list
auto-refreshes after every action.

---

## Service Contract (consumed)

- **Service:** `ika100/e2e-counter-service`
- **Endpoints:**
  - `GET /counters` → `200 { counters: [{ name, value }] }`
  - `GET /counters/:name` → `200 { name, value }` | `404 { error, name }`
  - `POST /counters/:name` → `200 { name, value }` | `400 { error }` | `429 { error }`
  - `DELETE /counters/:name` → `204` | `404 { error, name }`
- **Base URL:** configured via `VITE_COUNTER_SERVICE_URL`
- **Counter name constraint:** `[a-zA-Z0-9_-]`, 1–100 characters

---

## Requirements

### Requirement: Display a live list of all counters

The system SHALL fetch all existing counters from `GET /counters` on mount and render
them in a list, showing each counter's name and current value.

#### Scenario: Counter list loaded on mount
- **GIVEN** the counter page is loaded
- **WHEN** the widget mounts
- **THEN** `GET /counters` is called
- **AND** each counter is rendered as a row showing its name and value
- **AND** a loading indicator is shown while the request is in-flight

#### Scenario: Empty list
- **GIVEN** no counters exist in the service
- **WHEN** the widget mounts
- **THEN** an empty-state message "No counters yet. Add one below." is shown

---

### Requirement: Increment a counter from the list

The system SHALL provide an **Increment** button for each counter row. Clicking it SHALL
call `POST /counters/:name` and update the displayed value.

#### Scenario: Increment existing counter
- **GIVEN** a counter "visits" with value 3 is displayed in the list
- **WHEN** the user clicks "Increment" on the "visits" row
- **THEN** `POST /counters/visits` is called
- **AND** the row updates to show the new value returned by the service
- **AND** no full list reload is required (optimistic or targeted update)

---

### Requirement: Reset (delete) a counter from the list

The system SHALL provide a **Reset** button for each counter row. Clicking it SHALL call
`DELETE /counters/:name` and remove the counter from the displayed list.

#### Scenario: Reset removes counter from list
- **GIVEN** a counter "clicks" is displayed in the list
- **WHEN** the user clicks "Reset" on the "clicks" row
- **THEN** `DELETE /counters/clicks` is called
- **AND** the "clicks" row is removed from the list
- **AND** if the list is now empty the empty-state message is shown

---

### Requirement: Add a new counter

The system SHALL render a text input and an **Add & Increment** button below the list.
Entering a valid counter name and clicking the button SHALL call `POST /counters/:name`,
which creates the counter (starting at 1) and adds it to the list.

#### Scenario: Add new counter
- **GIVEN** the user types "pageviews" in the name input
- **WHEN** the user clicks "Add & Increment"
- **THEN** `POST /counters/pageviews` is called
- **AND** a new row for "pageviews: 1" appears in the list
- **AND** the name input is cleared

#### Scenario: Add button disabled when input is empty
- **GIVEN** the name input is empty or whitespace-only
- **WHEN** the widget renders
- **THEN** the "Add & Increment" button is disabled

#### Scenario: Counter already exists — increment only
- **GIVEN** "visits" already appears in the list
- **WHEN** the user types "visits" and clicks "Add & Increment"
- **THEN** `POST /counters/visits` is called
- **AND** the existing "visits" row updates with the incremented value

---

### Requirement: Validate counter name client-side

The system SHALL validate the counter name in the input field against
`[a-zA-Z0-9_-]` (1–100 characters) before making any HTTP request, and SHALL display
an inline validation error if invalid.

#### Scenario: Name contains disallowed characters
- **GIVEN** the user types "my counter!" in the name input
- **WHEN** the user clicks "Add & Increment"
- **THEN** no HTTP request is made
- **AND** an inline error "Counter name may only contain letters, digits, hyphens, and
  underscores." is displayed

#### Scenario: Name exceeds 100 characters
- **GIVEN** the user enters a string of 101 characters
- **WHEN** the user clicks "Add & Increment"
- **THEN** no HTTP request is made
- **AND** an inline error "Counter name must not exceed 100 characters." is displayed

---

### Requirement: Handle counter service errors

The system SHALL display user-friendly error messages for non-200 responses and network
failures without crashing the widget.

#### Scenario: Rate limit exceeded (429)
- **GIVEN** the counter-service returns `429 Too Many Requests`
- **WHEN** any request is made
- **THEN** an inline error "Too many requests. Please wait a moment and try again." is shown
- **AND** the displayed counter value is not changed

#### Scenario: Network error
- **GIVEN** the counter-service is unreachable
- **WHEN** any request is made
- **THEN** an inline error "Could not reach the counter service. Please try again." is shown

#### Scenario: Server error (5xx)
- **GIVEN** the counter-service returns a 5xx response
- **WHEN** any request is made
- **THEN** an inline error "The counter service encountered an error. Please try again later."
  is shown
