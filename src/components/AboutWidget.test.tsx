import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { Router } from 'wouter'
import { memoryLocation } from 'wouter/memory-location'
import AboutWidget from './AboutWidget'
import App from '../App'
import * as versionClient from '../api/versionClient'
import type { ApiError } from '../api/apiClient'

expect.extend(toHaveNoViolations)

// Stub env vars before the module-scope code runs (component reads them inside fn)
vi.stubEnv('VITE_GREETING_SERVICE_URL', 'http://localhost:3000')
vi.stubEnv('VITE_COUNTER_SERVICE_URL', 'http://localhost:3001')
vi.stubEnv('VITE_FRONTEND_VERSION', '0.1.3')
vi.stubEnv('VITE_FRONTEND_GIT_URL', 'https://github.com/ika100/e2e-frontend')

// Mock the versionClient module so we avoid real HTTP calls (and AbortSignal
// compatibility issues between jsdom and MSW's interceptors). This follows
// the same pattern as GreetingWidget.test.tsx. The HTTP-level contract is
// independently tested in versionClient.test.ts using MSW in a Node env.
vi.mock('../api/versionClient', () => ({
  fetchVersion: vi.fn(),
}))

const mockFetchVersion = vi.mocked(versionClient.fetchVersion)

const greetingVersionResponse = {
  name: 'greeting-service',
  version: '0.0.3',
  gitUrl: 'https://github.com/ika100/e2e-greeting-service',
}

const counterVersionResponse = {
  name: 'counter-service',
  version: '0.0.2',
  gitUrl: 'https://github.com/ika100/e2e-counter-service',
}

function renderAt(path: string) {
  const { hook } = memoryLocation({ path, static: true })
  return render(
    <Router hook={hook}>
      <App />
    </Router>,
  )
}

describe('About page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: both services respond successfully
    mockFetchVersion.mockImplementation((baseUrl: string) => {
      // AboutWidget calls fetchVersion(VITE_GREETING_SERVICE_URL + '/greet')
      // and fetchVersion(VITE_COUNTER_SERVICE_URL + '/counters').
      // In tests VITE_GREETING_SERVICE_URL='http://localhost:3000', so:
      //   greeting call  → 'http://localhost:3000/greet'
      //   counter call   → 'http://localhost:3001/counters'
      if (baseUrl === 'http://localhost:3000/greet') {
        return Promise.resolve(greetingVersionResponse)
      }
      return Promise.resolve(counterVersionResponse)
    })
  })

  // TC-ABOUT-001: nav link is visible in header
  it('TC-ABOUT-001: About nav link is visible in header', () => {
    renderAt('/')
    expect(screen.getByRole('link', { name: /^about$/i })).toBeInTheDocument()
  })

  // TC-ABOUT-002: About link has active state on /about route
  it('TC-ABOUT-002: About nav link has aria-current=page on /about route', async () => {
    renderAt('/about')
    const aboutLink = screen.getByRole('link', { name: /^about$/i })
    expect(aboutLink).toHaveAttribute('aria-current', 'page')
    // Wait for async updates to settle
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })
  })

  // TC-ABOUT-003: page heading is present on /about
  it('TC-ABOUT-003: /about renders h2 heading with id about-heading', async () => {
    renderAt('/about')
    const heading = screen.getByRole('heading', { level: 2, name: /^about$/i })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveAttribute('id', 'about-heading')
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })
  })

  // TC-ABOUT-004: loading state is shown while fetching
  it('TC-ABOUT-004: shows loading indicator while fetching version info', () => {
    // Make the promise never resolve so we stay in loading state
    mockFetchVersion.mockReturnValue(new Promise(() => undefined))

    render(<AboutWidget />)
    const loadingEl = screen.getByRole('status')
    expect(loadingEl).toBeInTheDocument()
    expect(loadingEl).toHaveTextContent(/loading/i)
    expect(loadingEl).toHaveAttribute('aria-live', 'polite')
  })

  // TC-ABOUT-005: all three service rows displayed on success
  it('TC-ABOUT-005: shows three service rows on successful fetches', async () => {
    render(<AboutWidget />)

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    expect(screen.getByText('greeting-service')).toBeInTheDocument()
    expect(screen.getByText('0.0.3')).toBeInTheDocument()

    expect(screen.getByText('counter-service')).toBeInTheDocument()
    expect(screen.getByText('0.0.2')).toBeInTheDocument()

    expect(screen.getByText('frontend')).toBeInTheDocument()
    expect(screen.getByText('0.1.3')).toBeInTheDocument()
  })

  // TC-ABOUT-006: GitHub links have correct attributes
  it('TC-ABOUT-006: GitHub links have target=_blank and rel=noopener noreferrer', async () => {
    render(<AboutWidget />)

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    const links = screen.getAllByRole('link', { name: /github/i })
    expect(links.length).toBeGreaterThanOrEqual(3)

    for (const link of links) {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }

    const greetingLink = screen.getByRole('link', {
      name: /github repository for greeting-service/i,
    })
    expect(greetingLink).toHaveAttribute(
      'href',
      'https://github.com/ika100/e2e-greeting-service',
    )

    const counterLink = screen.getByRole('link', {
      name: /github repository for counter-service/i,
    })
    expect(counterLink).toHaveAttribute(
      'href',
      'https://github.com/ika100/e2e-counter-service',
    )

    const frontendLink = screen.getByRole('link', {
      name: /github repository for frontend/i,
    })
    expect(frontendLink).toHaveAttribute('href', 'https://github.com/ika100/e2e-frontend')
  })

  // TC-ABOUT-007: frontend version comes from env var
  it('TC-ABOUT-007: displays frontend version from VITE_FRONTEND_VERSION env var', async () => {
    render(<AboutWidget />)

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    expect(screen.getByText('0.1.3')).toBeInTheDocument()
  })

  // TC-ABOUT-008: per-row error — one service down, others still show
  it('TC-ABOUT-008: shows error for unavailable service without blocking other rows', async () => {
    const networkErr: ApiError = { type: 'network', message: 'Unavailable' }
    mockFetchVersion.mockImplementation((baseUrl: string) => {
      if (baseUrl === 'http://localhost:3000/greet') {
        return Promise.reject(networkErr)
      }
      return Promise.resolve(counterVersionResponse)
    })

    render(<AboutWidget />)

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    // greeting-service row shows error
    const errorEl = screen.getByTestId('error-greeting-service')
    expect(errorEl).toBeInTheDocument()

    // counter-service and frontend still show version
    expect(screen.getByText('0.0.2')).toBeInTheDocument()
    expect(screen.getByText('0.1.3')).toBeInTheDocument()
  })

  // TC-ABOUT-009: timeout error message
  it('TC-ABOUT-009: shows timeout error message when fetch times out', async () => {
    const timeoutErr: ApiError = {
      type: 'timeout',
      message: 'Request timed out. Please try again.',
    }
    mockFetchVersion.mockRejectedValue(timeoutErr)

    render(<AboutWidget />)

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    const greetingError = screen.getByTestId('error-greeting-service')
    expect(greetingError).toHaveTextContent(/timed out/i)

    const counterError = screen.getByTestId('error-counter-service')
    expect(counterError).toHaveTextContent(/timed out/i)
  })

  // TC-ABOUT-010: accessibility check with axe-core
  it('TC-ABOUT-010: About page has no accessibility violations', async () => {
    const { container } = render(<AboutWidget />)

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
