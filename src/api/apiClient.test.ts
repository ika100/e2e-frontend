// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { http, HttpResponse, delay } from 'msw'
import { setupServer } from 'msw/node'
import { apiFetch, ApiError } from './apiClient'

const TEST_URL = 'http://test.example.com/api'

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('apiFetch', () => {
  // TC-021: 200 success path
  it('TC-021: resolves with parsed JSON on 200', async () => {
    server.use(
      http.get(TEST_URL, () =>
        HttpResponse.json({ greeting: 'Hi!' }, { status: 200 }),
      ),
    )
    const result = await apiFetch<{ greeting: string }>(TEST_URL)
    expect(result).toEqual({ greeting: 'Hi!' })
  })

  // TC-022: Timeout
  it('TC-022: rejects with timeout error when request takes > 10 s', async () => {
    server.use(
      http.get(TEST_URL, async () => {
        await delay(11_000)
        return HttpResponse.json({})
      }),
    )

    let caught: ApiError | null = null
    try {
      await apiFetch(TEST_URL)
    } catch (e) {
      caught = e as ApiError
    }

    expect(caught).not.toBeNull()
    expect(caught!.type).toBe('timeout')
    expect(caught!.message).toMatch(/timed out/i)
  }, 15_000)

  // TC-023: Network error
  it('TC-023: rejects with network error on connection failure', async () => {
    server.use(
      http.get(TEST_URL, () => HttpResponse.error()),
    )

    let caught: ApiError | null = null
    try {
      await apiFetch(TEST_URL)
    } catch (e) {
      caught = e as ApiError
    }

    expect(caught).not.toBeNull()
    expect(caught!.type).toBe('network')
  })

  // TC-024: 4xx service error
  it('TC-024: rejects with service error on 400 response', async () => {
    server.use(
      http.get(TEST_URL, () =>
        HttpResponse.json(
          { error: 'Bad Request \u2014 name is required' },
          { status: 400 },
        ),
      ),
    )

    let caught: ApiError | null = null
    try {
      await apiFetch(TEST_URL)
    } catch (e) {
      caught = e as ApiError
    }

    expect(caught).not.toBeNull()
    expect(caught!.type).toBe('service')
    expect(caught!.message).toBe('Bad Request \u2014 name is required')
  })

  // TC-025: 5xx service error
  it('TC-025: rejects with service error on 500 response', async () => {
    server.use(
      http.get(TEST_URL, () => HttpResponse.json({}, { status: 500 })),
    )

    let caught: ApiError | null = null
    try {
      await apiFetch(TEST_URL)
    } catch (e) {
      caught = e as ApiError
    }

    expect(caught).not.toBeNull()
    expect(caught!.type).toBe('service')
    expect(caught!.message).toContain('500')
  })
})
