import type { ReactNode } from 'react'

/**
 * Render assistant text with light markdown: **bold**, newlines, [label](url).
 * Escapes raw HTML — only safe link/bold transforms.
 */
export function formatChatText(text: string): ReactNode[] {
  const lines = text.split('\n')
  const nodes: ReactNode[] = []

  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) nodes.push(<br key={`br-${lineIndex}`} />)
    nodes.push(...formatInline(line, `L${lineIndex}`))
  })

  return nodes
}

function formatInline(line: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  // [label](url) then **bold**
  const linkRe = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|\*\*([^*]+)\*\*/g
  let last = 0
  let match: RegExpExecArray | null
  let i = 0
  while ((match = linkRe.exec(line)) !== null) {
    if (match.index > last) {
      nodes.push(line.slice(last, match.index))
    }
    if (match[1] && match[2]) {
      nodes.push(
        <a
          key={`${keyPrefix}-a-${i++}`}
          href={match[2]}
          target="_blank"
          rel="noreferrer"
          className="chat-link"
        >
          {match[1]}
        </a>,
      )
    } else if (match[3]) {
      nodes.push(
        <strong key={`${keyPrefix}-b-${i++}`} className="chat-strong">
          {match[3]}
        </strong>,
      )
    }
    last = match.index + match[0].length
  }
  if (last < line.length) nodes.push(line.slice(last))
  if (!nodes.length) nodes.push(line)
  return nodes
}
