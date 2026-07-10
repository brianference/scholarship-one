import type { ApplyStatus } from './applyStatus'
import { APPLY_STATUS_LABEL } from './applyStatus'

export type ExportRow = {
  id: string
  name: string
  amount: string
  deadline: string
  url: string
  score: number
  tags: readonly string[]
  status?: ApplyStatus
}

/** Download a CSV of the current result set / shortlist. */
export function downloadCsv(rows: ExportRow[], filename = 'scholarship-one-results.csv'): void {
  const header = ['Name', 'Amount', 'Deadline', 'Match', 'Status', 'Tags', 'URL']
  const lines = [
    header.join(','),
    ...rows.map((row) =>
      [
        csvCell(row.name),
        csvCell(row.amount),
        csvCell(row.deadline),
        String(row.score),
        csvCell(row.status && row.status !== 'none' ? APPLY_STATUS_LABEL[row.status] : ''),
        csvCell(row.tags.join('; ')),
        csvCell(row.url),
      ].join(','),
    ),
  ]
  triggerDownload(lines.join('\n'), filename, 'text/csv;charset=utf-8')
}

/** Build a multi-event .ics calendar file for programs with parseable deadlines. */
export function downloadIcs(rows: ExportRow[], filename = 'scholarship-deadlines.ics'): void {
  const events = rows
    .map((row) => {
      const day = icsDay(row.deadline)
      if (!day) return null
      const uid = `${row.id}-${day}@scholarship-one`
      const summary = escapeIcs(`Deadline: ${row.name}`)
      const desc = escapeIcs(`${row.amount} · ${row.url}`)
      return [
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${icsNow()}`,
        `DTSTART;VALUE=DATE:${day}`,
        `DTEND;VALUE=DATE:${day}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${desc}`,
        `URL:${row.url}`,
        'END:VEVENT',
      ].join('\r\n')
    })
    .filter(Boolean)

  if (!events.length) {
    window.alert('No fixed calendar deadlines in this list (rolling/FAFSA items are skipped).')
    return
  }

  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Scholarship One//EN', ...events, 'END:VCALENDAR'].join(
    '\r\n',
  )
  triggerDownload(body, filename, 'text/calendar;charset=utf-8')
}

/** Copy official URLs to the clipboard. */
export async function copyLinks(rows: ExportRow[]): Promise<boolean> {
  const text = rows.map((r) => `${r.name}\n${r.url}`).join('\n\n')
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function csvCell(value: string): string {
  const safe = value.replace(/"/g, '""')
  return `"${safe}"`
}

function triggerDownload(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function icsDay(deadline: string): string | null {
  if (/fafsa|cycle|varies|rolling|portal/i.test(deadline)) return null
  const parsed = Date.parse(deadline)
  if (Number.isNaN(parsed)) return null
  const d = new Date(parsed)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

function icsNow(): string {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeIcs(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}
