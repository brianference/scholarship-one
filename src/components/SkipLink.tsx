/**
 * Keyboard-only skip control.
 * Hidden until focused (Tab) so sighted mouse users never see a random “Skip to content” bar.
 * Required for WCAG 2.4.1 Bypass Blocks — not a bug when it only appears on focus.
 */
export function SkipLink() {
  return (
    <a href="#main-content" className="skip-link">
      Skip to content
    </a>
  )
}
