export type UploadProgressItem = {
  name: string
  pct: number
  done: number
  total: number
}

const RE = /UPLOAD_PROGRESS\|([^|]+)\|(\d+)\|(\d+)\|(\d+)/g

export function parseUploadProgress(log: string | undefined): UploadProgressItem[] {
  if (!log) return []
  const byName = new Map<string, UploadProgressItem>()
  let m: RegExpExecArray | null
  RE.lastIndex = 0
  while ((m = RE.exec(log)) !== null) {
    byName.set(m[1], {
      name: m[1],
      pct: parseInt(m[2], 10) || 0,
      done: parseInt(m[3], 10) || 0,
      total: parseInt(m[4], 10) || 0,
    })
  }
  return [...byName.values()]
}

export function aggregateUploadProgress(items: UploadProgressItem[]): {
  pct: number
  done: number
  total: number
} {
  if (items.length === 0) {
    return { pct: 0, done: 0, total: 0 }
  }
  let sumPct = 0
  let done = 0
  let total = 0
  for (const x of items) {
    sumPct += x.pct
    done += x.done
    total += x.total
  }
  return {
    pct: Math.min(100, Math.round(sumPct / items.length)),
    done,
    total,
  }
}

export function formatUploadMb(n: number): string {
  return (n / 1024 / 1024).toFixed(1)
}

/** Hide machine-readable progress lines from log pre. */
export function stripUploadProgressLines(log: string | undefined): string {
  if (!log) return ''
  return log
    .split('\n')
    .filter((line) => !line.includes('UPLOAD_PROGRESS|'))
    .join('\n')
}
