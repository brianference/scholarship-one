/** Theme persistence for light/dark mode (`data-theme` on documentElement). */
const STORAGE_KEY = 'portfolio-theme'

export type Theme = 'light' | 'dark'

/** Read saved theme or default to dark. */
export function getTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    /* private mode */
  }
  return 'dark'
}

/** Apply theme before React paints consumers. */
export function initTheme(): Theme {
  const theme = getTheme()
  document.documentElement.setAttribute('data-theme', theme)
  return theme
}

/** Flip and persist theme. */
export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', next)
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    /* ignore */
  }
  return next
}
