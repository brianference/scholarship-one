/**
 * Scroll window to top on every pathname change (SPA best practice).
 */
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    // Also reset main content if it scrolls independently later
    const main = document.getElementById('main-content')
    if (main) main.scrollTop = 0
  }, [pathname])

  return null
}
