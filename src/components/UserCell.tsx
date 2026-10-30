import { UserAvatar } from './UserAvatar'

type Props = {
  name?: string
  avatar?: string
  sub?: string
  meta?: string
  size?: 'sm' | 'md'
}

export function UserCell({ name, avatar, sub, meta, size = 'sm' }: Props) {
  const display = name?.trim() || sub?.trim() || '未知用户'
  return (
    <div className="user-cell">
      <UserAvatar src={avatar} name={display} size={size === 'md' ? 'md' : 'sm'} />
      <div className="user-cell-text">
        <span className="user-cell-name">{display}</span>
        {sub ? <span className="user-cell-sub">{sub}</span> : null}
        {meta ? <span className="user-cell-meta">{meta}</span> : null}
      </div>
    </div>
  )
}
