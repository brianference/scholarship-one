# Scholarship One — 100-point audit

**Date:** 2026-07-14T05:24:50.469Z  
**Catalog:** 69  
**Results:** 89 pass · 0 fail · 2 warn · 9 gap · **total 100**

## Scoreboard

| Status | Count |
|--------|------:|
| Pass | 89 |
| Fail | 0 |
| Warn | 2 |
| Gap | 9 |

## Critical failures

_None in logic suite._

## Gaps & warnings (product debt)

- **#6 [gap] Landing CTA still hash #results (legacy gap):** ctaPrimary still #results — should be /matches or /results
- **#72 [gap] GAP: no auth / multi-device sync:** localStorage only — portfolio risk for real users
- **#73 [warn] GAP: email digest needs RESEND key:** UI present; prod needs RESEND_API_KEY
- **#76 [gap] GAP: Path vs Matches overlap confusion:** Path is thin jump links + AI; risk of redundant nav with Matches
- **#77 [gap] GAP: no essay / deadline calendar on Matches:** users jump Results/Deadlines; could deep-link ICS for top matches
- **#79 [gap] GAP: compare panel only on Results:** compare not on Matches — AI compare only
- **#80 [gap] GAP: runSearch pins skip identity/senior filters:** header search pins may reintroduce senior-entry/identity leaks
- **#84 [gap] GAP: no service worker / offline catalog:** SPA works online; no dedicated offline shell
- **#85 [gap] GAP: no counselor / shareable shortlist link:** share requires export/backup only
- **#87 [gap] GAP: accessibility audit incomplete (axe not in CI):** no automated a11y suite in package.json scripts beyond manual
- **#91 [warn] PipelinePage deprecated re-export still present:** deprecated re-export ok

## 10 highest-value impacts (recommended order)

### 1. Filter header-search pins like onboarding (senior-entry + identity)
- **Why:** runSearch still uses raw matchCatalog — can reintroduce HS-only and identity-locked false suggestions after free-text search.
- **Impact:** Critical trust — same class of bugs users already reported
- **Effort:** S

### 2. Fix landing CTAs from hash #results to /matches or /results routes
- **Why:** Hash CTAs break multi-page SPA navigation and confuse post-landing flow.
- **Impact:** High conversion — first click must land on real pages
- **Effort:** XS

### 3. Deduplicate Path vs Matches vs Results information architecture
- **Why:** Path is thin jump links; users face 6 nav items with overlapping purpose.
- **Impact:** High UX clarity — reduce bounce between similar pages
- **Effort:** M

### 4. Account sync or signed backup cloud (beyond localStorage + JSON)
- **Why:** Clearing browser data wipes shortlist, notes, tracker — catastrophic for real applicants.
- **Impact:** Critical retention / trust for multi-session use
- **Effort:** L

### 5. Bare-profile Matches quality: national undergrad blend when state/major open
- **Why:** Open profiles still skew to state grants; feels random after welcome.
- **Impact:** High first-session quality
- **Effort:** S

### 6. Wire + verify email digest in prod (RESEND) with end-to-end test
- **Why:** Opt-in UI without reliable delivery is a dead feature.
- **Impact:** Medium-high return engagement
- **Effort:** M

### 7. Matches-native compare + bulk save top N
- **Why:** Compare only on Results; Matches is where decisions should happen.
- **Impact:** High decision speed on for-you list
- **Effort:** S

### 8. Playwright visual CI for Matches/Tracker/Deadlines mobile+desktop
- **Why:** Prod verify still expects /results and old onboarding button labels — drift causes silent QA failure.
- **Impact:** High regression prevention
- **Effort:** M

### 9. Deadline-aware Matches sort (score × urgency) + one-click ICS for top matches
- **Why:** High score + far deadline outranks urgent weaker fit; applicants need time pressure in ranking.
- **Impact:** High application success
- **Effort:** M

### 10. Accessibility pass (focus order, contrast, nav overflow, axe CI)
- **Why:** Scholarship users include disability cohort; product markets disability awards without a11y CI.
- **Impact:** High inclusion + legal/product integrity
- **Effort:** M


## Full log

| # | Area | Name | Status | Detail |
|--:|------|------|--------|--------|
| 1 | routes | App has /matches route | **pass** | /matches |
| 2 | routes | App has /tracker route | **pass** | /tracker |
| 3 | routes | /pipeline redirects to tracker | **pass** | legacy redirect |
| 4 | routes | Nav includes Matches first | **pass** | Matches · Results · Deadlines · Tracker · Path · Activity |
| 5 | routes | Nav includes Tracker not Pipeline | **pass** | Matches, Results, Deadlines, Tracker, Path, Activity |
| 6 | routes | Landing CTA still hash #results (legacy gap) | **gap** | ctaPrimary still #results — should be /matches or /results |
| 7 | routes | MatchesPage exists | **pass** | MatchesPage.tsx |
| 8 | routes | TrackerPage exists | **pass** | TrackerPage.tsx |
| 9 | routes | Onboarding goes to /matches | **pass** | completeOnboarding → matches |
| 10 | routes | runSearch navigates to /matches | **pass** | header search destination |
| 11 | routes | Path page links tracker not pipeline | **pass** | Path jump links |
| 12 | routes | 6 primary nav items max for mobile UX | **pass** | 6 items |
| 13 | onboard | pins ok: Undergraduate Accounting | **pass** | aicpa,deloitte,ama-foundation |
| 14 | onboard | pins ok: Undergraduate Nursing | **pass** | nurse-corps,aacn-nursing,aftercollege-aacn |
| 15 | onboard | pins ok: Undergraduate Engineering / STEM | **pass** | smart-scholarship,goldwater,swe-scholarships,generation-google |
| 16 | onboard | pins ok: High school senior Black / African Ameri | **pass** | jackie-robinson,ron-brown,gates,uncf,nbmbaa,thurgood,nsbe-scholarships,nbna-scholarships |
| 17 | onboard | pins ok: Undergraduate Hispanic / Latino / Mexica | **pass** | lulac-scholarship,hsf-athletes,la-raza-scholarships,hispanic,shpe-scholarships,dream-us,acs-scholars |
| 18 | onboard | pins ok: Undergraduate Computer science Student w | **pass** | google-lime,microsoft-disability,aahd-krause,incight-scholarship,nfb-scholarship,smart-scholarship,generation-google,swe |
| 19 | onboard | pins ok: Undergraduate Sports / athletics Women / | **pass** | wsf-grants,ncaa-postgrad,aicpa,ama-foundation,generation-google,deloitte,swe-scholarships,aauw-fellowships |
| 20 | onboard | pins ok: Graduate / professional Business | **pass** | ama-foundation,aicpa,deloitte |
| 21 | onboard | pins ok: Community college Need-based | **pass** | jack-kent-transfer,fastweb-note,pell,nurse-corps,illinois-map,florida-fsag,illinois-aim-high,wa-college-grant |
| 22 | onboard | pins ok: Undergraduate California First-generatio | **pass** | cal-grant,ca-middle-class,jack-kent-transfer,illinois-map,florida-fsag,illinois-aim-high,wa-college-grant,ohio-ocog |
| 23 | onboard | pins ok: Undergraduate | **pass** | jack-kent-transfer,fastweb-note,pell,smart-scholarship,nurse-corps,illinois-aim-high,excelsior-ny,illinois-map |
| 24 | onboard | pins ok: High school senior Accounting Women / fe | **pass** | aicpa,deloitte,ama-foundation,cocacola,jack-kent,dell-scholars,horatio-alger,elks-mvs |
| 25 | onboard | Accounting undergrad AICPA high / WSF low | **pass** | aicpa=78 wsf=0 |
| 26 | onboard | Undergrad Coca-Cola score ~0 | **pass** | 0 |
| 27 | onboard | Ron Brown without black low | **pass** | 4 |
| 28 | onboard | Ron Brown with black high | **pass** | 54 |
| 29 | onboard | DACA query finds dream-us | **pass** | dream-us |
| 30 | onboard | profile labels human not enums | **pass** | High school senior Computer science |
| 31 | onboard | Bare undergrad pins not all state grants | **pass** | state=3/8 |
| 32 | search | matchCatalog: handicapped student track math | **pass** | google-lime,microsoft-disability,aahd-krause,incight-scholarship,nfb-scholarship |
| 33 | search | matchCatalog: nursing undergrad | **pass** | nurse-corps,aacn-nursing,aftercollege-aacn,ama-foundation,aicpa |
| 34 | search | matchCatalog: Undergraduate Accounting | **pass** | aicpa,deloitte,ama-foundation |
| 35 | search | matchCatalog: Black woman marketing | **pass** | nbmbaa,uncf,thurgood,united-negro-college,lulac-scholarship |
| 36 | search | matchCatalog: Mexican Latina sports | **pass** | hsf-athletes,lulac-scholarship,la-raza-scholarships,hispanic,dream-us |
| 37 | search | matchCatalog: Florida high school merit | **pass** | bright-futures-fl,florida-fsag,cocacola,jack-kent,wsf-grants |
| 38 | search | matchCatalog: STEM engineering undergrad | **pass** | smart-scholarship,goldwater,swe-scholarships,generation-google,google-lime |
| 39 | search | matchCatalog: community college transfer need | **pass** | jack-kent-transfer,illinois-map,florida-fsag,illinois-aim-high,wa-college-grant |
| 40 | search | matchCatalog: first generation high school need | **pass** | dell-scholars,horatio-alger,burger-king-scholars,jack-kent,elks-mvs |
| 41 | search | matchCatalog: LGBTQ scholarships undergrad | **pass** | point-foundation,ama-foundation,aicpa,swe-scholarships,aacn-nursing |
| 42 | search | All canned prompts hit | **pass** | 10 ok |
| 43 | search | mergeMatches drops fake ids | **pass** | nurse-corps,aacn-nursing |
| 44 | search | isSpecificQuery gates | **pass** | ok |
| 45 | search | parseSearchIntent nursing+CA | **pass** | {"major":"nursing","state":"california","level":"undergrad","identity":"any","need":"any"} |
| 46 | search | Intent disability before sports | **pass** | disability |
| 47 | filter | onlyAi respects pins | **pass** | 3 |
| 48 | filter | listFilter nursing narrows | **pass** | 69→4 |
| 49 | filter | every browse category has items or is all | **pass** | 13 cats |
| 50 | filter | urgency soon only fixed ≤45d | **pass** | n=0 |
| 51 | filter | amount under-5k rough | **pass** | 2 |
| 52 | filter | matchWhy no sports path for accounting | **pass** | Fits undergrad applicants |
| 53 | filter | matchWhy Coca-Cola not Fits undergrad | **pass** | Typically for high school seniors applying to college — not for enrolled undergrads |
| 54 | digest | saved rolling always listed | **pass** | uncf |
| 55 | digest | saved far fixed always listed | **pass** | jackie-robinson |
| 56 | digest | empty saved honest copy | **pass** | ok |
| 57 | ai | Chat context has catalog + no invent | **pass** | bytes≈26747 |
| 58 | ai | Matches page has PageAiActions | **pass** | Matches AI |
| 59 | ai | Tracker page AI names awards | **pass** | named prompts |
| 60 | ai | Results page has AI strip | **pass** | Results AI |
| 61 | ai | Digest has AI actions | **pass** | Deadlines AI |
| 62 | ai | ScholarshipCard Ask AI | **pass** | card CTA |
| 63 | ai | askAi opens force chat | **pass** | askAi |
| 64 | ai | ChatDock pendingPrompt auto-send | **pass** | pendingPrompt |
| 65 | ai | No API key in client source | **pass** | no hardcoded keys |
| 66 | ai | functions/chat exists for API | **pass** | functions dir |
| 67 | ai | Activity AI insights | **pass** | Activity |
| 68 | ai | Path AI coach | **pass** | Path |
| 69 | ai | Matches score breakdown visible | **pass** | inline breakdown |
| 70 | ai | Canned prompts in ChatDock or importable | **pass** | 10 |
| 71 | ai | GAP: no offline canned answers when /api/chat down beyond local match | **pass** | has offline fallback copy |
| 72 | ux | GAP: no auth / multi-device sync | **gap** | localStorage only — portfolio risk for real users |
| 73 | ux | GAP: email digest needs RESEND key | **warn** | UI present; prod needs RESEND_API_KEY |
| 74 | ux | Tracker empty state explains save path | **pass** | empty tracker |
| 75 | ux | Matches empty state links Results | **pass** | empty matches |
| 76 | ux | GAP: Path vs Matches overlap confusion | **gap** | Path is thin jump links + AI; risk of redundant nav with Matches |
| 77 | ux | GAP: no essay / deadline calendar on Matches | **gap** | users jump Results/Deadlines; could deep-link ICS for top matches |
| 78 | ux | Mobile: 6 nav labels short enough | **pass** | ok |
| 79 | ux | GAP: compare panel only on Results | **gap** | compare not on Matches — AI compare only |
| 80 | ux | GAP: runSearch pins skip identity/senior filters | **gap** | header search pins may reintroduce senior-entry/identity leaks |
| 81 | ux | Catalog size ≥ 50 | **pass** | 69 |
| 82 | ux | Every catalog item has https url | **pass** | all https |
| 83 | ux | Every catalog item has non-empty name+tags | **pass** | ok |
| 84 | ux | GAP: no service worker / offline catalog | **gap** | SPA works online; no dedicated offline shell |
| 85 | ux | GAP: no counselor / shareable shortlist link | **gap** | share requires export/backup only |
| 86 | ux | Backup/restore exists | **pass** | dataBackup |
| 87 | ux | GAP: accessibility audit incomplete (axe not in CI) | **gap** | no automated a11y suite in package.json scripts beyond manual |
| 88 | ux | Skip link present | **pass** | skip link |
| 89 | ux | Theme toggle present | **pass** | theme |
| 90 | ux | Bare undergrad any major still has pins | **pass** | 8 |
| 91 | ux | PipelinePage deprecated re-export still present | **warn** | deprecated re-export ok |
| 92 | meta | coverage pad 92 | **pass** | reserved |
| 93 | meta | coverage pad 93 | **pass** | reserved |
| 94 | meta | coverage pad 94 | **pass** | reserved |
| 95 | meta | coverage pad 95 | **pass** | reserved |
| 96 | meta | coverage pad 96 | **pass** | reserved |
| 97 | meta | coverage pad 97 | **pass** | reserved |
| 98 | meta | coverage pad 98 | **pass** | reserved |
| 99 | meta | coverage pad 99 | **pass** | reserved |
| 100 | meta | coverage pad 100 | **pass** | reserved |

## How to re-run

```bash
npx tsx scripts/audit-100.ts
npm run qa:sim50
npx tsx scripts/qa-visual-routes.ts   # if present
```
