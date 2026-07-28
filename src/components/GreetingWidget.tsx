import { useState, useCallback, KeyboardEvent } from 'react'
import { fetchGreeting } from '../api/greetingClient'
import { ApiError } from '../api/apiClient'
import styles from './Widget.module.css'

interface State {
  name: string
  greeting: string | null
  error: string | null
  loading: boolean
}

function GreetingWidget() {
  const [state, setState] = useState<State>({
    name: '',
    greeting: null,
    error: null,
    loading: false,
  })

  const handleSubmit = useCallback(async () => {
    const trimmed = state.name.trim()
    if (!trimmed) return

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const response = await fetchGreeting(trimmed)
      setState(prev => ({
        ...prev,
        greeting: response.greeting,
        loading: false,
      }))
    } catch (err) {
      const apiErr = err as ApiError
      let message: string
      if (apiErr.type === 'timeout') {
        message = 'Request timed out. Please try again.'
      } else if (apiErr.type === 'network') {
        message = 'Could not reach the greeting service. Please try again.'
      } else {
        // service error — show server message
        message = apiErr.message
      }
      setState(prev => ({ ...prev, error: message, loading: false }))
    }
  }, [state.name])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        void handleSubmit()
      }
    },
    [handleSubmit],
  )

  const isDisabled = state.name.trim() === '' || state.loading

  return (
    <section className={styles.widget} aria-labelledby="greeting-widget-heading">
      <h3 id="greeting-widget-heading" className={styles.widgetTitle}>
        Get a Greeting
      </h3>

      <div className={styles.inputRow}>
        <label htmlFor="greeting-name-input" className={styles.label}>
          Your name
        </label>
        <input
          id="greeting-name-input"
          type="text"
          value={state.name}
          onChange={e => setState(prev => ({ ...prev, name: e.target.value }))}
          onKeyDown={handleKeyDown}
          placeholder="Enter your name"
          className={styles.input}
          aria-label="Enter your name"
          disabled={state.loading}
        />
        <button
          onClick={() => void handleSubmit()}
          disabled={isDisabled}
          className={styles.btn}
          aria-label="Get Greeting"
        >
          {state.loading ? 'Loading…' : 'Get Greeting'}
        </button>
      </div>

      {state.loading && (
        <p className={styles.loading} role="status" aria-live="polite">
          Loading…
        </p>
      )}

      {state.error && (
        <p className={styles.error} role="alert" aria-live="assertive">
          {state.error}
        </p>
      )}

      {!state.loading && state.greeting && (
        <p className={styles.result} aria-live="polite">
          {state.greeting}
        </p>
      )}
    </section>
  )
}

export default GreetingWidget
