type Size = 'sm' | 'md' | 'lg'

type Props = {
  src?: string
  name?: string
  size?: Size
  className?: string
}

function initial(name?: string) {
  const s = (name || '?').trim()
  if (!s) return '?'
  return s.charAt(0).toUpperCase()
}

function isValidAvatar(src?: string) {
  const s = (src || '').trim()
  return s.length > 0 && (s.startsWith('http') || s.startsWith('data:') || s.startsWith('/'))
}

export function UserAvatar({ src, name, size = 'md', className = '' }: Props) {
  const valid = isValidAvatar(src)
  return (
    <span className={`user-avatar user-avatar-${size} ${className}`.trim()} title={name}>
      {valid ? (
        <img src={src} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none' }} />
      ) : null}
      {!valid ? <span className="user-avatar-fallback">{initial(name)}</span> : null}
    </span>
  )
}
