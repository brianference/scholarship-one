# Scholarship One — 50 journey simulations

**Date:** 2026-07-16T06:51:37.165Z
**Catalog size:** 209
**Results:** 50 pass · 0 bug · 0 warn · 0 learn notes

## Summary

| Status | Count |
|--------|------:|
| Pass | 50 |
| Bug | 0 |
| Warn | 0 |
| Total sims | 50 |

## Bugs

_No hard bugs asserted in this run._


## Warnings (soft failures / product polish)

_None._


## Full simulation log

| # | Cat | Name | Status | Detail |
|--:|-----|------|--------|--------|
| 1 | onboarding | Undergrad + accounting only — no senior-entry pins | **pass** | pins=aicpa,deloitte,efwa-women-accounting,pwc-scholarships,ey-access-potential,kpmg-future-leaders,ima-scholarships,acfe-ritchie-jennings |
| 2 | onboarding | Undergrad + accounting — WSF sports score low | **pass** | WSF=0 |
| 3 | onboarding | Undergrad without Black identity — Ron Brown not suggested/strong | **pass** | rb=0 pins=8 |
| 4 | onboarding | HS + Black — Ron Brown strong + pinned | **pass** | rb=54 pins=jackie-robinson,ron-brown,ron-brown-extra,jack-and-jill,gates,uncf,nbmbaa,thurgood |
| 5 | onboarding | HS + women + accounting — no sports field false match | **pass** | wsf=6 aicpa=74 |
| 6 | onboarding | Undergrad does not pin Coca-Cola / Dell / Elks | **pass** | pins=jack-kent-transfer,first-gen-scholars-network,asu-scholarships-office,nsf-s-stem,patsy-mink,scholarship-america-first,css-profile-note, |
| 7 | onboarding | Grad student — HS senior entry low | **pass** | cocacola=0 |
| 8 | onboarding | Community college — transfer awards preferred over senior entry | **pass** | pins=jack-kent-transfer,njcaa-athletics,asu-scholarships-office,nsf-s-stem,css-profile-note,fastweb-note,pell,nurse-corps |
| 9 | onboarding | California undergrad first-gen need — Cal Grant ranked | **pass** | cal=82 pins=cal-grant,ca-middle-class,jack-kent-transfer,first-gen-scholars-network,csac-first-gen,illinois-map,florida-fsag,illinois-aim-hi |
| 10 | onboarding | Hispanic undergrad — Hispanic pins, not Ron Brown | **pass** | hispanicPins=lulac-scholarship,hsf-athletes,la-raza-scholarships,mexican-american-legal,hispanic,shpe-scholarships,dream-us,alpfa-scholarshi |
| 11 | onboarding | Disability undergrad — disability awards pin | **pass** | dis=google-lime,microsoft-disability,microsoft-scholarship,aahd-krause,incight-scholarship,aapt-disability,mobility-international,chairschol |
| 12 | onboarding | Sports major + women — WSF can rank well | **pass** | wsf=92 |
| 13 | onboarding | Nursing undergrad — nursing not STEM-only noise | **pass** | nurse=nurse-corps,aacn-nursing,aftercollege-aacn,nln-foundation,nsna-scholarships,aanp-scholarships,oncology-nursing,tylenol-future-care |
| 14 | onboarding | profileToSearchText uses human labels not raw enums | **pass** | High school senior Computer science Black / African American |
| 15 | onboarding | Empty-ish undergrad any/any still gets non-empty pins | **pass** | count=8 jack-kent-transfer,scholarships-com-portal,asu-scholarships-office,nsf-s-stem,daughters-american-nursing,women-of-the-elca,nasa-spac |
| 16 | search | Header: handicapped student track math → disability hits | **pass** | google-lime,microsoft-scholarship,special-olympics-athlete,adaptive-sports-usa,microsoft-disability,aahd-krause,incight-scholarship,nfb-scho |
| 17 | search | Undergraduate Accounting — no WSF / senior-entry top | **pass** | aicpa:47, deloitte:47, ascpa-women:47, efwa-women-accounting:47, pwc-scholarships:47, ey-access-potential:47, kpmg-future-leaders:47, ima-sc |
| 18 | search | Nursing undergrad query tops nursing awards | **pass** | aacn-nursing,aftercollege-aacn,nln-foundation,nsna-scholarships,oncology-nursing |
| 19 | search | Mexican Latina sports — sports/hispanic present | **pass** | hsf-athletes,ncaa-ethnic-minority,lulac-scholarship,la-raza-scholarships,dream-us,hispanic,hispanic-scholarship-fund-extra,wsf-grants |
| 20 | search | Black woman marketing — business/black present | **pass** | black=5 biz=4 |
| 21 | search | DACA query hits dream-us or undoc tags | **pass** | hispanic-scholarship-directory,dream-us |
| 22 | search | Vague query isSpecificQuery false | **pass** | specificity gates ok |
| 23 | search | parseSearchIntent sets nursing major + category | **pass** | {"major":"nursing","state":"california","level":"undergrad","identity":"any","need":"any"} cat=nursing |
| 24 | search | parseSearchIntent disability + track prefers disability category | **pass** | cat=disability id=disability |
| 25 | search | STEM search does not top pure nursing without stem tags | **pass** | swe-scholarships,nasa-space-grant,nsf-s-stem,ieee-scholarships,asme-scholarships,asce-scholarships |
| 26 | search | State: Florida bright futures appears for Florida query | **pass** | bright-futures-fl,florida-fsag,tsa-stem,wrestler-scholarships,girls-who-code,questbridge,sam-walton-community,local-rotary-hs |
| 27 | search | Token spam does not invent non-catalog ids | **pass** | hits=0 all catalog |
| 28 | search | mergeMatches keeps catalog-only union | **pass** | nurse-corps,aacn-nursing,aftercollege-aacn |
| 29 | search | All canned prompts produce ≥1 catalog hit | **pass** | 10 canned prompts ok |
| 30 | search | applyChipToProfile Accounting chip sets major | **pass** | accounting set |
| 31 | filter | onlyAi shows only pinned ids | **pass** | rows=8 |
| 32 | filter | listFilter nursing narrows results | **pass** | 209→18 |
| 33 | filter | category nursing matches nursing tags | **pass** | n=20 |
| 34 | filter | amount bucket under-5k excludes huge awards when parseable | **pass** | under-5k count=12 |
| 35 | filter | onlyShort respects shortlist | **pass** | aicpa,deloitte |
| 36 | filter | sort by deadline puts fixed dates before far rolling preference | **pass** | n=209 first=gates |
| 37 | filter | urgency soon only fixed ≤45 days | **pass** | soon count=0 |
| 38 | filter | matchWhy never claims sports pathway for accounting | **pass** | Fits undergrad applicants |
| 39 | filter | matchWhy undergrad does not say Fits undergrad for Coca-Cola | **pass** | Typically for high school seniors applying to college — not for enrolled undergrads |
| 40 | filter | Pinned rows sort above non-pinned at same score band | **pass** | first=aicpa |
| 41 | ai | Chat context includes full catalog + profile | **pass** | ctx bytes≈74624 |
| 42 | ai | Canned STEM prompt matchCatalog grounded | **pass** | nasa-space-grant,ieee-scholarships,asce-scholarships,aiche-scholarships,sae-scholarships |
| 43 | ai | Page AI style: deadline prioritize prompt reaches chat (not only local match gate) | **pass** | chat-context ok; local isSpecificQuery=false (chat does not require it) |
| 44 | ai | Card Ask AI prompt names a real catalog award | **pass** | card prompt grounded |
| 45 | ai | Closest-fit message honest for sports gaps | **pass** | We may not have an exact match for sports-only awards. Here are the closest programs from our list. Save any that help,  |
| 46 | ai | Preview message never invents award names | **pass** | Here are programs that look like a good fit. Save any you want to keep, or refine your search. |
| 47 | ai | Pipeline coach stats align with empty pipeline zeros | **pass** | I have 0 saved: 0 not started, 0 interested, 0 started, 0 submitted. |
| 48 | ai | Activity insights prompt includes analytic placeholders safely | **pass** | stats: 0 searches, 0 saves. Top: none. |
| 49 | digest | Saved rolling + far-date awards always in digest.savedItems | **pass** | jackie-robinson:fixed, uncf:rolling |
| 50 | digest | Cross-flow: onboard accounting → save AICPA → digest lists it | **pass** | saved=aicpa pins=aicpa,deloitte,efwa-women-accounting,pwc-scholarships,ey-access-potential,kpmg-future-leaders,ima-scholarships,acfe-ritchie |

## Learnings

1. School level, major field, and identity each need hard negative gates — bonuses alone let weak signals (base fit + level) look like 50%+ matches.
2. `all-majors` and dual `high-school`+`undergrad` tags historically meant "funds college," not "current undergrads apply." Senior-entry detection is required.
3. Onboarding pins use matchCatalog keyword scores, then profile filters. Filtering after match can empty pins — score-based fallback is required for bare undergrad walkthroughs.
4. Identity-locked awards (Black, Hispanic, DACA, disability, LGBTQ, military, AANHPI) must not pin when Background is "No preference."
5. AI page actions and card prompts are only as good as local grounding (catalog + profile). Chat context already ships full catalog JSON with a no-invent rule.
6. Digest must list all saved IDs regardless of 7-day fixed window; rolling/far awards were a prior production bug.
7. parseSearchIntent + applyChipToProfile are the bridge from free text to filters; multi-signal queries rely on category hint order (disability before sports/STEM).
8. Canned prompts cover core personas; empty matchCatalog results on a canned prompt is a product regression.
9. onlyAi / pinned suggested mode is how onboarding changes the left column — pin quality is the whole welcome experience.
10. State grants (Cal Grant, etc.) correctly remain undergrad-eligible even with high-school tags because they renew in college.
11. This sim run: zero hard assertion bugs on current scoring/pin/search/digest stack after recent identity + senior-entry fixes.

## Scenario coverage map

| Area | Sim IDs | Intent |
|------|---------|--------|
| Onboarding welcome | 1–15 | Level/major/identity/state pins + score gates |
| Search / intent | 16–30 | Header queries, canned prompts, chips, merge |
| Filters / results | 31–40 | onlyAi, listFilter, category, amount, urgency, why |
| AI interactions | 41–48 | Chat context, page/card prompts, closest-fit honesty |
| Digest + cross-page | 49–50 | Saved always listed; onboard→save→digest |

## Recommended follow-ups

1. Harden amount-bucket parser if under-5k still admits large “full cost” strings.
2. Ensure bare undergrad pins prefer national undergrad awards over random state grants when state=any (pin quality UX).
3. Optional browser/Playwright pass for Ask AI panel open + pendingPrompt auto-send (not covered in pure unit sims).
4. Keep this script in CI: `npx tsx scripts/sim-50-journeys.ts`.

## How to re-run

```bash
cd projects/scholarship-one
npx tsx scripts/sim-50-journeys.ts
```
