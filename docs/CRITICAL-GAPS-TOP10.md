# Critical gaps & top 10 impacts — implementation status

**Updated:** 2026-07-14  
**Prod:** `index-DwryPoY8.js` · https://scholarship-one.pages.dev  
**Prod verify:** ALL OK (desktop + mobile)

---

## Implementation checklist

| # | Impact | Status | Notes |
|---|--------|--------|-------|
| 1 | Filter header-search pins like onboarding | **Done** | `pinsFromFreeTextSearch` + `pinFilter.ts` |
| 2 | Matches ranking: major × urgency; demote state when open | **Done** | `matchRanking.ts` · selectTopMatches |
| 3 | Landing CTAs → `/matches` | **Done** | siteConfig + HowItWorks route Links |
| 4 | Collapse IA: Path out of primary nav | **Done** | Path/Activity under **More** |
| 5 | Mobile More menu | **Done** | Shell More dropdown + single-row scroll nav |
| 6 | Matches bulk Save top 3 + Compare top 3 | **Done** | + compare panel on Matches |
| 7 | Shareable shortlist / restore link | **Done** | `sharePack.ts` · Copy share link · `/import` |
| 8 | Deadline-aware Matches sort | **Done** | urgency boost in matchRankScore |
| 9 | Email digest status + health probe | **Done** | Activity digest panel · `/api/health` capabilities · still needs `RESEND_API_KEY` on CF for live send |
| 10 | Playwright prod verify updated | **Done** | `qa-prod-verify.mjs` Matches-first · `npm run qa:prod` |

### Critical gaps

| Gap | Status |
|-----|--------|
| Header search pin leaks | Fixed |
| Matches state-grant flood | Fixed (ranking demote) |
| Hash CTAs | Fixed |
| 6-item nav wrap | Fixed (4 primary + More) |
| localStorage-only | Mitigated via share URL pack (no server) |
| Email without RESEND | Status UI + health flag; configure key for live mail |
| Shareable shortlist | Share link pack |
| a11y CI | Partial: skip/focus main, 44px menus; full axe CI still optional |
| QA drift | Prod verify updated |

---

## How to verify

```bash
npm run build
npm run qa:sim50
npm run qa:prod
curl -s https://scholarship-one.pages.dev/api/health
```

To enable live email digests, set Cloudflare Pages secret `RESEND_API_KEY` (and optional `DIGEST_FROM_EMAIL`). Health will show `"digestEmail": true`.
