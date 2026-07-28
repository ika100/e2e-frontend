import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Router } from 'wouter'
import { memoryLocation } from 'wouter/memory-location'
import App from './App'

function renderAt(path: string) {
  const { hook } = memoryLocation({ path, static: true })
  return render(
    <Router hook={hook}>
      <App />
    </Router>,
  )
}

// We need App standalone for title and default route tests
describe('App shell', () => {
  // TC-011: document title
  it('TC-011: sets document title to e2e-platform', () => {
    renderAt('/')
    expect(document.title).toBe('e2e-platform')
  })

  // TC-012: unknown route shows Not Found
  it('TC-012: shows Not Found message on unknown route', () => {
    renderAt('/nonexistent')
    expect(screen.getByText(/not found/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /go to home page/i })).toBeInTheDocument()
  })

  // TC-013: header with nav links visible on all routes
  it('TC-013: header with Greeting and Counter nav links visible on /', () => {
    renderAt('/')
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /greeting/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /counter/i })).toBeInTheDocument()
  })

  it('TC-013b: header visible on /counter route', () => {
    renderAt('/counter')
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /greeting/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /counter/i })).toBeInTheDocument()
  })
})
