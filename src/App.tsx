import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { initTheme } from './theme'
import { siteConfig } from './config/site'
import { HomePage } from './pages/HomePage'
import { FeaturesPage } from './pages/FeaturesPage'
import { ProductPage } from './pages/ProductPage'

/**
 * Route table only — product UI lives under pages/ and features/.
 */
export default function App() {
  useEffect(() => {
    initTheme()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage config={siteConfig} />} />
        <Route path="/app" element={<ProductPage config={siteConfig} />} />
        <Route path="/features" element={<FeaturesPage config={siteConfig} />} />
      </Routes>
    </BrowserRouter>
  )
}
