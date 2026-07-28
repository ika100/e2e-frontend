import { useState, useCallback, useEffect } from 'react'
import {
  listCounters,
  incrementCounter,
  resetCounter,
} from '../api/counterClient'
import type { CounterResponse } from '../api/counterClient'
import { ApiError } from '../api/apiClient'
import styles from './Widget.module.css'
import counterStyles from './CounterWidget.module.css'

function mapCounterError(err: ApiError, name?: string): string {
  if (err.type === 'timeout') return 'Request timed out. Please try again.'
  if (err.type === 'network') return 'Could not reach the counter service. Please try again.'
  const msg = err.message
  if (msg.includes('404') || msg === 'Counter not found') {
    return name
      ? `Counter '${name}' has not been created yet.`
      : 'Counter not found.'
  }
  if (msg.includes('429')) return 'Too many requests. Please wait a moment and try again.'
  if (/HTTP 5\d\d/.test(msg) || msg.includes('500')) {
    return 'The counter service encountered an error. Please try again later.'
  }
  return msg
}

function validateName(name: string): string | null {
  if (name.length > 100) return 'Counter name must not exceed 100 characters.'
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    return 'Counter name may only contain letters, digits, hyphens, and underscores.'
  }
  return null
}

function CounterWidget() {
  const [counters, setCounters] = useState<CounterResponse[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  // Per-row state: maps counter name → { loading, error }
  const [rowState, setRowState] = useState<
    Record<string, { loading: boolean; error: string | null }>
  >({})

  // Add-new counter form
  const [newName, setNewName] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [addLoading, setAddLoading] = useState(false)

  const loadCounters = useCallback(async () => {
    setListLoading(true)
    setListError(null)
    try {
      const data = await listCounters()
      setCounters(data.counters)
    } catch (err) {
      setListError(mapCounterError(err as ApiError))
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCounters()
  }, [loadCounters])

  const setRow = (name: string, patch: { loading?: boolean; error?: string | null }) => {
    setRowState(prev => {
      const existing = prev[name] ?? { loading: false, error: null }
      return {
        ...prev,
        [name]: { ...existing, ...patch },
      }
    })
  }

  const handleIncrement = useCallback(
    async (name: string) => {
      setRow(name, { loading: true, error: null })
      try {
        const updated = await incrementCounter(name)
        setCounters(prev =>
          prev.map(c => (c.name === name ? { ...c, value: updated.value } : c)),
        )
        setRow(name, { loading: false, error: null })
      } catch (err) {
        setRow(name, { loading: false, error: mapCounterError(err as ApiError, name) })
      }
    },
    [],
  )

  const handleReset = useCallback(
    async (name: string) => {
      setRow(name, { loading: true, error: null })
      try {
        await resetCounter(name)
        setCounters(prev => prev.filter(c => c.name !== name))
        setRowState(prev => {
          const next = { ...prev }
          delete next[name]
          return next
        })
      } catch (err) {
        setRow(name, { loading: false, error: mapCounterError(err as ApiError, name) })
      }
    },
    [],
  )

  const handleAdd = useCallback(async () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    const validationError = validateName(trimmed)
    if (validationError) {
      setAddError(validationError)
      return
    }
    setAddLoading(true)
    setAddError(null)
    try {
      const result = await incrementCounter(trimmed)
      setCounters(prev => {
        const existing = prev.find(c => c.name === trimmed)
        if (existing) {
          return prev.map(c => (c.name === trimmed ? { ...c, value: result.value } : c))
        }
        return [...prev, { name: result.name, value: result.value }].sort((a, b) =>
          a.name.localeCompare(b.name),
        )
      })
      setNewName('')
    } catch (err) {
      setAddError(mapCounterError(err as ApiError, trimmed))
    } finally {
      setAddLoading(false)
    }
  }, [newName])

  const isAddDisabled = newName.trim() === '' || addLoading

  return (
    <section className={styles.widget} aria-labelledby="counter-widget-heading">
      <h3 id="counter-widget-heading" className={styles.widgetTitle}>
        Counters
      </h3>

      {/* Counter list */}
      {listLoading && (
        <p className={styles.loading} role="status" aria-live="polite">
          Loading counters…
        </p>
      )}

      {listError && (
        <p className={styles.error} role="alert" aria-live="assertive">
          {listError}
        </p>
      )}

      {!listLoading && !listError && (
        <>
          {counters.length === 0 ? (
            <p className={counterStyles.emptyState} aria-live="polite">
              No counters yet. Add one below.
            </p>
          ) : (
            <ul className={counterStyles.counterList} aria-label="Counter list">
              {counters.map(counter => {
                const row = rowState[counter.name] ?? { loading: false, error: null }
                return (
                  <li key={counter.name} className={counterStyles.counterRow}>
                    <span className={counterStyles.counterName}>{counter.name}</span>
                    <span className={counterStyles.counterValue} aria-label={`${counter.name} value`}>
                      {counter.value}
                    </span>

                    {row.loading && (
                      <span className={counterStyles.rowLoading} aria-live="polite">…</span>
                    )}

                    <button
                      onClick={() => void handleIncrement(counter.name)}
                      disabled={row.loading}
                      className={styles.btn}
                      aria-label={`Increment ${counter.name}`}
                    >
                      Increment
                    </button>
                    <button
                      onClick={() => void handleReset(counter.name)}
                      disabled={row.loading}
                      className={counterStyles.btnReset}
                      aria-label={`Reset ${counter.name}`}
                    >
                      Reset
                    </button>

                    {row.error && (
                      <span
                        className={counterStyles.rowError}
                        role="alert"
                        aria-live="assertive"
                      >
                        {row.error}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}

      {/* Add new counter */}
      <div className={counterStyles.addRow}>
        <label htmlFor="counter-name-input" className={styles.label}>
          Add counter
        </label>
        <div className={counterStyles.addInputGroup}>
          <input
            id="counter-name-input"
            type="text"
            value={newName}
            onChange={e => {
              setNewName(e.target.value)
              setAddError(null)
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !isAddDisabled) void handleAdd()
            }}
            placeholder="Counter name"
            className={styles.input}
            aria-label="Counter name"
            disabled={addLoading}
          />
          <button
            onClick={() => void handleAdd()}
            disabled={isAddDisabled}
            className={styles.btn}
            aria-label="Add and increment counter"
          >
            Add &amp; Increment
          </button>
        </div>

        {addLoading && (
          <p className={styles.loading} role="status" aria-live="polite">
            Adding…
          </p>
        )}

        {addError && (
          <p className={styles.error} role="alert" aria-live="assertive">
            {addError}
          </p>
        )}
      </div>
    </section>
  )
}

export default CounterWidget
