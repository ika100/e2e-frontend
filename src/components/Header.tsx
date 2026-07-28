import { Link, useLocation } from 'wouter'
import styles from './Header.module.css'

function Header() {
  const [location] = useLocation()

  return (
    <header className={styles.header} role="banner">
      <div className={styles.inner}>
        <span className={styles.brand} aria-label="e2e-platform home">
          e2e-platform
        </span>
        <nav aria-label="Main navigation">
          <ul className={styles.navList}>
            <li>
              <Link
                href="/"
                aria-current={location === '/' ? 'page' : undefined}
                className={
                  location === '/'
                    ? `${styles.navLink} ${styles.active}`
                    : styles.navLink
                }
              >
                Greeting
              </Link>
            </li>
            <li>
              <Link
                href="/counter"
                aria-current={location === '/counter' ? 'page' : undefined}
                className={
                  location === '/counter'
                    ? `${styles.navLink} ${styles.active}`
                    : styles.navLink
                }
              >
                Counter
              </Link>
            </li>
            <li>
              <Link
                href="/about"
                aria-current={location === '/about' ? 'page' : undefined}
                className={
                  location === '/about'
                    ? `${styles.navLink} ${styles.active}`
                    : styles.navLink
                }
              >
                About
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}

export default Header
