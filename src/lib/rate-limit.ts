type Bucket = {
  resetAt: number
  count: number
}

const buckets = new Map<string, Bucket>()
const MAX_BUCKETS = 5000

function nowMs() {
  return Date.now()
}

function prune() {
  const now = nowMs()
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key)
    }
  }
  if (buckets.size <= MAX_BUCKETS) return

  // best-effort eviction (oldest first)
  const entries = [...buckets.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt)
  for (const [key] of entries.slice(0, buckets.size - MAX_BUCKETS)) {
    buckets.delete(key)
  }
}

export function rateLimit(key: string, opts: { windowMs: number; max: number }) {
  prune()

  const now = nowMs()
  const existing = buckets.get(key)
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + opts.windowMs
    buckets.set(key, { resetAt, count: 1 })
    return { allowed: true, remaining: Math.max(0, opts.max - 1), resetAt }
  }

  if (existing.count >= opts.max) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt }
  }

  existing.count += 1
  return { allowed: true, remaining: Math.max(0, opts.max - existing.count), resetAt: existing.resetAt }
}

