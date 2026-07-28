import { useState, useCallback } from 'react'
import { readCounter, incrementCounter } from '../api/counterClient'
import { ApiError } from '../api/apiClient'
import styles from './Widget.module.css'

function mapCounterError(err: ApiError, name: string): string {
  if (err.type === 'timeout') return 'Request timed out. Please try again.'
  if (err.type === 'network') return 'Could not reach the counter service. Please try again.'
  const msg = err.message
  if (msg.includes('404') || msg === 'Counter not found') {
    return `Counter '${name}' has not been created yet.`
  }
  if (msg.includes('429')) return 'Too many requests. Please wait a moment and try again.'
  if (/HTTP 5\d\d/.test(msg) || msg.includes('500')) {
    return 'The counter service encountered an error. Please try again later.'
  }
  return msg
}

interface State {
  name: string
  result: { name: string; value: number } | null
  error: string | null
  loading: boolean
}

function CounterWidget() {
  const [state, setState] = useState<State>({
    name: '',
    result: null,
    error: null,
    loading: false,
  })

  const validate = (name: string): string | null => {
    if (name.length > 100) {
      return 'Counter name must not exceed 100 characters.'
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      return 'Counter name may only contain letters, digits, hyphens, and underscores.'
    }
    return null
  }

  const handleRead = useCallback(async () => {
    const trimmed = state.name.trim()
    if (!trimmed) return

    const validationError = validate(trimmed)
    if (validationError) {
      setState(prev => ({ ...prev, error: validationError }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const response = await readCounter(trimmed)
      setState(prev => ({ ...prev, result: response, loading: false }))
    } catch (err) {
      const apiErr = err as ApiError
      setState(prev => ({ ...prev, error: mapCounterError(apiErr, trimmed), loading: false }))
    }
  }, [state.name])

  const handleIncrement = useCallback(async () => {
    const trimmed = state.name.trim()
    if (!trimmed) return

    const validationError = validate(trimmed)
    if (validationError) {
      setState(prev => ({ ...prev, error: validationError }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const response = await incrementCounter(trimmed)
      setState(prev => ({ ...prev, result: response, loading: false }))
    } catch (err) {
      const apiErr = err as ApiError
      setState(prev => ({ ...prev, error: mapCounterError(apiErr, trimmed), loading: false }))
    }
  }, [state.name])

  const isDisabled = state.name.trim() === '' || state.loading

  return (
    <section className={styles.widget} aria-labelledby="counter-widget-heading">
      <h3 id="counter-widget-heading" className={styles.widgetTitle}>
        Counter
      </h3>

      <div className={styles.inputRow}>
        <label htmlFor="counter-name-input" className={styles.label}>
          Counter name
        </label>
        <input
          id="counter-name-input"
          type="text"
          value={state.name}
          onChange={e => setState(prev => ({ ...prev, name: e.target.value, error: null }))}
          placeholder="Counter name"
          className={styles.input}
          aria-label="Counter name"
          disabled={state.loading}
        />
        <button
          onClick={() => void handleRead()}
          disabled={isDisabled}
          className={styles.btn}
          aria-label="Read counter"
        >
          Read
        </button>
        <button
          onClick={() => void handleIncrement()}
          disabled={isDisabled}
          className={styles.btn}
          aria-label="Increment counter"
        >
          Increment
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

      {!state.loading && state.result && (
        <p className={styles.result} aria-live="polite">
          {state.result.name}: {state.result.value}
        </p>
      )}
    </section>
  )
}

export default CounterWidget
