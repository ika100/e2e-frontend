import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CounterWidget from './CounterWidget'
import * as counterClient from '../api/counterClient'
import type { ApiError } from '../api/apiClient'

vi.mock('../api/counterClient', () => ({
  listCounters: vi.fn(),
  readCounter: vi.fn(),
  incrementCounter: vi.fn(),
  resetCounter: vi.fn(),
}))

const mockListCounters = vi.mocked(counterClient.listCounters)
const mockIncrementCounter = vi.mocked(counterClient.incrementCounter)
const mockResetCounter = vi.mocked(counterClient.resetCounter)

describe('CounterWidget — list view', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: empty list
    mockListCounters.mockResolvedValue({ counters: [] })
  })

  // TC-050: Counter list loaded on mount
  it('TC-050: fetches counter list on mount and renders each row', async () => {
    mockListCounters.mockResolvedValueOnce({
      counters: [
        { name: 'visits', value: 3 },
        { name: 'clicks', value: 7 },
      ],
    })

    render(<CounterWidget />)

    // Loading indicator visible while in flight
    expect(screen.getByRole('status')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('visits')).toBeInTheDocument()
    })

    expect(mockListCounters).toHaveBeenCalledTimes(1)
    expect(screen.getByText('visits')).toBeInTheDocument()
    expect(screen.getByLabelText('visits value')).toHaveTextContent('3')
    expect(screen.getByText('clicks')).toBeInTheDocument()
    expect(screen.getByLabelText('clicks value')).toHaveTextContent('7')
  })

  // TC-051: Empty list shows empty-state message
  it('TC-051: shows empty-state message when no counters exist', async () => {
    mockListCounters.mockResolvedValueOnce({ counters: [] })

    render(<CounterWidget />)

    await waitFor(() => {
      expect(screen.getByText('No counters yet. Add one below.')).toBeInTheDocument()
    })
  })

  // TC-052: Increment existing counter updates row in-place
  it('TC-052: increment button calls POST and updates row value in-place', async () => {
    mockListCounters.mockResolvedValueOnce({
      counters: [{ name: 'visits', value: 3 }],
    })
    mockIncrementCounter.mockResolvedValueOnce({ name: 'visits', value: 4 })

    render(<CounterWidget />)

    await waitFor(() => {
      expect(screen.getByLabelText('Increment visits')).toBeInTheDocument()
    })

    const user = userEvent.setup()
    await user.click(screen.getByLabelText('Increment visits'))

    await waitFor(() => {
      expect(screen.getByLabelText('visits value')).toHaveTextContent('4')
    })

    expect(mockIncrementCounter).toHaveBeenCalledWith('visits')
    // Ensure list was NOT re-fetched (no full reload)
    expect(mockListCounters).toHaveBeenCalledTimes(1)
  })

  // TC-053: Reset removes counter from list
  it('TC-053: reset button calls DELETE and removes the row; shows empty-state if last counter', async () => {
    mockListCounters.mockResolvedValueOnce({
      counters: [{ name: 'clicks', value: 2 }],
    })
    mockResetCounter.mockResolvedValueOnce(undefined)

    render(<CounterWidget />)

    await waitFor(() => {
      expect(screen.getByLabelText('Reset clicks')).toBeInTheDocument()
    })

    const user = userEvent.setup()
    await user.click(screen.getByLabelText('Reset clicks'))

    await waitFor(() => {
      expect(screen.queryByText('clicks')).not.toBeInTheDocument()
    })

    expect(mockResetCounter).toHaveBeenCalledWith('clicks')
    expect(screen.getByText('No counters yet. Add one below.')).toBeInTheDocument()
  })

  // TC-054: Add & Increment creates new counter, adds row, clears input
  it('TC-054: Add & Increment calls POST, adds new row to list and clears input', async () => {
    mockListCounters.mockResolvedValueOnce({ counters: [] })
    mockIncrementCounter.mockResolvedValueOnce({ name: 'pageviews', value: 1 })

    render(<CounterWidget />)

    await waitFor(() => {
      expect(screen.getByText('No counters yet. Add one below.')).toBeInTheDocument()
    })

    const user = userEvent.setup()
    const input = screen.getByLabelText('New counter name')
    await user.type(input, 'pageviews')
    await user.click(screen.getByLabelText('Add & Increment'))

    await waitFor(() => {
      expect(screen.getByText('pageviews')).toBeInTheDocument()
    })

    expect(mockIncrementCounter).toHaveBeenCalledWith('pageviews')
    expect(screen.getByLabelText('pageviews value')).toHaveTextContent('1')
    // Input is cleared
    expect(input).toHaveValue('')
  })

  // TC-055: Add & Increment button disabled when input empty or whitespace
  it('TC-055: Add & Increment button is disabled when input is empty or whitespace', async () => {
    mockListCounters.mockResolvedValueOnce({ counters: [] })

    render(<CounterWidget />)

    await waitFor(() => {
      expect(screen.getByLabelText('Add & Increment')).toBeInTheDocument()
    })

    const btn = screen.getByLabelText('Add & Increment')
    expect(btn).toBeDisabled()

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('New counter name'), '   ')
    expect(btn).toBeDisabled()
  })

  // TC-056: Name with invalid characters — no HTTP call, inline error shown
  it('TC-056: shows inline validation error for disallowed characters, no HTTP request', async () => {
    mockListCounters.mockResolvedValueOnce({ counters: [] })

    render(<CounterWidget />)

    await waitFor(() => {
      expect(screen.getByLabelText('Add & Increment')).toBeInTheDocument()
    })

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('New counter name'), 'my counter!')
    await user.click(screen.getByLabelText('Add & Increment'))

    expect(
      screen.getByText(
        'Counter name may only contain letters, digits, hyphens, and underscores.',
      ),
    ).toBeInTheDocument()
    expect(mockIncrementCounter).not.toHaveBeenCalled()
  })

  // TC-057: Name exceeds 100 characters — no HTTP call, inline error shown
  it('TC-057: shows inline validation error for name exceeding 100 characters, no HTTP request', async () => {
    mockListCounters.mockResolvedValueOnce({ counters: [] })

    render(<CounterWidget />)

    await waitFor(() => {
      expect(screen.getByLabelText('Add & Increment')).toBeInTheDocument()
    })

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('New counter name'), 'a'.repeat(101))
    await user.click(screen.getByLabelText('Add & Increment'))

    expect(
      screen.getByText('Counter name must not exceed 100 characters.'),
    ).toBeInTheDocument()
    expect(mockIncrementCounter).not.toHaveBeenCalled()
  })

  // Additional error scenarios
  it('shows list-level error when GET /counters fails', async () => {
    const err: ApiError = { type: 'network', message: 'Network error' }
    mockListCounters.mockRejectedValueOnce(err)

    render(<CounterWidget />)

    await waitFor(() => {
      expect(
        screen.getByText('Could not reach the counter service. Please try again.'),
      ).toBeInTheDocument()
    })
  })

  it('shows per-row error on 429 during increment', async () => {
    mockListCounters.mockResolvedValueOnce({
      counters: [{ name: 'visits', value: 3 }],
    })
    const err: ApiError = { type: 'service', message: 'HTTP 429' }
    mockIncrementCounter.mockRejectedValueOnce(err)

    render(<CounterWidget />)

    await waitFor(() => {
      expect(screen.getByLabelText('Increment visits')).toBeInTheDocument()
    })

    const user = userEvent.setup()
    await user.click(screen.getByLabelText('Increment visits'))

    await waitFor(() => {
      expect(
        screen.getByText('Too many requests. Please wait a moment and try again.'),
      ).toBeInTheDocument()
    })

    // Value should not change
    expect(screen.getByLabelText('visits value')).toHaveTextContent('3')
  })

  it('shows add-form error on 5xx during Add & Increment', async () => {
    mockListCounters.mockResolvedValueOnce({ counters: [] })
    const err: ApiError = { type: 'service', message: 'HTTP 500' }
    mockIncrementCounter.mockRejectedValueOnce(err)

    render(<CounterWidget />)

    await waitFor(() => {
      expect(screen.getByLabelText('Add & Increment')).toBeInTheDocument()
    })

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('New counter name'), 'foo')
    await user.click(screen.getByLabelText('Add & Increment'))

    await waitFor(() => {
      expect(
        screen.getByText('The counter service encountered an error. Please try again later.'),
      ).toBeInTheDocument()
    })
  })

  it('Counter already in list: Add & Increment updates existing row', async () => {
    mockListCounters.mockResolvedValueOnce({
      counters: [{ name: 'visits', value: 3 }],
    })
    mockIncrementCounter.mockResolvedValueOnce({ name: 'visits', value: 4 })

    render(<CounterWidget />)

    await waitFor(() => {
      expect(screen.getByText('visits')).toBeInTheDocument()
    })

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('New counter name'), 'visits')
    await user.click(screen.getByLabelText('Add & Increment'))

    await waitFor(() => {
      expect(screen.getByLabelText('visits value')).toHaveTextContent('4')
    })

    // Still only one row for visits
    expect(screen.getAllByText('visits')).toHaveLength(1)
  })
})
