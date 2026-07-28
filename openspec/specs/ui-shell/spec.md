# UI Shell Specification

## Purpose

Define the overall structure and behaviour of the SPA shell — the host page, routing,
layout, loading states, and global error handling — that wraps all feature widgets.

---

## Requirements

### Requirement: Render application shell

The system SHALL render a single-page application that loads in a web browser without
requiring a full page reload when navigating between widgets.

#### Scenario: Initial page load
- **GIVEN** a user navigates to the root URL of the frontend
- **WHEN** the browser loads the page
- **THEN** the HTML document is returned with status `200 OK`
- **AND** the React application mounts and renders within 3 seconds on a standard connection
- **AND** the page title is set to `e2e-platform`

#### Scenario: Unknown route
- **GIVEN** a user navigates to a URL path that does not match any route
- **WHEN** the page renders
- **THEN** a "Not Found" message is displayed
- **AND** a link back to the home page is visible

---

### Requirement: Display header and navigation

The system SHALL render a persistent header containing the platform name and navigation
links to each widget section.

#### Scenario: Header visible on all pages
- **GIVEN** the application has mounted
- **WHEN** any route is active
- **THEN** the header is visible at the top of the viewport
- **AND** navigation links for "Greeting" and "Counter" are present
- **AND** the currently active link is visually distinguished

---

### Requirement: Handle global JavaScript errors

The system SHALL catch unhandled React render errors and display a user-friendly error
boundary screen instead of a blank page.

#### Scenario: Component throws during render
- **GIVEN** a child component throws an unhandled error
- **WHEN** React propagates the error to the nearest error boundary
- **THEN** an error message is displayed explaining something went wrong
- **AND** a "Reload" button is presented to the user
- **AND** the error is logged to the browser console with a stack trace

---

### Requirement: Responsive layout

The system SHALL render usably on viewport widths from 320px (mobile) to 1440px+ (desktop).

#### Scenario: Mobile viewport
- **GIVEN** a viewport width of 375px
- **WHEN** the page renders
- **THEN** no horizontal scroll bar appears
- **AND** all interactive elements are reachable by touch

#### Scenario: Desktop viewport
- **GIVEN** a viewport width of 1280px
- **WHEN** the page renders
- **THEN** the layout uses the wider space effectively (centred content, no overflow)

---

### Requirement: Accessible markup

The system SHALL produce markup that meets WCAG 2.1 Level AA for core interactive elements.

#### Scenario: Keyboard navigation
- **GIVEN** a user operates the page using only a keyboard
- **WHEN** they press Tab sequentially
- **THEN** focus moves through all interactive elements in a logical order
- **AND** focus is always visually indicated

#### Scenario: Screen reader labels
- **GIVEN** a screen reader is active
- **WHEN** the page loads
- **THEN** all buttons and form inputs have accessible labels (aria-label or associated `<label>`)
