/**
 * Save/unsave with a confirmation gate on removal and a toast either way.
 *
 * Saving is additive and instant. Removing throws away a decision the student
 * made, so it asks first — the same rule applied on the detail page, kept in one
 * place so every list behaves identically.
 */
import { useCallback, useState, type ReactNode } from 'react'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useToast } from '../components/ui/Toast'

type Award = { id: string; name: string }

export function useConfirmedSave(options: {
  shortlist: string[]
  toggleSave: (id: string) => void
}): { requestToggle: (award: Award) => void; dialog: ReactNode } {
  const { shortlist, toggleSave } = options
  const { notify } = useToast()
  const [pending, setPending] = useState<Award | null>(null)

  const requestToggle = useCallback(
    (award: Award) => {
      if (shortlist.includes(award.id)) {
        setPending(award)
        return
      }
      toggleSave(award.id)
      notify(`Saved ${award.name} to your list.`, 'success')
    },
    [shortlist, toggleSave, notify],
  )

  const dialog = (
    <ConfirmDialog
      open={!!pending}
      title="Remove from your list?"
      body={
        <>
          <strong>{pending?.name}</strong> will be removed from your saved list. Notes and checklist progress are kept,
          so saving it again brings them back.
        </>
      }
      confirmLabel="Remove"
      onCancel={() => setPending(null)}
      onConfirm={() => {
        if (pending) {
          toggleSave(pending.id)
          notify(`Removed ${pending.name} from your list.`, 'info')
        }
        setPending(null)
      }}
    />
  )

  return { requestToggle, dialog }
}
