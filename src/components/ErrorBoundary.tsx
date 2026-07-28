import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            padding: '2rem',
            textAlign: 'center',
            maxWidth: '600px',
            margin: '4rem auto',
          }}
        >
          <h2>Something went wrong</h2>
          <p style={{ marginTop: '1rem', color: '#666' }}>
            An unexpected error occurred. Please try reloading the page.
          </p>
          {this.state.error && (
            <details style={{ marginTop: '1rem', textAlign: 'left' }}>
              <summary>Error details</summary>
              <pre
                style={{
                  padding: '1rem',
                  background: '#f5f5f5',
                  overflow: 'auto',
                  fontSize: '0.8rem',
                  marginTop: '0.5rem',
                }}
              >
                {this.state.error.message}
              </pre>
            </details>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1.5rem',
              padding: '0.6rem 1.5rem',
              fontSize: '1rem',
              background: '#646cff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
            }}
            aria-label="Reload the page"
          >
            Reload
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
