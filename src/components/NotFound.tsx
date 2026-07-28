import { Link } from 'wouter'

function NotFound() {
  return (
    <main
      style={{ padding: '4rem 1rem', textAlign: 'center' }}
      aria-labelledby="not-found-heading"
    >
      <h1 id="not-found-heading">Not Found</h1>
      <p style={{ marginTop: '1rem', color: '#666' }}>
        The page you were looking for does not exist.
      </p>
      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/" aria-label="Go to home page">
          ← Back to home
        </Link>
      </p>
    </main>
  )
}

export default NotFound
