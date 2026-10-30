export function formatDateTime(iso?: string) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('zh-CN', { hour12: false })
  } catch {
    return iso
  }
}

export function formatBytes(n?: number) {
  if (n == null || Number.isNaN(n)) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function shortId(id?: string, keep = 8) {
  const s = (id || '').trim()
  if (!s) return '—'
  if (s.length <= keep) return s
  return `${s.slice(0, keep)}…`
}
