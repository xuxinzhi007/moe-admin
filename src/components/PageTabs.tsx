export type PageTabItem<T extends string> = {
  key: T
  label: string
  hint?: string
}

export type PageTabVariant = 'pill' | 'line'

type PageTabsProps<T extends string> = {
  tabs: PageTabItem<T>[]
  active: T
  onChange: (key: T) => void
  className?: string
  /** pill=卡片式（默认）；line=下划线，更克制 */
  variant?: PageTabVariant
}

/** 全站统一 Tab 导航 */
export function PageTabs<T extends string>({
  tabs,
  active,
  onChange,
  className = '',
  variant = 'pill',
}: PageTabsProps<T>) {
  const railClass =
    variant === 'line'
      ? `platform-tab-rail platform-tab-rail--line${className ? ` ${className}` : ''}`
      : `platform-tab-rail${className ? ` ${className}` : ''}`

  return (
    <div className={railClass} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={active === t.key}
          className={`platform-tab-pill${active === t.key ? ' is-active' : ''}`}
          onClick={() => onChange(t.key)}
        >
          <span className="platform-tab-label">{t.label}</span>
          {t.hint ? <span className="platform-tab-hint">{t.hint}</span> : null}
        </button>
      ))}
    </div>
  )
}
