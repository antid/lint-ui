import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import './index.css'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import Pricing from './pages/Pricing'

function App() {
  const [_isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Simulate loading fonts and data
    const timer = setTimeout(() => {
      setIsReady(true)
      document.body.setAttribute('data-ui-ready', 'true')
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  return (
    <BrowserRouter>
      <div className="app">
        <nav className="nav">
          <div className="nav-brand">Lint UI Demo</div>
          <div className="nav-links">
            <Link to="/">Home</Link>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/settings">Settings</Link>
            <Link to="/pricing">Pricing</Link>
          </div>
        </nav>

        <main className="main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/pricing" element={<Pricing />} />
          </Routes>
        </main>

        <footer className="footer">
          <p>© 2026 Lint UI. Testing in progress.</p>
        </footer>
      </div>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
