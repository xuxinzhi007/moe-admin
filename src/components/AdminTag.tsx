import type { TagSpec, TagTone } from '../lib/adminLabels'

type Props = {
  label?: string
  tone?: TagTone
  spec?: TagSpec
  dot?: boolean
  className?: string
}

export function AdminTag({ label = '', tone, spec, dot, className = '' }: Props) {
  const resolvedTone = spec?.tone ?? tone ?? 'neutral'
  const text = spec?.label ?? label
  return (
    <span className={`tag tag-${resolvedTone} ${className}`.trim()}>
      {dot ? <span className="tag-dot" aria-hidden /> : null}
      {text}
    </span>
  )
}

export function TagRow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`tag-row ${className}`.trim()}>{children}</div>
}
