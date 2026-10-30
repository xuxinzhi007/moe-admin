type InsightItem = {
  label: string
  value: string | number
  hint?: string
}

type PageInsightStripProps = {
  items: InsightItem[]
}

/** 列表页顶部轻量摘要指标（铺满宽度网格） */
export function PageInsightStrip({ items }: PageInsightStripProps) {
  if (items.length === 0) return null
  return (
    <div className="admin-metrics page-insight-strip">
      {items.map((item) => (
        <div key={item.label} className="metric">
          <div className="label">{item.label}</div>
          <div className="value">{item.value}</div>
          {item.hint ? <p className="muted" style={{ margin: '4px 0 0', fontSize: 11 }}>{item.hint}</p> : null}
        </div>
      ))}
    </div>
  )
}
