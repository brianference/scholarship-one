import { CATALOG } from './data'
export function seedContext(): string {
  return JSON.stringify({ catalog: CATALOG }, null, 0)
}
