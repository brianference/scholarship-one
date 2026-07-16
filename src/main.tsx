import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { SkipLink } from './components/SkipLink'
import './styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root mount node')

createRoot(root).render(
  <StrictMode>
    <SkipLink />
    <App />
  </StrictMode>,
)
