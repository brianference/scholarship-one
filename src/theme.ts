/** Theme persistence for light/dark (`data-theme` on documentElement). Peach linen is the only light palette. */

const THEME_KEY = 'scholarship-theme'

export type Theme = 'light' | 'dark'

/** Read saved theme or default to light. */
export function getTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark') return saved
    const legacy = localStorage.getItem('portfolio-theme')
    if (legacy === 'light' || legacy === 'dark') return legacy
  } catch {
    /* private mode */
  }
  return 'light'
}

/** Apply theme before React paints. Always locks peach linen design. */
export function initTheme(): Theme {
  const theme = getTheme()
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.setAttribute('data-design', 'peach')
  try {
    localStorage.removeItem('scholarship-design')
  } catch {
    /* ignore */
  }
  return theme
}

/** Flip and persist light/dark. */
export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', next)
  document.documentElement.setAttribute('data-design', 'peach')
  try {
    localStorage.setItem(THEME_KEY, next)
  } catch {
    /* ignore */
  }
  return next
}
