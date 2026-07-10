import { useEffect } from 'react'
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import { initTheme } from './theme'
import { siteConfig } from './config/site'
import { HomePage } from './pages/HomePage'

/**
 * Single-page app. Legacy /app and /features routes redirect home.
 */
export default function App() {
  useEffect(() => {
    initTheme()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage config={siteConfig} />} />
        <Route path="/app" element={<Navigate to="/#results" replace />} />
        <Route path="/features" element={<Navigate to="/#how-it-works" replace />} />
        <Route path="/matcher" element={<Navigate to="/#results" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
