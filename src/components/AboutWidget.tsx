import { useEffect, useState } from 'react'
import { fetchVersion } from '../api/versionClient'
import styles from './Widget.module.css'
import aboutStyles from './AboutWidget.module.css'

interface ServiceInfo {
  name: string
  version: string
  gitUrl: string
  status: 'ok' | 'error' | 'loading'
  errorMessage?: string
}

function AboutWidget() {
  // Read env vars inside the component so tests can stub them
  const frontendVersion =
    (import.meta.env.VITE_FRONTEND_VERSION as string | undefined) ?? '(unknown)'
  const frontendGitUrl =
    (import.meta.env.VITE_FRONTEND_GIT_URL as string | undefined) ??
    'https://github.com/ika100/e2e-frontend'
  const greetingBaseUrl =
    (import.meta.env.VITE_GREETING_SERVICE_URL as string | undefined) ?? ''
  const counterBaseUrl =
    (import.meta.env.VITE_COUNTER_SERVICE_URL as string | undefined) ?? ''

  const [services, setServices] = useState<ServiceInfo[]>([
    { name: 'greeting-service', version: '', gitUrl: '', status: 'loading' },
    { name: 'counter-service', version: '', gitUrl: '', status: 'loading' },
    {
      name: 'frontend',
      version: frontendVersion,
      gitUrl: frontendGitUrl,
      status: 'ok',
    },
  ])

  useEffect(() => {
    void Promise.allSettled([
      fetchVersion(greetingBaseUrl),
      fetchVersion(counterBaseUrl),
    ]).then(([greetingResult, counterResult]) => {
      setServices(prev => {
        const next = [...prev]

        // greeting-service (index 0)
        if (greetingResult.status === 'fulfilled') {
          next[0] = {
            name: 'greeting-service',
            version: greetingResult.value.version,
            gitUrl: greetingResult.value.gitUrl,
            status: 'ok',
          }
        } else {
          const err = greetingResult.reason as { type?: string; message?: string }
          let msg = 'Unavailable'
          if (err?.type === 'timeout') {
            msg = 'Request timed out'
          } else if (err?.message) {
            msg = err.message
          }
          next[0] = {
            name: 'greeting-service',
            version: 'error',
            gitUrl: 'https://github.com/ika100/e2e-greeting-service',
            status: 'error',
            errorMessage: msg,
          }
        }

        // counter-service (index 1)
        if (counterResult.status === 'fulfilled') {
          next[1] = {
            name: 'counter-service',
            version: counterResult.value.version,
            gitUrl: counterResult.value.gitUrl,
            status: 'ok',
          }
        } else {
          const err = counterResult.reason as { type?: string; message?: string }
          let msg = 'Unavailable'
          if (err?.type === 'timeout') {
            msg = 'Request timed out'
          } else if (err?.message) {
            msg = err.message
          }
          next[1] = {
            name: 'counter-service',
            version: 'error',
            gitUrl: 'https://github.com/ika100/e2e-counter-service',
            status: 'error',
            errorMessage: msg,
          }
        }

        return next
      })
    })
  }, [greetingBaseUrl, counterBaseUrl])

  const isLoading = services.some(s => s.status === 'loading')

  return (
    <section className={styles.widget} aria-labelledby="about-widget-heading">
      <h3 id="about-widget-heading" className={styles.widgetTitle}>
        Platform Services
      </h3>

      {isLoading && (
        <p
          className={styles.loading}
          role="status"
          aria-live="polite"
          data-testid="about-loading"
        >
          Loading…
        </p>
      )}

      {!isLoading && (
        <table className={aboutStyles.table}>
          <thead>
            <tr>
              <th scope="col">Service</th>
              <th scope="col">Version</th>
              <th scope="col">Repository</th>
            </tr>
          </thead>
          <tbody>
            {services.map(svc => (
              <tr key={svc.name}>
                <td>{svc.name}</td>
                <td>
                  {svc.status === 'error' ? (
                    <span className={styles.error} data-testid={`error-${svc.name}`}>
                      {svc.errorMessage ?? 'Unavailable'}
                    </span>
                  ) : (
                    svc.version
                  )}
                </td>
                <td>
                  {svc.gitUrl && (
                    <a
                      href={svc.gitUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`GitHub repository for ${svc.name}`}
                    >
                      GitHub
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

export default AboutWidget
