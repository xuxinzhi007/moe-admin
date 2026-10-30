import { shortId } from '../lib/format'

type Props = {
  id?: string
  title?: string
  mono?: boolean
}

export function IdCell({ id, title, mono = true }: Props) {
  const full = (id || '').trim()
  if (!full) return <span className="muted">—</span>
  return (
    <code className={`id-cell ${mono ? 'id-cell-mono' : ''}`.trim()} title={title || full}>
      {shortId(full, 10)}
    </code>
  )
}
