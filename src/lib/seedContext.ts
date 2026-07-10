import { CATALOG } from '../data/catalog'

/** Build chat grounding payload from the catalog module. */
export function buildChatContext(): string {
  return JSON.stringify({ catalog: CATALOG }, null, 0)
}
