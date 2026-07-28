import { apiFetch } from './apiClient'

export interface GreetingResponse {
  greeting: string
}

const BASE_URL = import.meta.env.VITE_GREETING_SERVICE_URL ?? ''

export async function fetchGreeting(name: string): Promise<GreetingResponse> {
  const url = `${BASE_URL}/greet?name=${encodeURIComponent(name)}`
  return apiFetch<GreetingResponse>(url)
}
