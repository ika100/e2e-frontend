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
  let timedOut = false
  const timeoutId = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, 10_000)

  let response: Response
  try {
    response = await fetch(url, { method: 'DELETE', signal: controller.signal })
    clearTimeout(timeoutId)
  } catch (err) {
    clearTimeout(timeoutId)
    if (
      err instanceof DOMException && err.name === 'AbortError'
    ) {
      if (timedOut) throw { type: 'timeout', message: 'Request timed out. Please try again.' }
      throw { type: 'network', message: 'Request was cancelled.' }
    }
    throw { type: 'network', message: err instanceof Error ? err.message : 'Network error' }
  }

  if (!response.ok) {
    let message = `HTTP ${response.status}`
    try {
      const body = (await response.json()) as Record<string, unknown>
      if (typeof body['error'] === 'string') message = body['error']
    } catch { /* ignore */ }
    throw { type: 'service', message }
  }
  // 204 No Content — success, nothing to return
}
