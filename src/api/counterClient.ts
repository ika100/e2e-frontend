import { apiFetch } from './apiClient'

export interface CounterResponse {
  name: string
  value: number
}

const BASE_URL = import.meta.env.VITE_COUNTER_SERVICE_URL ?? ''

export async function readCounter(name: string): Promise<CounterResponse> {
  const url = `${BASE_URL}/counters/${encodeURIComponent(name)}`
  return apiFetch<CounterResponse>(url)
}

export async function incrementCounter(name: string): Promise<CounterResponse> {
  const url = `${BASE_URL}/counters/${encodeURIComponent(name)}`
  return apiFetch<CounterResponse>(url, { method: 'POST' })
}
