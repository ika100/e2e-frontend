import { useEffect } from 'react'
import { Switch, Route } from 'wouter'
import ErrorBoundary from './components/ErrorBoundary'
import Header from './components/Header'
import NotFound from './components/NotFound'
import GreetingWidget from './components/GreetingWidget'
import CounterWidget from './components/CounterWidget'
import AboutWidget from './components/AboutWidget'
import './App.css'

function GreetingPage() {
  return (
    <main className="page" aria-labelledby="greeting-heading">
      <h2 id="greeting-heading">Greeting</h2>
      <GreetingWidget />
    </main>
  )
}

function CounterPage() {
  return (
    <main className="page" aria-labelledby="counter-heading">
      <h2 id="counter-heading">Counter</h2>
      <CounterWidget />
    </main>
  )
}

function AboutPage() {
  return (
    <main className="page" aria-labelledby="about-heading">
      <h2 id="about-heading">About</h2>
      <AboutWidget />
    </main>
  )
}

function App() {
  useEffect(() => {
    document.title = 'e2e-platform'
  }, [])

  return (
    <ErrorBoundary>
      <div className="app-layout">
        <Header />
        <Switch>
          <Route path="/" component={GreetingPage} />
          <Route path="/counter" component={CounterPage} />
          <Route path="/about" component={AboutPage} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </ErrorBoundary>
  )
}

export default App
