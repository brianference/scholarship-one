# Scholarship One v5.1.0

Released 2026-07-19 · https://scholarship-one.pages.dev

A mobile-legibility release, reported from a real phone, plus a rebuilt footer.

## Fixed

**Content read straight through the header and chat dock on mobile.** Both
surfaces were 78% transparent and depended on `backdrop-filter` to hide what sat
behind them — and minification had collapsed the property pair down to just the
`-webkit-` alias, so no blur rendered at all.

The fix is not restoring the blur. Overlay surfaces now use an opaque
`--bg-overlay` token, because legibility must never depend on an effect that
Brave disables under fingerprinting protection and that mobile browsers drop
under reduced-transparency and low-power modes.

**Scroll jank on the results list.** Each of the 209 cards carried a
`backdrop-filter` blur — among the most expensive effects a browser composites,
for something invisible behind an opaque card.

**Frosted surfaces rendered nothing in Firefox.** Minification dropped the
unprefixed `backdrop-filter` in three rules, and Firefox implements only the
standard property.

**Footer brand link failed contrast** at 3.82:1 against the new dark band; its
own text nodes were inheriting the legacy `a { color: var(--accent) }` rule.

## Changed

**Premium dark footer**, built against the live FlowBoard reference rather than
from memory — its DOM and computed styles were inspected, then adapted to this
palette. A wide brand column beside four narrow link columns, 11.5px uppercase
headings with letter-spacing, and a separate darker base strip so the legal fine
print reads as a footnote rather than another column.

It stays dark in both themes. That is the whole effect: a deliberate band
anchors the end of the page instead of the content simply running out. Colours
are fixed literals rather than tokens, since a `--text` that flips to near-black
would vanish against it. Contrast verified before any markup was written —
heading 17.4:1, links 8.1:1, hover 8.8:1, base text 5.0:1.

## Added

`scripts/qa-overlay.mjs` forces the assistant dock **open** and asserts that
anything overlapping text is opaque, across 390/360/768 and four routes, with
reachability hit-testing after `scrollIntoView`. It was verified to catch the
original bug by reverting the fix and watching it fail with
`.chat-dock alpha=0.78 covering 13 nodes, backdrop=none`.

## Why this reached production

Worth recording plainly. The text-overlap check ran only on `/about`, `/terms`,
`/privacy` and `/contact` — never on `/` or `/matches`. And the chat dock is a
bottom sheet **only when open**, defaulting closed below 900px, so every
automated pass measured it at 0×0. The exact configuration a real user hit was
the one configuration no test entered.

A related first pass flagged nine controls as unclickable under the dock;
re-testing after `scrollIntoView` showed zero genuinely unreachable, since a
bottom sheet legitimately covers content you can scroll past and the shell
already reserves 46vh. Reported as clean rather than as a bug.

## Verification

Run against production as well as locally: contrast 40, overlay 26, SEO 85,
detail 35, chrome 29, pages 39. `npm run qa:v5`, or set
`BASE=https://scholarship-one.pages.dev`.
