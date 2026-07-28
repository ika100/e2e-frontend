import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
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

/** Render widget and wait for the initial list load to settle */
async function renderAndWait() {
  const view = render(<CounterWidget />)
  // Wait for loading indicator to disappear
  await waitFor(() => {
    expect(screen.queryByText(/loading counters/i)).not.toBeInTheDocument()
  })
  return view
}

describe('CounterWidget — list view', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // TC-050: list loads on mount
  it('TC-050: renders counter list on mount', async () => {
    mockListCounters.mockResolvedValueOnce({
      counters: [
        { name: 'clicks', value: 3 },
        { name: 'visits', value: 42 },
      ],
    })
    await renderAndWait()

    const list = screen.getByRole('list', { name: /counter list/i })
    expect(within(list).getByText('clicks')).toBeInTheDocument()
    expect(within(list).getByText('3')).toBeInTheDocument()
    expect(within(list).getByText('visits')).toBeInTheDocument()
    expect(within(list).getByText('42')).toBeInTheDocument()
  })

  // TC-051: empty-state message
  it('TC-051: shows empty-state message when no counters exist', async () => {
    mockListCounters.mockResolvedValueOnce({ counters: [] })
    await renderAndWait()

    expect(screen.getByText(/no counters yet/i)).toBeInTheDocument()
  })

  // TC-052: per-row increment updates value in-place
  it('TC-052: increment button updates row value without full reload', async () => {
    mockListCounters.mockResolvedValueOnce({
      counters: [{ name: 'clicks', value: 5 }],
    })
    mockIncrementCounter.mockResolvedValueOnce({ name: 'clicks', value: 6 })

    await renderAndWait()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /increment clicks/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/clicks value/i)).toHaveTextContent('6')
    })
    expect(mockIncrementCounter).toHaveBeenCalledWith('clicks')
    // listCounters should NOT have been called again (no full reload)
    expect(mockListCounters).toHaveBeenCalledTimes(1)
  })

  // TC-053: per-row reset removes row
  it('TC-053: reset button removes counter row from list', async () => {
    mockListCounters.mockResolvedValueOnce({
      counters: [
        { name: 'alpha', value: 1 },
        { name: 'beta', value: 2 },
      ],
    })
    mockResetCounter.mockResolvedValueOnce(undefined)

    await renderAndWait()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /reset alpha/i }))

    await waitFor(() => {
      expect(screen.queryByText('alpha')).not.toBeInTheDocument()
    })
    expect(mockResetCounter).toHaveBeenCalledWith('alpha')
    // beta still in list
    expect(screen.getByText('beta')).toBeInTheDocument()
  })

  // TC-053b: empty state shown after last counter reset
  it('TC-053b: shows empty-state after resetting last counter', async () => {
    mockListCounters.mockResolvedValueOnce({
      counters: [{ name: 'only', value: 7 }],
    })
    mockResetCounter.mockResolvedValueOnce(undefined)

    await renderAndWait()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /reset only/i }))

    await waitFor(() => {
      expect(screen.getByText(/no counters yet/i)).toBeInTheDocument()
    })
  })

  // TC-054: Add & Increment creates new row and clears input
  it('TC-054: Add & Increment adds new counter row and clears input', async () => {
    mockListCounters.mockResolvedValueOnce({ counters: [] })
    mockIncrementCounter.mockResolvedValueOnce({ name: 'pageviews', value: 1 })

    await renderAndWait()
    const user = userEvent.setup()

    const input = screen.getByPlaceholderText(/counter name/i)
    await user.type(input, 'pageviews')
    await user.click(screen.getByRole('button', { name: /add and increment counter/i }))

    await waitFor(() => {
      expect(screen.getByText('pageviews')).toBeInTheDocument()
    })
    expect(screen.getByLabelText(/pageviews value/i)).toHaveTextContent('1')
    expect(input).toHaveValue('')
    expect(mockIncrementCounter).toHaveBeenCalledWith('pageviews')
  })

  // TC-054b: Add existing counter increments it in-place
  it('TC-054b: adding existing counter name increments existing row', async () => {
    mockListCounters.mockResolvedValueOnce({
      counters: [{ name: 'visits', value: 10 }],
    })
    mockIncrementCounter.mockResolvedValueOnce({ name: 'visits', value: 11 })

    await renderAndWait()
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText(/counter name/i), 'visits')
    await user.click(screen.getByRole('button', { name: /add and increment counter/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/visits value/i)).toHaveTextContent('11')
    })
    // Only one row for 'visits'
    expect(screen.getAllByText('visits')).toHaveLength(1)
  })

  // TC-055: Add button disabled on empty input
  it('TC-055: Add & Increment button is disabled when input is empty', async () => {
    mockListCounters.mockResolvedValueOnce({ counters: [] })
    await renderAndWait()

    expect(
      screen.getByRole('button', { name: /add and increment counter/i }),
    ).toBeDisabled()
  })

  // TC-056: validation error for invalid name
  it('TC-056: shows validation error for invalid counter name', async () => {
    mockListCounters.mockResolvedValueOnce({ counters: [] })
    await renderAndWait()

    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText(/counter name/i), 'my counter!')
    await user.click(screen.getByRole('button', { name: /add and increment counter/i }))

    expect(
      screen.getByText(
        /counter name may only contain letters, digits, hyphens, and underscores/i,
      ),
    ).toBeInTheDocument()
    expect(mockIncrementCounter).not.toHaveBeenCalled()
  })

  it('TC-056b: shows validation error for name exceeding 100 characters', async () => {
    mockListCounters.mockResolvedValueOnce({ counters: [] })
    await renderAndWait()

    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText(/counter name/i), 'a'.repeat(101))
    await user.click(screen.getByRole('button', { name: /add and increment counter/i }))

    expect(
      screen.getByText(/counter name must not exceed 100 characters/i),
    ).toBeInTheDocument()
    expect(mockIncrementCounter).not.toHaveBeenCalled()
  })

  // TC-057: error messages on API failures
  it('TC-057: shows rate-limit error on 429 increment', async () => {
    mockListCounters.mockResolvedValueOnce({
      counters: [{ name: 'clicks', value: 1 }],
    })
    const err: ApiError = { type: 'service', message: 'HTTP 429' }
    mockIncrementCounter.mockRejectedValueOnce(err)

    await renderAndWait()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /increment clicks/i }))

    await waitFor(() => {
      expect(screen.getByText(/too many requests/i)).toBeInTheDocument()
    })
    // Value unchanged
    expect(screen.getByLabelText(/clicks value/i)).toHaveTextContent('1')
  })

  it('TC-057b: shows network error on failed list load', async () => {
    const err: ApiError = { type: 'network', message: 'Network error' }
    mockListCounters.mockRejectedValueOnce(err)

    render(<CounterWidget />)
    await waitFor(() => {
      expect(
        screen.getByText(/could not reach the counter service/i),
      ).toBeInTheDocument()
    })
  })

  it('TC-057c: shows server error on 5xx reset', async () => {
    mockListCounters.mockResolvedValueOnce({
      counters: [{ name: 'clicks', value: 5 }],
    })
    const err: ApiError = { type: 'service', message: 'HTTP 500' }
    mockResetCounter.mockRejectedValueOnce(err)

    await renderAndWait()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /reset clicks/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/the counter service encountered an error/i),
      ).toBeInTheDocument()
    })
    // Counter still in list
    expect(screen.getByText('clicks')).toBeInTheDocument()
  })

  it('TC-057d: shows timeout error', async () => {
    const err: ApiError = { type: 'timeout', message: 'Request timed out. Please try again.' }
    mockListCounters.mockRejectedValueOnce(err)

    render(<CounterWidget />)
    await waitFor(() => {
      expect(screen.getByText(/request timed out/i)).toBeInTheDocument()
    })
  })

  // Loading indicator shown while list is being fetched
  it('shows loading indicator while fetching counters', () => {
    // Never resolve — keep it pending
    mockListCounters.mockReturnValueOnce(new Promise(() => {}))
    render(<CounterWidget />)
    expect(screen.getByText(/loading counters/i)).toBeInTheDocument()
  })
})
