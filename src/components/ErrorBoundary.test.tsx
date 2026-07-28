import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import ErrorBoundary from './ErrorBoundary'

function BrokenComponent(): never {
  throw new Error('Test error from broken component')
}

describe('ErrorBoundary', () => {
  // TC-017: error boundary catches render errors
  it('TC-017: shows error message and Reload button when child throws', () => {
    // Suppress console.error noise from React for this test
    const originalError = console.error
    console.error = vi.fn()
    beforeAll(() => { console.error = vi.fn() })
    afterAll(() => { console.error = originalError })

    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument()

    console.error = originalError
  })
})
