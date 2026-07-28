import { apiFetch } from './apiClient'

export interface CounterResponse {
  name: string
  value: number
}

export interface CounterListResponse {
  counters: CounterResponse[]
}

const BASE_URL = import.meta.env.VITE_COUNTER_SERVICE_URL ?? ''

export async function listCounters(): Promise<CounterListResponse> {
  const url = `${BASE_URL}/counters`
  return apiFetch<CounterListResponse>(url)
}

export async function readCounter(name: string): Promise<CounterResponse> {
  const url = `${BASE_URL}/counters/${encodeURIComponent(name)}`
  return apiFetch<CounterResponse>(url)
}

export async function incrementCounter(name: string): Promise<CounterResponse> {
  const url = `${BASE_URL}/counters/${encodeURIComponent(name)}`
  return apiFetch<CounterResponse>(url, { method: 'POST' })
}

export async function resetCounter(name: string): Promise<void> {
  const url = `${BASE_URL}/counters/${encodeURIComponent(name)}`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10_000)
  try {
    const response = await fetch(url, { method: 'DELETE', signal: controller.signal })
    clearTimeout(timeoutId)
    if (!response.ok) {
      let message = `HTTP ${response.status}`
      try {
        const body = (await response.json()) as Record<string, unknown>
        if (typeof body['error'] === 'string') {
          message = body['error']
        }
      } catch {
        // ignore
      }
      const error = { type: 'service' as const, message }
      throw error
    }
    // 204 No Content — do not call response.json()
  } catch (err) {
    clearTimeout(timeoutId)
    const alreadyNormalised =
      typeof err === 'object' &&
      err !== null &&
      'type' in err &&
      'message' in err
    if (alreadyNormalised) throw err

    if (
      (err instanceof DOMException && err.name === 'AbortError') ||
      (err as NodeJS.ErrnoException)?.code === 'ABORT_ERR'
    ) {
      throw { type: 'network' as const, message: 'Request was cancelled.' }
    }
    throw { type: 'network' as const, message: err instanceof Error ? err.message : 'Network error' }
  }
}
