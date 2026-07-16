/**
 * Compact AI action strip for any page — sends a grounded prompt into Scholarship match.
 */
export type PageAiAction = {
  label: string
  prompt: string
}

export type PageAiActionsProps = {
  title?: string
  actions: PageAiAction[]
  onAsk: (prompt: string) => void
  disabled?: boolean
}

/** One-click AI prompts that open the match panel with page context. */
export function PageAiActions({
  title = 'Ask Scholarship match',
  actions,
  onAsk,
  disabled = false,
}: PageAiActionsProps) {
  if (!actions.length) return null
  return (
    <section className="page-ai-actions panel" aria-label={title}>
      <h2 className="h2-tight">{title}</h2>
      <p className="meta">Uses your profile and this page’s context. Answers stay grounded in the real catalog.</p>
      <div className="page-ai-actions__row">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            className="btn btn-ghost page-ai-actions__btn"
            disabled={disabled}
            onClick={() => onAsk(action.prompt)}
          >
            {action.label}
          </button>
        ))}
      </div>
    </section>
  )
}
