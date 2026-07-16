# Architecture

```
src/
  App.tsx                      # routes only
  state/ScholarshipContext.tsx # shared multi-page state
  components/
    layout/AppLayout.tsx       # Shell + Outlet
    Shell.tsx                  # chrome + header search + chat
  pages/                       # one file per route (no monolith)
    LandingPage.tsx            # /
    ResultsPage.tsx            # /results
    DigestPage.tsx             # /digest
    PipelinePage.tsx           # /pipeline
    PathPage.tsx               # /path
    ActivityPage.tsx           # /activity
  features/matcher/            # scholarship list UI pieces
  lib/                         # pure helpers (scoring, catalogQuery, storage)
  data/catalog.ts              # grounded awards only
  config/site.ts               # copy + nav routes
```

## Rules

1. **Navigation = routes**, not in-page scroll/hash for primary IA.
2. **Pages stay thin** — read/write via `useScholarship()`, no duplicated storage.
3. **New feature UI** → `features/` or `components/`; wire state in `ScholarshipContext` only if shared.
4. **New route** → `pages/X.tsx` + register in `App.tsx` + `config/site.ts` nav if needed.
5. **Matching / ranking** → `lib/catalogQuery.ts` + `lib/matchCatalog.ts` (no React).

## Routes

| Path | Page | Purpose |
|------|------|---------|
| `/` | LandingPage | How it works + examples |
| `/results` | ResultsPage | Ranked list + filters + profile |
| `/digest` | DigestPage | Weekly deadline digest |
| `/pipeline` | PipelinePage | Application status board |
| `/path` | PathPage | Progress strip + jump links |
| `/activity` | ActivityPage | Local analytics |
