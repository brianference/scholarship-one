/**
 * App entry routes only — no page logic here.
 */
import { useEffect } from 'react'
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import { initTheme } from './theme'
import { ScholarshipProvider } from './state/ScholarshipContext'
import { AppLayout } from './components/layout/AppLayout'
import { ScrollToTop } from './components/ScrollToTop'
import { LandingPage } from './pages/LandingPage'
import { ResultsPage } from './pages/ResultsPage'
import { MatchesPage } from './pages/MatchesPage'
import { DigestPage } from './pages/DigestPage'
import { TrackerPage } from './pages/TrackerPage'
import { PathPage } from './pages/PathPage'
import { ActivityPage } from './pages/ActivityPage'
import { ImportPage } from './pages/ImportPage'

export default function App() {
  useEffect(() => {
    initTheme()
  }, [])

  return (
    <BrowserRouter>
      <ScholarshipProvider>
        <ScrollToTop />
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/matches" element={<MatchesPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/digest" element={<DigestPage />} />
            <Route path="/tracker" element={<TrackerPage />} />
            <Route path="/path" element={<PathPage />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/import" element={<ImportPage />} />
          </Route>
          {/* Renames / legacy paths */}
          <Route path="/pipeline" element={<Navigate to="/tracker" replace />} />
          <Route path="/app" element={<Navigate to="/matches" replace />} />
          <Route path="/features" element={<Navigate to="/" replace />} />
          <Route path="/matcher" element={<Navigate to="/matches" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ScholarshipProvider>
    </BrowserRouter>
  )
}
