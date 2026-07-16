# Testing hard rules (Scholarship One)

## Hard rule

**Every meaningful change requires at least 10× more verification than a single happy path.**

Minimum before claiming “fixed” or “done”:

1. `npm run build` — must pass  
2. `npm run qa` — full suite must pass  
3. `npm run qa:onboarding` — onboarding → results guarantees (multi-pass)  
4. `npm run qa:match` — catalog scenario matches  
5. Manual path: complete onboarding → URL is `/results` → list visible at **scroll top** → suggested cards present  
6. Manual path: header search → `/results`  
7. Manual path: nav to `/digest`, `/pipeline`, `/path`, `/activity` (real routes, not scroll)  
8. Deploy: prod asset hash matches local `dist`  
9. Health: `/api/health` returns ok  
10. Re-run `qa` + `qa:onboarding` once more after deploy (regression)

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run qa` | 10 test types, 100×3 user sims, stress, a11y, security |
| `npm run qa:onboarding` | 10 passes × profile matrix for onboarding exit |
| `npm run qa:match` | Catalog keyword scenarios |
| `npm run qa:hard` | All of the above in sequence (required gate) |
| `npm run qa:cases` | **145** explicit test cases (architecture, routes, match, CSS, security) |
| `npm run qa:visual` | Playwright mobile (390) + desktop (1440) screenshots + onboarding E2E |
| `npm run qa:full` | build + cases + hard + visual (use before “done”) |

## Onboarding exit contract

After **Show my matches**:

- `showOnboarding === false`
- navigate to **`/results`**
- `window.scrollY === 0` (ScrollToTop + rAF)
- `categoryId === 'all'` (do not trap in empty state filter)
- `onlyAi === false` and `onlyShort === false`
- `pinnedIds.length >= 1` for non-empty profile signals
- `ranked.length >= 1` on Results page
- Banner shows “Your results” + counts

## Do not claim fixed without

- Script output attached / green  
- Prod hash match  
- At least one real browser path for onboarding (or automated equivalent)
