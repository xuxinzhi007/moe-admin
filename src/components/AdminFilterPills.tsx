export type AdminFilterPillOption<T extends string = string> = {
  value: T
  label: string
}

type AdminFilterPillsProps<T extends string = string> = {
  value: T
  options: AdminFilterPillOption<T>[]
  onChange: (value: T) => void
  /** 无障碍：筛选项组名 */
  ariaLabel?: string
}

/** 列表页状态筛选：胶囊条（Linear / Supabase 控制台常见形态） */
export function AdminFilterPills<T extends string = string>({
  value,
  options,
  onChange,
  ariaLabel = '筛选',
}: AdminFilterPillsProps<T>) {
  return (
    <div className="admin-filter-pills" role="group" aria-label={ariaLabel}>
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value || 'all'}
            type="button"
            className={`admin-filter-pill${active ? ' is-active' : ''}`}
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
