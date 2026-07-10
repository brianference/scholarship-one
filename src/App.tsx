import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Routes, Route, Link, NavLink } from 'react-router-dom'
import './styles.css'
import { initTheme, toggleTheme, getTheme } from './theme'
import { ChatDock } from './ChatDock'
import { seedContext } from './seedContext'
import { CATALOG } from './data'

const FEATURES = [{"t": "Grounded catalog", "d": "Only real, named scholarship programs with public URLs \u2014 the AI cannot invent awards."}, {"t": "Profile-aware match", "d": "Major, state, GPA band, and first-gen flags re-rank the list."}, {"t": "Deadline spine", "d": "Urgent vs stretch tiers so you always know what to do next."}, {"t": "Essay coach chat", "d": "Ask how to frame an essay; answers stay tied to the selected program."}, {"t": "TypeScript + tests-ready", "d": "Strict client, Zod-ready shapes, Cloudflare Pages deploy."}, {"t": "Privacy-first", "d": "No login. Profile stays on-device unless you export it."}] as { t: string; d: string }[]
const INTEGRATIONS = [{"t": "OpenAI", "d": "Match & essay coaching from your profile + real catalog"}, {"t": "College Board / FAFSA links", "d": "Official application paths, never scraped fakes"}, {"t": "Calendar export", "d": "ICS reminders for deadlines"}, {"t": "Local save", "d": "Progress in your browser \u2014 no account required"}] as { t: string; d: string }[]
const RECRUITER = ["Product thinking: constraint-based AI (no hallucinated scholarships)", "Full-stack: Vite/React/TS + Cloudflare Pages Functions", "UX: mobile-first planner, light/dark, accessible targets", "Integrations: OpenAI Chat Completions with server-side key"] as string[]
const QUICK = ["Add more regional scholarships from official .edu pages", "PDF export of application checklist", "Multi-profile (siblings) with localStorage namespaces", "Email digest via Resend when deadlines are <14 days"] as string[]

function ThemeToggle() {
  const [theme, setTheme] = useState(getTheme())
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

function Shell({ children }: { children: React.ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false)
  return (
    <div className={`shell${chatOpen ? ' shell--chat' : ''}`}>
      <header className="topbar">
        <Link to="/" className="brand">Scholarship One</Link>
        <nav className="nav" aria-label="Primary">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/app">App</NavLink>
          <NavLink to="/features">Features</NavLink>
        </nav>
        <ThemeToggle />
      </header>
      <main>{children}</main>
      <ChatDock open={chatOpen} onOpenChange={setChatOpen} context={seedContext()} product="scholarship-one" />
      <footer className="footer">
        <p>
          Scholarship One · public portfolio product ·{' '}
          <a href="https://github.com/brianference/scholarship-one" target="_blank" rel="noreferrer">GitHub</a>
        </p>
        <p className="fine">Built for real use and for hiring conversations — stack, constraints, and integrations included.</p>
      </footer>
    </div>
  )
}

function Home() {
  return (
    <Shell>
      <section className="hero">
        <p className="kicker">Scholarship One · grounded matching, not random lists</p>
        <h1>Find real scholarships. Match smart. Apply with a plan.</h1>
        <p className="lede">Public AI scholarship matcher: real programs, deadline tracking, essay guidance, and a grounded assistant — no invented awards.</p>
        <div className="cta-row">
          <Link className="btn btn-primary" to="/app">Open the app</Link>
          <Link className="btn btn-ghost" to="/features">See features</Link>
        </div>
        <ul className="hero-points">
          <li>Light & dark mode</li>
          <li>Grounded AI chat</li>
          <li>No account required</li>
          <li>Cloudflare Pages ready</li>
        </ul>
      </section>
      <section className="grid-3">
        {FEATURES.slice(0, 3).map((f) => (
          <article key={f.t} className="card">
            <h3>{f.t}</h3>
            <p>{f.d}</p>
          </article>
        ))}
      </section>
      <section className="panel">
        <h2>Integrations</h2>
        <div className="grid-2">
          {INTEGRATIONS.map((i) => (
            <div key={i.t} className="card card-slim">
              <h3>{i.t}</h3>
              <p>{i.d}</p>
            </div>
          ))}
        </div>
      </section>
    </Shell>
  )
}

function FeaturesPage() {
  return (
    <Shell>
      <section className="panel">
        <h1>Features</h1>
        <p className="lede">Product depth first — the same signals recruiters and technical founders look for.</p>
        <div className="grid-2">
          {FEATURES.map((f) => (
            <article key={f.t} className="card">
              <h3>{f.t}</h3>
              <p>{f.d}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="panel subtle">
        <h2>Engineering signals</h2>
        <ul className="check-list">
          {RECRUITER.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>
      <section className="panel">
        <h2>Quick wins next</h2>
        <ul className="check-list">
          {QUICK.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
      </section>
    </Shell>
  )
}

function AppPage() {
  return (
    <Shell>
      <ProductApp />
    </Shell>
  )
}


function ProductApp() {
  const [q, setQ] = useState('')
  const [tag, setTag] = useState('all')
  const tags = useMemo(() => {
    const s = new Set<string>()
    CATALOG.forEach((c) => c.tags.forEach((t) => s.add(t)))
    return ['all', ...Array.from(s).sort()]
  }, [])
  const rows = CATALOG.filter((c) => {
    const okTag = tag === 'all' || (c.tags as readonly string[]).includes(tag)
    const okQ = !q || (c.name + c.summary).toLowerCase().includes(q.toLowerCase())
    return okTag && okQ
  })
  return (
    <section className="panel">
      <h1>Scholarship matcher</h1>
      <p className="lede">Filter a grounded catalog of real programs. Chat can only recommend from this list.</p>
      <div className="filters">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search programs…" aria-label="Search" />
        <select value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Tag filter">
          {tags.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="list">
        {rows.map((c) => (
          <article key={c.id} className="card row-card">
            <div>
              <h3>{c.name}</h3>
              <p>{c.summary}</p>
              <p className="meta"><span>{c.amount}</span> · <span>Deadline {c.deadline}</span></p>
              <div className="chips">{c.tags.map((t) => <span key={t} className="chip">{t}</span>)}</div>
            </div>
            <a className="btn btn-ghost" href={c.url} target="_blank" rel="noreferrer">Official site</a>
          </article>
        ))}
      </div>
    </section>
  )
}


export default function App() {
  useEffect(() => {
    initTheme()
  }, [])
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/app" element={<AppPage />} />
        <Route path="/features" element={<FeaturesPage />} />
      </Routes>
    </BrowserRouter>
  )
}
