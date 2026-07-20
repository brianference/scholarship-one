# Scholarship One v5.2.0

Released 2026-07-19 · https://scholarship-one.pages.dev

A desktop layout release. Reported from a 1900px display: the content column
occupied roughly a third of the screen with large empty margins on either side,
and the dark footer stopped short of the page edges.

## The cause

`.shell` was doing two jobs at once. It was both the page wrapper *and* the
1100px reading-width container — and the AI dock's rail was reserved by
subtracting padding from that same capped box.

On a 1900px display the arithmetic worked out as a 400px empty left margin,
then `1100 − 400 − 16 = 684px` of actual content, then the dock. The footer,
living inside that capped box, could never span the page no matter how it was
styled.

## The fix

The two roles are now separate:

- `.shell` is a full-width page wrapper carrying only the dock reservation.
- `header` and `main` are the reading column — 1100px, centred, holding the
  horizontal padding that used to sit on the wrapper.
- The footer is a direct child of the wrapper, so the dark band runs edge to
  edge and constrains its own contents.

Measured at 1900px: content went from **684px to 1100px**, the footer from
**1100px to 1520px**.

## Two more defects found while verifying

**A strip of page background rendered below the dark footer.** The wrapper's
96px bottom padding applied after its last child, which is the footer. Moved to
the content column, taking the mobile reservation for the bottom sheet and tab
bar with it.

**A 20px gap sat between the footer's right edge and the dock rail.** The
reservation was `min(400px, 44vw)` while the dock is 380px wide. Both now read a
single `--dock-w` token, so the two values cannot drift apart again.

## Added

Nine wide-desktop assertions in `qa-chrome`, across 1900 and 1440 with the dock
both open and closed:

- the footer spans the full available width, to the pixel;
- nothing renders below it;
- the reading column is not squeezed by the rail.

The middle two of those caught the bottom-padding strip and the 20px gap — both
were introduced by this very change and neither was visible in the primary
measurement.

## Verification

249 checks across nine suites, run against production as well as locally:
password 16, auth E2E 32, auth UI 23, pages 39, chrome 38, detail 35, SEO 85,
contrast 40, overlay 26.
