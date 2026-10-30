import type { FormEvent, ReactNode } from 'react'

export type AdminSearchConfig = {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder?: string
  submitLabel?: string
}

type AdminToolbarProps = {
  search?: AdminSearchConfig
  /** 状态胶囊 / 筛选项，与搜索并排、同高 */
  filters?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}

export function AdminToolbar({ search, filters, actions, children }: AdminToolbarProps) {
  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    search?.onSubmit()
  }

  return (
    <div className="admin-toolbar">
      <div className="admin-toolbar-main">
        {search ? (
          <form className="admin-toolbar-search" onSubmit={handleSubmit}>
            <input
              placeholder={search.placeholder}
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
            />
            <button type="submit" className="btn btn-ghost">
              {search.submitLabel ?? '搜索'}
            </button>
          </form>
        ) : null}
        {filters ? <div className="admin-toolbar-filters">{filters}</div> : null}
      </div>
      {actions ? <div className="admin-toolbar-actions">{actions}</div> : null}
      {children}
    </div>
  )
}
