import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { SkipLink } from './components/SkipLink'
// styles.css last: the legacy sheet still owns layout for un-ported components,
// so it must win over Tailwind's base reset until the migration finishes.
import './tailwind.css'
import './styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root mount node')

createRoot(root).render(
  <StrictMode>
    <SkipLink />
    <App />
  </StrictMode>,
)
