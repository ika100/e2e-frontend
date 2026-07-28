import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GreetingWidget from './GreetingWidget'
import * as greetingClient from '../api/greetingClient'
import type { ApiError } from '../api/apiClient'

// Mock the greeting client module
vi.mock('../api/greetingClient', () => ({
  fetchGreeting: vi.fn(),
}))

const mockFetchGreeting = vi.mocked(greetingClient.fetchGreeting)

describe('GreetingWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // TC-031: widget is visible
  it('TC-031: renders name input and Get Greeting button', () => {
    render(<GreetingWidget />)
    expect(screen.getByPlaceholderText(/enter your name/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /get greeting/i })).toBeInTheDocument()
  })

  // TC-032: empty input disables button
  it('TC-032: button is disabled when input is empty', () => {
    render(<GreetingWidget />)
    expect(screen.getByRole('button', { name: /get greeting/i })).toBeDisabled()
  })

  // TC-033: successful fetch
  it('TC-033: shows greeting on successful fetch', async () => {
    mockFetchGreeting.mockResolvedValueOnce({ greeting: 'Hello, Alice!' })

    render(<GreetingWidget />)
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText(/enter your name/i), 'Alice')
    await user.click(screen.getByRole('button', { name: /get greeting/i }))

    await waitFor(() => {
      expect(screen.getByText('Hello, Alice!')).toBeInTheDocument()
    })
    expect(mockFetchGreeting).toHaveBeenCalledWith('Alice')
  })

  // TC-034: greeting replaces previous
  it('TC-034: new greeting replaces previous greeting', async () => {
    mockFetchGreeting
      .mockResolvedValueOnce({ greeting: 'Hello, Alice!' })
      .mockResolvedValueOnce({ greeting: 'Hello, Bob!' })

    render(<GreetingWidget />)
    const user = userEvent.setup()
    const input = screen.getByPlaceholderText(/enter your name/i)

    await user.type(input, 'Alice')
    await user.click(screen.getByRole('button', { name: /get greeting/i }))
    await waitFor(() => expect(screen.getByText('Hello, Alice!')).toBeInTheDocument())

    await user.clear(input)
    await user.type(input, 'Bob')
    await user.click(screen.getByRole('button', { name: /get greeting/i }))
    await waitFor(() => expect(screen.getByText('Hello, Bob!')).toBeInTheDocument())
    expect(screen.queryByText('Hello, Alice!')).not.toBeInTheDocument()
  })

  // TC-035: Enter key submits
  it('TC-035: Enter key submits the form', async () => {
    mockFetchGreeting.mockResolvedValueOnce({ greeting: 'Hello, Alice!' })

    render(<GreetingWidget />)
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText(/enter your name/i), 'Alice')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(screen.getByText('Hello, Alice!')).toBeInTheDocument()
    })
  })

  // TC-036: 400 error shows service message
  it('TC-036: shows error message from service on 400', async () => {
    const err: ApiError = { type: 'service', message: 'name must not exceed 100 characters' }
    mockFetchGreeting.mockRejectedValueOnce(err)

    render(<GreetingWidget />)
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText(/enter your name/i), 'x'.repeat(101))
    await user.click(screen.getByRole('button', { name: /get greeting/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText(/name must not exceed 100 characters/i)).toBeInTheDocument()
    })
  })

  // TC-037: network error
  it('TC-037: shows network error message when service is unreachable', async () => {
    const err: ApiError = { type: 'network', message: 'Failed to fetch' }
    mockFetchGreeting.mockRejectedValueOnce(err)

    render(<GreetingWidget />)
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText(/enter your name/i), 'Alice')
    await user.click(screen.getByRole('button', { name: /get greeting/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/could not reach the greeting service/i),
      ).toBeInTheDocument()
    })
  })

  // TC-038: URL encoding — verified via the client call argument
  it('TC-038: calls fetchGreeting with the exact name (URL encoding delegated to client)', async () => {
    mockFetchGreeting.mockResolvedValueOnce({ greeting: 'Hello, Jean-Luc Picard!' })

    render(<GreetingWidget />)
    const user = userEvent.setup()
    await user.type(
      screen.getByPlaceholderText(/enter your name/i),
      'Jean-Luc Picard',
    )
    await user.click(screen.getByRole('button', { name: /get greeting/i }))

    await waitFor(() => {
      expect(mockFetchGreeting).toHaveBeenCalledWith('Jean-Luc Picard')
    })
  })

  // TC-039: URL encoding — verified via greetingClient unit test (TC-038/039 in apiClient.test)
  it('TC-039: calls fetchGreeting with special characters in name', async () => {
    mockFetchGreeting.mockResolvedValueOnce({ greeting: 'Hello, María!' })

    render(<GreetingWidget />)
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText(/enter your name/i), 'María')
    await user.click(screen.getByRole('button', { name: /get greeting/i }))

    await waitFor(() => {
      expect(mockFetchGreeting).toHaveBeenCalledWith('María')
    })
  })
})
