import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CounterWidget from './CounterWidget'
import * as counterClient from '../api/counterClient'
import type { ApiError } from '../api/apiClient'

// Mock the counter client module
vi.mock('../api/counterClient', () => ({
  readCounter: vi.fn(),
  incrementCounter: vi.fn(),
}))

const mockReadCounter = vi.mocked(counterClient.readCounter)
const mockIncrementCounter = vi.mocked(counterClient.incrementCounter)

describe('CounterWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // TC-041: widget is visible
  it('TC-041: renders counter name input and Read/Increment buttons', () => {
    render(<CounterWidget />)
    expect(screen.getByPlaceholderText(/counter name/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /read counter/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /increment counter/i })).toBeInTheDocument()
  })

  // TC-042: empty input disables buttons
  it('TC-042: both buttons disabled when input is empty', () => {
    render(<CounterWidget />)
    expect(screen.getByRole('button', { name: /read counter/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /increment counter/i })).toBeDisabled()
  })

  // TC-043: read counter exists
  it('TC-043: displays counter value on successful read', async () => {
    mockReadCounter.mockResolvedValueOnce({ name: 'visits', value: 42 })

    render(<CounterWidget />)
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText(/counter name/i), 'visits')
    await user.click(screen.getByRole('button', { name: /read counter/i }))

    await waitFor(() => {
      expect(screen.getByText('visits: 42')).toBeInTheDocument()
    })
    expect(mockReadCounter).toHaveBeenCalledWith('visits')
  })

  // TC-044: 404 not found
  it('TC-044: shows not-found message on 404', async () => {
    const err: ApiError = { type: 'service', message: 'HTTP 404' }
    mockReadCounter.mockRejectedValueOnce(err)

    render(<CounterWidget />)
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText(/counter name/i), 'x')
    await user.click(screen.getByRole('button', { name: /read counter/i }))

    await waitFor(() => {
      expect(screen.getByText(/counter 'x' has not been created yet/i)).toBeInTheDocument()
    })
  })

  // TC-045: successful increment
  it('TC-045: shows updated value on successful increment', async () => {
    mockIncrementCounter.mockResolvedValueOnce({ name: 'clicks', value: 5 })

    render(<CounterWidget />)
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText(/counter name/i), 'clicks')
    await user.click(screen.getByRole('button', { name: /increment counter/i }))

    await waitFor(() => {
      expect(screen.getByText('clicks: 5')).toBeInTheDocument()
    })
  })

  // TC-046: auto-create on first increment
  it('TC-046: shows value 1 on first increment (auto-create)', async () => {
    mockIncrementCounter.mockResolvedValueOnce({ name: 'new', value: 1 })

    render(<CounterWidget />)
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText(/counter name/i), 'new')
    await user.click(screen.getByRole('button', { name: /increment counter/i }))

    await waitFor(() => {
      expect(screen.getByText('new: 1')).toBeInTheDocument()
    })
  })

  // TC-047: invalid characters — no HTTP call
  it('TC-047: shows validation error for invalid counter name characters', async () => {
    render(<CounterWidget />)
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText(/counter name/i), 'my counter!')
    await user.click(screen.getByRole('button', { name: /increment counter/i }))

    expect(
      screen.getByText(
        /counter name may only contain letters, digits, hyphens, and underscores/i,
      ),
    ).toBeInTheDocument()
    expect(mockIncrementCounter).not.toHaveBeenCalled()
  })

  // TC-048: name > 100 chars — no HTTP call
  it('TC-048: shows validation error for name exceeding 100 characters', async () => {
    render(<CounterWidget />)
    const user = userEvent.setup()
    await user.type(
      screen.getByPlaceholderText(/counter name/i),
      'a'.repeat(101),
    )
    await user.click(screen.getByRole('button', { name: /read counter/i }))

    expect(
      screen.getByText(/counter name must not exceed 100 characters/i),
    ).toBeInTheDocument()
    expect(mockReadCounter).not.toHaveBeenCalled()
  })

  // TC-049: 429 rate limit
  it('TC-049: shows rate limit message on 429', async () => {
    const err: ApiError = { type: 'service', message: 'HTTP 429' }
    mockIncrementCounter.mockRejectedValueOnce(err)

    render(<CounterWidget />)
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText(/counter name/i), 'clicks')
    await user.click(screen.getByRole('button', { name: /increment counter/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/too many requests/i),
      ).toBeInTheDocument()
    })
  })

  // TC-050: 5xx error
  it('TC-050: shows server error message on 5xx', async () => {
    const err: ApiError = { type: 'service', message: 'HTTP 500' }
    mockReadCounter.mockRejectedValueOnce(err)

    render(<CounterWidget />)
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText(/counter name/i), 'clicks')
    await user.click(screen.getByRole('button', { name: /read counter/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/the counter service encountered an error/i),
      ).toBeInTheDocument()
    })
  })
})
