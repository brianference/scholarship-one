const KEY = 'portfolio-theme'

export type Theme = 'light' | 'dark'

export function getTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY)
    if (t === 'light' || t === 'dark') return t
  } catch {
    /* ignore */
  }
  return 'dark'
}

export function initTheme(): Theme {
  const t = getTheme()
  document.documentElement.setAttribute('data-theme', t)
  return t
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', next)
  try {
    localStorage.setItem(KEY, next)
  } catch {
    /* ignore */
  }
  return next
}
