/**
 * Per-route document metadata.
 *
 * A hand-rolled hook rather than react-helmet: this app needs title, description,
 * canonical, robots, and Open Graph tags and nothing else, and the prerender step
 * only has to wait for the DOM to settle. Adding a dependency for ~60 lines of
 * DOM writes would cost more than it saves.
 */
import { useEffect } from 'react'
import { SITE_ORIGIN } from './jsonLd'

export const SITE_NAME = 'Scholarship One'
export const DEFAULT_TITLE = 'Scholarship One — find scholarships that actually fit you'
export const DEFAULT_DESCRIPTION =
  'Search real scholarships by major, state, and background. Save awards, track your applications, and get deadline reminders. Free, no sponsored listings.'
export const OG_IMAGE = `${SITE_ORIGIN}/og.png`

export type Meta = {
  title: string
  description?: string
  /** Path only, e.g. "/about". Combined with the site origin for the canonical. */
  path: string
  /** Set on pages that should not be indexed (per-user views, error states). */
  noindex?: boolean
  type?: 'website' | 'article'
}

/** Create or update a <meta> tag, keyed by name or property. */
function setTag(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setLink(rel: string, href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/** Apply metadata for the current route. */
export function applyMeta(meta: Meta): void {
  const description = meta.description || DEFAULT_DESCRIPTION
  const url = `${SITE_ORIGIN}${meta.path}`
  // Titles over ~60 characters get truncated in results, so keep the brand
  // suffix off anything already long enough to stand alone.
  const title = meta.title.length > 45 ? meta.title : `${meta.title} — ${SITE_NAME}`

  document.title = title
  setTag('name', 'description', description)
  setTag('name', 'robots', meta.noindex ? 'noindex, follow' : 'index, follow')
  setLink('canonical', url)

  setTag('property', 'og:title', title)
  setTag('property', 'og:description', description)
  setTag('property', 'og:url', url)
  setTag('property', 'og:type', meta.type || 'website')
  setTag('property', 'og:site_name', SITE_NAME)
  setTag('property', 'og:image', OG_IMAGE)

  setTag('name', 'twitter:card', 'summary_large_image')
  setTag('name', 'twitter:title', title)
  setTag('name', 'twitter:description', description)
  setTag('name', 'twitter:image', OG_IMAGE)
}

/** Hook form. Re-applies whenever the values change. */
export function useMeta(meta: Meta): void {
  const { title, description, path, noindex, type } = meta
  useEffect(() => {
    applyMeta({ title, description, path, noindex, type })
  }, [title, description, path, noindex, type])
}
