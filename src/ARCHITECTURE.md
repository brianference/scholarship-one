# Architecture

```
src/
  App.tsx                 # routes only
  config/site.ts          # marketing + nav config
  pages/                  # route screens
  components/             # shared chrome (Shell, Hero, ChatDock)
  features/matcher/       # domain UI for scholarships
  lib/                    # pure helpers (scoring, storage)
  data/catalog.ts         # dataset
```

Update checklist:
1. Copy → `config/site.ts`
2. Dataset → `data/catalog.ts`
3. Matching rules → `lib/scoring.ts`
4. Matcher UI → `features/matcher/*`
5. New route → `pages/*` + register in `App.tsx`
