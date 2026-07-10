export type AmountBucket = 'all' | 'under-5k' | '5k-20k' | '20k-plus' | 'full-tuition'

/** Rough amount bucket from free-text award amounts. */
export function amountBucket(amount: string): AmountBucket {
  const a = amount.toLowerCase()
  if (/full (cost|tuition)|last-dollar|full ride/.test(a)) return 'full-tuition'
  const nums = [...a.matchAll(/\$?\s*([\d,]+)/g)].map((m) => Number(m[1].replace(/,/g, ''))).filter((n) => n > 0)
  if (!nums.length) return 'all'
  const max = Math.max(...nums)
  if (max < 5000) return 'under-5k'
  if (max <= 20000) return '5k-20k'
  return '20k-plus'
}

export function matchesAmountBucket(amount: string, bucket: AmountBucket): boolean {
  if (bucket === 'all') return true
  const b = amountBucket(amount)
  if (bucket === 'full-tuition') return b === 'full-tuition' || /full (cost|tuition)|last-dollar/i.test(amount)
  if (b === 'full-tuition' && bucket === '20k-plus') return true
  return b === bucket
}

export function hasNoEssayTag(tags: readonly string[]): boolean {
  return tags.some((t) => t.toLowerCase() === 'no-essay')
}
