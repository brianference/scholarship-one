# Scholarship sources & product improvements

Merged ideas from:

- `projects/scholarship-hunt` (master plan + quick start)
- [`brianference/lena-scholarships`](https://github.com/brianference/lena-scholarships) (dashboard + `data/scholarships.json`)

## Category depth model

Lena-scholarships showed that **one focus (accounting) needs ~40 dedicated awards**, not 5 generic ones. Scholarship One now uses the same idea **per browse category**:

| Category | Target depth | Approach |
|----------|--------------|----------|
| Accounting / CPA | ~30 | Firms, CPA societies, EFWA/AFWA, PCAOB |
| STEM & math | ~30 | NASA, NSF S-STEM, IEEE, ASME, ASCE, SWE, Google |
| Nursing | ~20 | NSNA, NLN, NURSE Corps, Tylenol, specialty nursing |
| Disability | ~20 | NFB, AG Bell, ChairScholars, condition-specific |
| Black students | ~25 | CBCF, NAACP, UNCF hub, Divine Nine, Urban League |
| Hispanic / Latino | ~20 | HACU, CHCI, HSF, SHPE, ALPFA, TELACU |
| Women | ~25 | AAUW, Patsy Mink, Soroptimist, Forté, SWE |
| First-gen | ~15 | QuestBridge, Posse, Scholarship America Dream |
| High school | ~40 | Equitable, Heisman HS, Foot Locker, NHS, Rotary |
| No essay / portals | ~40 | Niche, Bold, Scholarships360, Sallie, Going Merry |
| State / need | 30+ | Existing state grants + FAFSA/CSS gateways |

Run `npx tsx scripts/count-cats.ts` for live counts.

---

## From lena-scholarships (dashboard features to keep / mirror)

| Feature in lena-scholarships | Scholarship One |
|------------------------------|-----------------|
| Explicit student eligibility (`womenInAccounting`, `minority: false`) | Profile Background + major gates; never show HSF when minority false |
| Priority HIGH / MEDIUM / LOW | Matches ranking (score × urgency × field) |
| Effort score + “Quick wins” | **No essay / quick** category + no-essay tags |
| Filter chips: Women, Big 4, ASU/AZ, No essay | Results categories: Women, Accounting/CPA, Business, State, No essay |
| Applied toggle | **Tracker** (Saved → Interested → Started → Submitted) |
| Deadline timeline view | **Deadlines** page + .ics export |
| Amount + eligibilityMatch | Match score + amount filters |
| 40 accounting-focused awards | Catalog expanded with firm, EFWA, AFWA, PCAOB, RSM, no-essay portals, AZ funds |

### Student profile rules (lena `eligibility`)

```json
"meritBased": true,
"womenInAccounting": true,
"lowIncome": false,
"firstGen": false,
"minority": false
```

→ In Scholarship One: set **Major = Accounting**, **Background = Women**, leave minority/Hispanic unset so identity-locked awards (HSF, ALPFA, NABA, Ascend) stay hidden.

---

## Ten discovery approaches

| # | Approach | Catalog / product support |
|---|----------|---------------------------|
| 1 | Major pro associations | AICPA, IMA, EFWA, AFWA, ACFE, NSA, IIA |
| 2 | State CPA societies | ASCPA women + general AZ CPA |
| 3 | Big 4 / national firms | Deloitte, PwC, EY, KPMG, Moss Adams, CLA, RSM |
| 4 | Women in profession | EFWA, AFWA, Forté, ASCPA women, AAUW |
| 5 | Campus / college offices | ASU scholarships, Furst Honors W. P. Carey |
| 6 | No-essay micro awards | Niche, Bold Be Bold, Scholarships360, Sallie Easy Apply |
| 7 | State community foundations | Arizona Community Foundation (multi-fund app) |
| 8 | Public finance / gov accounting | AGA, GFOA, PCAOB Scholars |
| 9 | Honor societies | Beta Alpha Psi |
| 10 | Batch portals | Bold.org, Going Merry, Scholarships.com |

---

## Matching integrity (still enforced)

- **Min display score 32** — no Match 0 rows on Matches  
- **Identity lockout** — Hispanic/Black/Asian/etc. only if Background matches  
- **Marketing ≠ accounting** — AMA Foundation does not rank for accounting majors  
- **Senior-entry lockout** — HS-only contests hidden for undergrads  

---

## Still optional (from lena UI, not required)

- Dedicated “effort 1–5” field on every award (we use `no-essay` + portal tags)  
- Visual timeline calendar component (Deadlines + ICS cover most of this)  
- Hard-coded student name profile — Scholarship One stays multi-user via local profile  
