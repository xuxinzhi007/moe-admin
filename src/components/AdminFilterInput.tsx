type AdminFilterInputProps = {
  label?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'date' | 'search'
  ariaLabel?: string
  className?: string
}

/** 与搜索条同高的次级筛选输入（横排前缀标签，不上下叠） */
export function AdminFilterInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  ariaLabel,
  className = '',
}: AdminFilterInputProps) {
  return (
    <label className={`admin-filter-input${className ? ` ${className}` : ''}`}>
      {label ? <span className="admin-filter-input-label">{label}</span> : null}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel || label || placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}
