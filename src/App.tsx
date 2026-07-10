import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Routes, Route, Link, NavLink } from 'react-router-dom'
import './styles.css'
import { initTheme, toggleTheme, getTheme } from './theme'
import { ChatDock } from './ChatDock'
import { seedContext } from './seedContext'
import { CATALOG } from './data'

const FEATURES = [
  { t: 'Grounded catalog', d: 'Only real, named scholarship programs with public URLs — the AI cannot invent awards.' },
  { t: 'Profile-aware match', d: 'Major, state, and level re-rank the list with a transparent score.' },
  { t: 'Deadline urgency', d: 'See what is overdue, due soon, or rolling so you always know the next apply.' },
  { t: 'Shortlist', d: 'Save programs on-device — no account required.' },
  { t: 'Essay coach chat', d: 'Ask how to frame an essay; answers stay tied to the catalog.' },
  { t: 'TypeScript + CF Pages', d: 'Strict client, Cloudflare deploy, secrets server-side for chat.' },
]
const INTEGRATIONS = [
  { t: 'OpenAI', d: 'Match & essay coaching from your profile + real catalog' },
  { t: 'College Board / FAFSA links', d: 'Official application paths, never scraped fakes' },
  { t: 'Local shortlist', d: 'Progress in your browser — no account required' },
  { t: 'Cloudflare Pages', d: 'Public product URL with Functions chat' },
]
const RECRUITER = [
  'Product thinking: constraint-based AI (no hallucinated scholarships)',
  'Full-stack: Vite/React/TS + Cloudflare Pages Functions',
  'UX: ranked list, urgency chips, shortlist, accessible targets',
  'Integrations: OpenAI Chat Completions with server-side key',
]
const QUICK = [
  'Supabase shortlist sync',
  'ICS export for deadlines',
  'Essay draft grounded on selected program only',
  'More regional scholarships from official .edu pages',
]

const SHORTLIST_KEY = 'scholarship-one-shortlist'
const PROFILE_KEY = 'scholarship-one-profile'

type Profile = { major: string; state: string; level: string }

function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (raw) return JSON.parse(raw) as Profile
  } catch {
    /* ignore */
  }
  return { major: 'accounting', state: 'any', level: 'undergrad' }
}

function loadShortlist(): string[] {
  try {
    const raw = localStorage.getItem(SHORTLIST_KEY)
    if (raw) return JSON.parse(raw) as string[]
  } catch {
    /* ignore */
  }
  return []
}

function urgency(deadline: string): { label: string; tone: string } {
  if (/fafsa|cycle|varies|rolling/i.test(deadline)) return { label: 'Rolling / cycle', tone: 'chip-muted' }
  const d = Date.parse(deadline)
  if (Number.isNaN(d)) return { label: deadline, tone: 'chip-muted' }
  const days = Math.ceil((d - Date.now()) / 86400000)
  if (days < 0) return { label: 'Deadline passed', tone: 'chip-danger' }
  if (days <= 14) return { label: `Due in ${days}d`, tone: 'chip-warn' }
  if (days <= 45) return { label: `Due in ${days}d`, tone: 'chip-ok' }
  return { label: deadline, tone: 'chip-muted' }
}

function scoreItem(tags: readonly string[], profile: Profile): number {
  let score = 40
  const t = tags.map((x) => x.toLowerCase())
  if (profile.major && t.some((x) => x.includes(profile.major.toLowerCase()) || profile.major.toLowerCase().includes(x))) score += 30
  if (profile.level === 'high-school' && t.includes('high-school')) score += 15
  if (profile.level === 'undergrad' && (t.includes('merit') || t.includes('accounting') || t.includes('business'))) score += 10
  if (profile.state !== 'any' && t.some((x) => x.includes(profile.state.toLowerCase()))) score += 15
  if (t.includes('federal') || t.includes('required')) score += 5
  return Math.min(100, score)
}

function ThemeToggle() {
  const [theme, setTheme] = useState(getTheme())
  return (
    <button type="button" className="theme-toggle" aria-label="Toggle theme" onClick={() => setTheme(toggleTheme())}>
      {theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false)
  return (
    <div className={`shell${chatOpen ? ' shell--chat' : ''}`}>
      <header className="topbar">
        <Link to="/" className="brand">
          Scholarship One
        </Link>
        <nav className="nav" aria-label="Primary">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/app">App</NavLink>
          <NavLink to="/features">Features</NavLink>
        </nav>
        <ThemeToggle />
      </header>
      <main>{children}</main>
      <ChatDock open={chatOpen} onOpenChange={setChatOpen} context={seedContext()} product="scholarship-one" />
      <footer className="footer">
        <p>
          Scholarship One · grounded matching ·{' '}
          <a href="https://github.com/brianference/scholarship-one" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </p>
        <p className="fine">No invented awards. Official links only. Stack: Vite + React + Cloudflare Pages.</p>
      </footer>
    </div>
  )
}

function Home() {
  return (
    <Shell>
      <section className="hero">
        <p className="kicker">Scholarship One · real programs, ranked for you</p>
        <h1>Find real scholarships. Match smart. Apply with a plan.</h1>
        <p className="lede">
          Profile-aware ranking over a grounded catalog of real programs — deadlines, shortlist, and an assistant that
          cannot invent awards.
        </p>
        <div className="cta-row">
          <Link className="btn btn-primary" to="/app">
            Open matcher
          </Link>
          <Link className="btn btn-ghost" to="/features">
            Features
          </Link>
        </div>
        <ul className="hero-points">
          <li>Match scores</li>
          <li>Urgency chips</li>
          <li>Shortlist</li>
          <li>Light & dark</li>
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
    </Shell>
  )
}

function FeaturesPage() {
  return (
    <Shell>
      <section className="panel">
        <h1>Features</h1>
        <div className="grid-2">
          {FEATURES.map((f) => (
            <article key={f.t} className="card">
              <h3>{f.t}</h3>
              <p>{f.d}</p>
            </article>
          ))}
        </div>
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
      <section className="panel subtle">
        <h2>Engineering signals</h2>
        <ul className="check-list">
          {RECRUITER.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>
      <section className="panel">
        <h2>Next</h2>
        <ul className="check-list">
          {QUICK.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
      </section>
    </Shell>
  )
}

function ProductApp() {
  const [q, setQ] = useState('')
  const [tag, setTag] = useState('all')
  const [profile, setProfile] = useState<Profile>(loadProfile)
  const [shortlist, setShortlist] = useState<string[]>(loadShortlist)
  const [onlyShort, setOnlyShort] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
    } catch {
      /* ignore */
    }
  }, [profile])
  useEffect(() => {
    try {
      localStorage.setItem(SHORTLIST_KEY, JSON.stringify(shortlist))
    } catch {
      /* ignore */
    }
  }, [shortlist])

  const tags = useMemo(() => {
    const s = new Set<string>()
    CATALOG.forEach((c) => c.tags.forEach((t) => s.add(t)))
    return ['all', ...Array.from(s).sort()]
  }, [])

  const ranked = useMemo(() => {
    return CATALOG.map((c) => ({ ...c, score: scoreItem(c.tags, profile), urg: urgency(c.deadline) }))
      .filter((c) => {
        const okTag = tag === 'all' || c.tags.includes(tag)
        const okQ = !q || (c.name + c.summary).toLowerCase().includes(q.toLowerCase())
        const okShort = !onlyShort || shortlist.includes(c.id)
        return okTag && okQ && okShort
      })
      .sort((a, b) => b.score - a.score)
  }, [q, tag, profile, onlyShort, shortlist])

  function toggleShort(id: string) {
    setShortlist((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  return (
    <section className="panel">
      <h1>Scholarship matcher</h1>
      <p className="lede">Ranked from your profile. Every program has an official URL — nothing invented.</p>

      <div className="card profile-strip">
        <h2 className="h2-tight">Your profile</h2>
        <div className="filters">
          <label className="field">
            <span>Major / focus</span>
            <select value={profile.major} onChange={(e) => setProfile({ ...profile, major: e.target.value })} aria-label="Major">
              <option value="accounting">Accounting</option>
              <option value="business">Business</option>
              <option value="engineering">Engineering</option>
              <option value="any">Any / undecided</option>
            </select>
          </label>
          <label className="field">
            <span>Level</span>
            <select value={profile.level} onChange={(e) => setProfile({ ...profile, level: e.target.value })} aria-label="Level">
              <option value="high-school">High school</option>
              <option value="undergrad">Undergrad</option>
              <option value="grad">Grad</option>
            </select>
          </label>
          <label className="field">
            <span>State focus</span>
            <select value={profile.state} onChange={(e) => setProfile({ ...profile, state: e.target.value })} aria-label="State">
              <option value="any">Any</option>
              <option value="arizona">Arizona</option>
              <option value="california">California</option>
              <option value="texas">Texas</option>
            </select>
          </label>
        </div>
      </div>

      <div className="filters">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search programs…" aria-label="Search" />
        <select value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Tag">
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <label className="check-inline">
          <input type="checkbox" checked={onlyShort} onChange={(e) => setOnlyShort(e.target.checked)} />
          Shortlist only ({shortlist.length})
        </label>
      </div>

      {onlyShort && shortlist.length === 0 && (
        <p className="lede empty-hint">Your shortlist is empty — star a program to save it on this device.</p>
      )}

      <div className="list">
        {ranked.map((c) => (
          <article key={c.id} className="card row-card">
            <div className="grow">
              <div className="chips">
                <span className={`chip ${c.urg.tone}`}>{c.urg.label}</span>
                {c.tags.slice(0, 3).map((t) => (
                  <span key={t} className="chip">
                    {t}
                  </span>
                ))}
              </div>
              <h3>{c.name}</h3>
              <p>{c.summary}</p>
              <p className="meta">
                {c.amount} · Match <strong>{c.score}</strong>
              </p>
              <div className="score-bar" aria-hidden="true">
                <span style={{ width: `${c.score}%` }} />
              </div>
            </div>
            <div className="btn-col">
              <button type="button" className="btn btn-ghost" onClick={() => toggleShort(c.id)}>
                {shortlist.includes(c.id) ? '★ Saved' : '☆ Shortlist'}
              </button>
              <a className="btn btn-primary" href={c.url} target="_blank" rel="noreferrer">
                Official site
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function AppPage() {
  return (
    <Shell>
      <ProductApp />
    </Shell>
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
