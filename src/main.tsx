import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { SkipLink } from './components/SkipLink'
// tailwind.css imports styles.css itself, into the `legacy` cascade layer.
// Importing it separately here would land it unlayered and beat every Tailwind
// utility again.
import './tailwind.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root mount node')

createRoot(root).render(
  <StrictMode>
    <SkipLink />
    <App />
  </StrictMode>,
)
