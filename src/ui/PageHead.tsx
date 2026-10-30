import type { ReactNode } from 'react'

type PageHeadProps = {
  title: string
  description?: ReactNode
  actions?: ReactNode
}

export function PageHead({ title, description, actions }: PageHeadProps) {
  return (
    <div className="page-head page-head-row">
      <div>
        <h2>{title}</h2>
        {description ? <p className="muted">{description}</p> : null}
      </div>
      {actions ? <div className="page-head-actions">{actions}</div> : null}
    </div>
  )
}
