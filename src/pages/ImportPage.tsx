/**
 * Import share pack from URL `?pack=` or pasted token — restore shortlist + profile.
 */
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { decodeSharePack } from '../lib/sharePack'
import { useScholarship } from '../state/ScholarshipContext'
import { useMeta } from '../lib/seo'

export function ImportPage() {
  useMeta({
    title: 'Import a share link',
    description:
      'Restore a shared scholarship list.',
    path: '/import',
    noindex: true,
  })
  const [params] = useSearchParams()
  const s = useScholarship()
  const navigate = useNavigate()
  const [paste, setPaste] = useState('')
  const [note, setNote] = useState<string | null>(null)
  const [preview, setPreview] = useState<ReturnType<typeof decodeSharePack>>(null)

  useEffect(() => {
    const pack = params.get('pack')
    if (pack) {
      const decoded = decodeSharePack(decodeURIComponent(pack))
      setPreview(decoded)
      if (!decoded) setNote('This share link is invalid or expired.')
    }
  }, [params])

  function applyPack(raw: string) {
    const decoded = decodeSharePack(raw.startsWith('http') ? new URL(raw).searchParams.get('pack') || raw : raw)
    if (!decoded) {
      setNote('Could not read pack. Paste the full share link or pack token.')
      return
    }
    s.restoreSharePack(decoded)
    setNote(`Restored ${decoded.shortlist.length} saved awards and profile.`)
    window.setTimeout(() => navigate('/tracker'), 600)
  }

  return (
    <div className="page-stack">
      <p className="meta page-crumb">
        <Link to="/matches">Matches</Link> · Import share link
      </p>
      <section className="panel" aria-labelledby="import-heading">
        <h1 id="import-heading" className="h2-section">
          Import share link
        </h1>
        <p className="lede">
          Restore a saved list and profile from a Scholarship One share link (works offline — data is in the URL,
          not on a server). Or paste a pack token from another device.
        </p>

        {preview ? (
          <div className="import-preview">
            <p className="meta">
              Ready to import: <strong>{preview.shortlist.length}</strong> saved awards · profile major=
              {preview.profile.major}, level={preview.profile.level}
            </p>
            <button type="button" className="btn btn-primary" onClick={() => applyPack(params.get('pack') || '')}>
              Restore this pack
            </button>
          </div>
        ) : null}

        <label className="field">
          <span>Paste share link or pack token</span>
          <textarea
            rows={3}
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder="https://scholarship-one.pages.dev/import?pack=s1.... or s1.eyJ..."
            aria-label="Share pack paste"
          />
        </label>
        <button type="button" className="btn btn-primary" onClick={() => applyPack(paste.trim())} disabled={!paste.trim()}>
          Import
        </button>
        {note ? (
          <p className="meta" role="status">
            {note}
          </p>
        ) : null}
      </section>
    </div>
  )
}
