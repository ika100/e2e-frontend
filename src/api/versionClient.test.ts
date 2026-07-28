// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { fetchVersion, type VersionResponse } from './versionClient'

const BASE_URL = 'http://test-service.example.com'

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('fetchVersion', () => {
  // TC-VER-001: success (200)
  it('TC-VER-001: returns VersionResponse on 200', async () => {
    const mockResponse: VersionResponse = {
      name: 'greeting-service',
      version: '0.0.3',
      gitUrl: 'https://github.com/ika100/e2e-greeting-service',
    }

    server.use(
      http.get(`${BASE_URL}/version`, () => {
        return HttpResponse.json(mockResponse)
      }),
    )

    const result = await fetchVersion(BASE_URL)

    expect(result).toEqual(mockResponse)
    expect(result.name).toBe('greeting-service')
    expect(result.version).toBe('0.0.3')
    expect(result.gitUrl).toBe('https://github.com/ika100/e2e-greeting-service')
  })

  // TC-VER-002: network error
  it('TC-VER-002: throws ApiError with type "network" on network failure', async () => {
    server.use(
      http.get(`${BASE_URL}/version`, () => {
        return HttpResponse.error()
      }),
    )

    await expect(fetchVersion(BASE_URL)).rejects.toMatchObject({
      type: 'network',
    })
  })

  // TC-VER-003: 503 error
  it('TC-VER-003: throws ApiError with type "service" on 503 response', async () => {
    server.use(
      http.get(`${BASE_URL}/version`, () => {
        return HttpResponse.json({ error: 'Service Unavailable' }, { status: 503 })
      }),
    )

    await expect(fetchVersion(BASE_URL)).rejects.toMatchObject({
      type: 'service',
      message: 'Service Unavailable',
    })
  })

  // TC-VER-TIMEOUT: timeout test using fake timers
  it('throws ApiError with type "timeout" when request exceeds 10 seconds', async () => {
    vi.useFakeTimers()

    // Replace fetch with a function that returns a promise that never resolves,
    // but respects the AbortSignal so the timeout can fire via apiFetch's setTimeout.
    const originalFetch = globalThis.fetch
    globalThis.fetch = (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      return new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal
        if (signal) {
          signal.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'))
          })
        }
      })
    }

    try {
      const fetchPromise = fetchVersion(BASE_URL)

      // Pre-attach a rejection handler so the rejection is not flagged as
      // "unhandled" while the timer fires during advanceTimersByTimeAsync.
      const settled = fetchPromise.then(
        () => ({ status: 'fulfilled' as const }),
        (err: unknown) => ({ status: 'rejected' as const, reason: err }),
      )

      // Advance time past the 10-second timeout inside apiFetch
      await vi.advanceTimersByTimeAsync(10_001)

      const result = await settled
      expect(result.status).toBe('rejected')
      expect((result as { status: 'rejected'; reason: unknown }).reason).toMatchObject({
        type: 'timeout',
        message: 'Request timed out. Please try again.',
      })
    } finally {
      globalThis.fetch = originalFetch
      vi.useRealTimers()
    }
  })
})
