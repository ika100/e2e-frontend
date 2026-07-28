# Greeting Widget Specification

## Purpose

The greeting widget allows a user to enter their name, call the `greeting-service`
(`GET /greet?name=X`), and display the personalised greeting returned. It covers the
full interaction lifecycle: input, submission, loading, success, and error states.

---

## Service Contract (consumed)

- **Service:** `ika100/e2e-greeting-service`
- **Endpoint:** `GET /greet?name=<name>`
- **Success:** `200 OK` → `{ "greeting": "<string>" }`
- **Error:** `400 Bad Request` → `{ "error": "<message>" }`
- **Base URL:** configured via `VITE_GREETING_SERVICE_URL`

---

## Requirements

### Requirement: Render name input and submit button

The system SHALL render a text input for the user's name and a button to submit the
greeting request.

#### Scenario: Widget is visible
- **GIVEN** the user navigates to the Greeting section
- **WHEN** the widget mounts
- **THEN** a text input with placeholder text "Enter your name" is visible
- **AND** a "Get Greeting" button is visible
- **AND** the button is enabled when the input is non-empty and non-whitespace-only

#### Scenario: Empty input disables button
- **GIVEN** the name input is empty (or whitespace only)
- **WHEN** the user views the widget
- **THEN** the "Get Greeting" button is disabled

---

### Requirement: Fetch and display greeting

The system SHALL call `GET /greet?name=<encodedName>` when the user submits the form and
display the returned greeting string.

#### Scenario: Successful greeting fetch
- **GIVEN** the user has entered "Alice" in the name input
- **WHEN** the user clicks "Get Greeting"
- **THEN** a loading indicator is shown while the request is in flight
- **AND** on success the greeting text (e.g., "Hello, Alice!") is displayed on screen
- **AND** the loading indicator is hidden

#### Scenario: Greeting displayed replaces previous greeting
- **GIVEN** a greeting "Hello, Alice!" is already displayed
- **WHEN** the user changes the name to "Bob" and clicks "Get Greeting"
- **THEN** the previous greeting is replaced by "Hello, Bob!"

#### Scenario: Enter key submits the form
- **GIVEN** the user has typed a name in the input
- **WHEN** the user presses the Enter key
- **THEN** the greeting request is submitted (same behaviour as clicking the button)

---

### Requirement: Handle greeting service errors

The system SHALL display a user-friendly error message when the greeting-service returns
an error or is unreachable, without crashing the widget.

#### Scenario: Service returns 400 Bad Request
- **GIVEN** the user enters a name that is too long (>100 characters)
- **WHEN** the greeting-service responds with `400 { "error": "..." }`
- **THEN** the error message from the service is displayed beneath the input
- **AND** the loading indicator is hidden
- **AND** no previously successful greeting is erased (it remains visible)

#### Scenario: Network error / service unreachable
- **GIVEN** the greeting-service is unavailable
- **WHEN** the user submits the form
- **THEN** a generic "Could not reach the greeting service. Please try again." message is
  displayed
- **AND** the loading indicator is hidden

#### Scenario: Timeout after 10 seconds
- **GIVEN** the greeting-service does not respond within 10 seconds
- **WHEN** the request times out
- **THEN** the widget shows "Request timed out. Please try again."
- **AND** the loading indicator is hidden

---

### Requirement: URL-encode the name parameter

The system SHALL percent-encode the name value when appending it to the query string so
that special characters are transmitted correctly.

#### Scenario: Name with spaces
- **GIVEN** the user enters "Jean-Luc Picard"
- **WHEN** the HTTP request is made
- **THEN** the URL is `GET /greet?name=Jean-Luc%20Picard`

#### Scenario: Name with special characters
- **GIVEN** the user enters "María"
- **WHEN** the HTTP request is made
- **THEN** the URL is `GET /greet?name=Mar%C3%ADa`
