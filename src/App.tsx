/**
 * App entry routes only — no page logic here.
 */
import { useEffect } from 'react'
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import { initTheme } from './theme'
import { ScholarshipProvider } from './state/ScholarshipContext'
import { AccountProvider } from './state/account'
import { ToastProvider } from './components/ui/Toast'
import { AppLayout } from './components/layout/AppLayout'
import { ScrollToTop } from './components/ScrollToTop'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { LandingPage } from './pages/LandingPage'
import { ResultsPage } from './pages/ResultsPage'
import { MatchesPage } from './pages/MatchesPage'
import { DigestPage } from './pages/DigestPage'
import { TrackerPage } from './pages/TrackerPage'
import { PathPage } from './pages/PathPage'
import { ActivityPage } from './pages/ActivityPage'
import { ImportPage } from './pages/ImportPage'
import RegisterPage from './pages/auth/RegisterPage'
import LoginPage from './pages/auth/LoginPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import AboutPage from './pages/legal/AboutPage'
import TermsPage from './pages/legal/TermsPage'
import PrivacyPage from './pages/legal/PrivacyPage'
import ContactPage from './pages/legal/ContactPage'
import { ScholarshipDetailPage } from './pages/ScholarshipDetailPage'

export default function App() {
  useEffect(() => {
    initTheme()
  }, [])

  return (
    <BrowserRouter>
      <AccountProvider>
        <ToastProvider>
          <ScholarshipProvider>
            <ScrollToTop />
            <Routes>
              {/* Auth screens stand outside AppLayout: they are single-purpose
                  and deliberately free of the app chrome. */}
              <Route path="/auth" element={<AuthCallbackPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset" element={<ResetPasswordPage />} />

              <Route element={<AppLayout />}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/matches" element={<MatchesPage />} />
                <Route path="/results" element={<ResultsPage />} />
                <Route path="/digest" element={<DigestPage />} />
                <Route path="/tracker" element={<TrackerPage />} />
                <Route path="/path" element={<PathPage />} />
                <Route path="/activity" element={<ActivityPage />} />
                <Route path="/import" element={<ImportPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/scholarship/:id" element={<ScholarshipDetailPage />} />
              </Route>

              {/* Renames / legacy paths */}
              <Route path="/pipeline" element={<Navigate to="/tracker" replace />} />
              <Route path="/app" element={<Navigate to="/matches" replace />} />
              <Route path="/features" element={<Navigate to="/" replace />} />
              <Route path="/matcher" element={<Navigate to="/matches" replace />} />
              <Route path="/signin" element={<Navigate to="/login" replace />} />
              <Route path="/sign-up" element={<Navigate to="/register" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ScholarshipProvider>
        </ToastProvider>
      </AccountProvider>
    </BrowserRouter>
  )
}
