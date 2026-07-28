import { apiFetch } from './apiClient'

export interface VersionResponse {
  name: string
  version: string
  gitUrl: string
}

export async function fetchVersion(baseUrl: string): Promise<VersionResponse> {
  const url = `${baseUrl}/version`
  return apiFetch<VersionResponse>(url)
}
