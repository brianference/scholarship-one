import { useState } from 'react'
import { getTheme, toggleTheme, type Theme } from '../theme'

/** Header control for light/dark. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getTheme)
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label="Toggle light and dark mode"
      onClick={() => setTheme(toggleTheme())}
    >
      {theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  )
}
