import { CATALOG } from '../src/data/catalog'
import { BROWSE_CATEGORIES, itemMatchesCategory } from '../src/lib/categories'

for (const cat of BROWSE_CATEGORIES) {
  if (cat.id === 'all') continue
  const n = CATALOG.filter((c) => itemMatchesCategory(c.tags, cat.id)).length
  const flag = n >= 20 ? 'OK' : n >= 12 ? 'OK-' : 'THIN'
  console.log(`${flag}\t${String(n).padStart(3)}\t${cat.id}\t${cat.label}`)
}
console.log('total', CATALOG.length)
