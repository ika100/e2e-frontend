/**
 * Normalised error shape returned by apiFetch on failure.
 */
export interface ApiError {
  type: 'network' | 'timeout' | 'service'
  message: string
}

/**
 * apiFetch — wraps fetch with a 10-second AbortController timeout.
 * Returns parsed JSON on success (200–299).
 * Throws an ApiError on network error, timeout, or non-2xx response.
 */
export async function apiFetch<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const controller = new AbortController()
  let timedOut = false
  const timeoutId = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, 10_000)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      let message = `HTTP ${response.status}`
      try {
        const body = (await response.json()) as Record<string, unknown>
        if (typeof body['error'] === 'string') {
          message = body['error']
        }
      } catch {
        // ignore parse errors — keep generic message
      }
      const error: ApiError = { type: 'service', message }
      throw error
    }

    return (await response.json()) as T
  } catch (err) {
    clearTimeout(timeoutId)

    // Already normalised — re-throw as-is
    if (isApiError(err)) throw err

    // Detect abort — either timeout (our timer) or user-cancelled
    if (
      err instanceof DOMException && err.name === 'AbortError' ||
      (err as NodeJS.ErrnoException)?.code === 'ABORT_ERR'
    ) {
      if (timedOut) {
        const error: ApiError = {
          type: 'timeout',
          message: 'Request timed out. Please try again.',
        }
        throw error
      }
      const error: ApiError = {
        type: 'network',
        message: 'Request was cancelled.',
      }
      throw error
    }

    // Network / fetch error
    const networkError: ApiError = {
      type: 'network',
      message: err instanceof Error ? err.message : 'Network error',
    }
    throw networkError
  }
}

function isApiError(err: unknown): err is ApiError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    'message' in err &&
    (err as ApiError).type !== undefined
  )
}
