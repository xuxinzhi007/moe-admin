import type { ReactNode } from 'react'

type AdminPanelProps = {
  children: ReactNode
  className?: string
  title?: ReactNode
  actions?: ReactNode
}

export function AdminPanel({ children, className = '', title, actions }: AdminPanelProps) {
  const hasHead = title != null || actions != null
  return (
    <div className={`panel admin-panel${className ? ` ${className}` : ''}`}>
      {hasHead ? (
        <div className="panel-head">
          {title != null ? <h3>{title}</h3> : <span />}
          {actions}
        </div>
      ) : null}
      {hasHead ? <div className="panel-body">{children}</div> : children}
    </div>
  )
}
