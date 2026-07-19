/**
 * Safe serialisation for JSON-LD embedded in a <script> block.
 *
 * JSON.stringify escapes quotes but leaves `<` untouched, so a string containing
 * `</script>` would close the tag early and let whatever follows execute. Escaping
 * `<` as < is still valid JSON and closes that hole. This matters because the
 * values here include catalog award names and breadcrumb labels, not just fixed
 * page titles.
 */
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

export const SITE_ORIGIN = 'https://scholarship-one.pages.dev'
