import { useState, useEffect, useCallback } from 'react'
import { listCounters, incrementCounter, resetCounter } from '../api/counterClient'
import type { ApiError } from '../api/apiClient'
import styles from './CounterWidget.module.css'

interface Counter {
  name: string
  value: number
}

interface RowState {
  loading: boolean
  error: string | null
}

function mapError(err: unknown): string {
  const e = err as ApiError
  if (e.type === 'timeout') return 'Request timed out. Please try again.'
  if (e.type === 'network') return 'Could not reach the counter service. Please try again.'
  const msg = e.message ?? ''
  if (msg.includes('429')) return 'Too many requests. Please wait a moment and try again.'
  if (/HTTP 5\d\d/.test(msg)) return 'The counter service encountered an error. Please try again later.'
  return msg
}

const NAME_PATTERN = /^[a-zA-Z0-9_-]+$/

function validateName(name: string): string | null {
  if (name.length > 100) return 'Counter name must not exceed 100 characters.'
  if (!NAME_PATTERN.test(name)) {
    return 'Counter name may only contain letters, digits, hyphens, and underscores.'
  }
  return null
}

function CounterWidget() {
  const [counters, setCounters] = useState<Counter[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({})

  // Add-form state
  const [newName, setNewName] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [addLoading, setAddLoading] = useState(false)

  const fetchList = useCallback(async () => {
    setListLoading(true)
    setListError(null)
    try {
      const data = await listCounters()
      setCounters(data.counters)
    } catch (err) {
      setListError(mapError(err))
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  const handleIncrement = useCallback(async (name: string) => {
    setRowStates(prev => ({ ...prev, [name]: { loading: true, error: null } }))
    try {
      const updated = await incrementCounter(name)
      setCounters(prev => prev.map(c => (c.name === name ? { ...c, value: updated.value } : c)))
      setRowStates(prev => ({ ...prev, [name]: { loading: false, error: null } }))
    } catch (err) {
      setRowStates(prev => ({ ...prev, [name]: { loading: false, error: mapError(err) } }))
    }
  }, [])

  const handleReset = useCallback(async (name: string) => {
    setRowStates(prev => ({ ...prev, [name]: { loading: true, error: null } }))
    try {
      await resetCounter(name)
      setCounters(prev => prev.filter(c => c.name !== name))
      setRowStates(prev => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    } catch (err) {
      setRowStates(prev => ({ ...prev, [name]: { loading: false, error: mapError(err) } }))
    }
  }, [])

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
      const updated = await incrementCounter(trimmed)
      setCounters(prev => {
        const existing = prev.find(c => c.name === trimmed)
        if (existing) {
          return prev.map(c => (c.name === trimmed ? { ...c, value: updated.value } : c))
        }
        return [...prev, { name: updated.name, value: updated.value }]
      })
      setNewName('')
    } catch (err) {
      setAddError(mapError(err))
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

      {listLoading && (
        <p className={styles.loading} role="status" aria-live="polite">
          Loading…
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
            <p className={styles.emptyState}>No counters yet. Add one below.</p>
          ) : (
            <ul className={styles.list} aria-label="Counter list">
              {counters.map(counter => {
                const rs = rowStates[counter.name]
                const rowLoading = rs?.loading ?? false
                const rowError = rs?.error ?? null
                return (
                  <li key={counter.name} className={styles.row}>
                    <span className={styles.rowName}>{counter.name}</span>
                    <span className={styles.rowValue} aria-label={`${counter.name} value`}>
                      {rowLoading ? '…' : counter.value}
                    </span>
                    <button
                      className={styles.btn}
                      onClick={() => void handleIncrement(counter.name)}
                      disabled={rowLoading}
                      aria-label={`Increment ${counter.name}`}
                    >
                      Increment
                    </button>
                    <button
                      className={styles.resetBtn}
                      onClick={() => void handleReset(counter.name)}
                      disabled={rowLoading}
                      aria-label={`Reset ${counter.name}`}
                    >
                      Reset
                    </button>
                    {rowError && (
                      <span className={styles.rowError} role="alert">
                        {rowError}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}

      <div className={styles.addForm} aria-label="Add counter form">
        <input
          id="new-counter-name"
          type="text"
          className={styles.input}
          placeholder="Counter name"
          value={newName}
          onChange={e => {
            setNewName(e.target.value)
            setAddError(null)
          }}
          disabled={addLoading}
          aria-label="New counter name"
        />
        <button
          className={styles.btn}
          onClick={() => void handleAdd()}
          disabled={isAddDisabled}
          aria-label="Add & Increment"
        >
          Add &amp; Increment
        </button>
        {addError && (
          <span className={styles.inputError} role="alert">
            {addError}
          </span>
        )}
      </div>
    </section>
  )
}

export default CounterWidget
