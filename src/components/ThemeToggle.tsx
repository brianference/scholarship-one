import { useState } from 'react'
import { getTheme, toggleTheme, type Theme } from '../theme'

/** Header control for light/dark (default is light). */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getTheme)
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(toggleTheme())}
    >
      {theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  )
}
