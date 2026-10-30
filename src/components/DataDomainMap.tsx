import { useMemo } from 'react'
import { AdminTag } from './AdminTag'
import { schemaCoverageTag } from '../lib/adminLabels'

export type DomainMatrixRow = {
  domain: string
  tables: number
  full: number
  partial: number
  rows: number
}

export type CatalogTableRow = {
  key: string
  table_name: string
  label: string
  domain: string
  coverage: string
  row_count: number
}

const DOMAIN_META: Record<string, { icon: string; hue: number }> = {
  用户与会员: { icon: '👤', hue: 250 },
  内容与社区: { icon: '📱', hue: 210 },
  社交: { icon: '🤝', hue: 190 },
  成长体系: { icon: '📈', hue: 145 },
  礼物与玩法: { icon: '🎁', hue: 35 },
  'AI 与形象': { icon: '🤖', hue: 280 },
  记忆与设备: { icon: '🧠', hue: 320 },
  运营触达: { icon: '📣', hue: 15 },
  系统管理: { icon: '⚙️', hue: 260 },
  用户画像: { icon: '🎯', hue: 170 },
}

function coveragePercent(full: number, partial: number, total: number) {
  if (total <= 0) return 0
  return Math.round(((full + partial * 0.5) / total) * 100)
}

function CoverageRing({ pct, hue }: { pct: number; hue: number }) {
  const r = 28
  const c = 2 * Math.PI * r
  const dash = (pct / 100) * c
  return (
    <svg className="data-map-ring" viewBox="0 0 64 64" aria-hidden>
      <circle cx="32" cy="32" r={r} className="data-map-ring-track" />
      <circle
        cx="32"
        cy="32"
        r={r}
        className="data-map-ring-fill"
        stroke={`hsl(${hue} 68% 58%)`}
        strokeDasharray={`${dash} ${c}`}
        transform="rotate(-90 32 32)"
      />
      <text x="32" y="36" textAnchor="middle" className="data-map-ring-text">
        {pct}%
      </text>
    </svg>
  )
}

type Props = {
  matrix: DomainMatrixRow[]
  items: CatalogTableRow[]
  selectedDomain: string | null
  onSelectDomain: (domain: string | null) => void
}

export function DataDomainMap({ matrix, items, selectedDomain, onSelectDomain }: Props) {
  const filtered = useMemo(() => {
    if (!selectedDomain) return items
    return items.filter((r) => r.domain === selectedDomain)
  }, [items, selectedDomain])

  const totals = useMemo(() => {
    let rows = 0
    for (const m of matrix) rows += m.rows
    return { domains: matrix.length, rows }
  }, [matrix])

  return (
    <div className="data-map-root">
      <div className="data-map-orbit-bg" aria-hidden>
        <span className="data-map-orb data-map-orb-a" />
        <span className="data-map-orb data-map-orb-b" />
        <span className="data-map-grid-lines" />
      </div>

      <header className="data-map-head">
        <div>
          <h3>数据星系 · 按业务域治理</h3>
          <p className="muted">
            {totals.domains} 个业务域 · {items.length} 张表 · {totals.rows.toLocaleString()} 行数据
          </p>
        </div>
        {selectedDomain ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onSelectDomain(null)}>
            显示全部域
          </button>
        ) : null}
      </header>

      <div className="data-map-bento">
        {matrix.map((row, i) => {
          const meta = DOMAIN_META[row.domain] || { icon: '📦', hue: 220 }
          const pct = coveragePercent(row.full, row.partial, row.tables)
          const active = selectedDomain === row.domain
          return (
            <button
              key={row.domain}
              type="button"
              className={`data-map-tile${active ? ' is-active' : ''}`}
              style={
                {
                  '--tile-hue': meta.hue,
                  '--tile-delay': `${i * 40}ms`,
                } as React.CSSProperties
              }
              onClick={() => onSelectDomain(active ? null : row.domain)}
            >
              <div className="data-map-tile-glow" aria-hidden />
              <div className="data-map-tile-top">
                <span className="data-map-tile-icon">{meta.icon}</span>
                <CoverageRing pct={pct} hue={meta.hue} />
              </div>
              <div className="data-map-tile-name">{row.domain}</div>
              <div className="data-map-tile-stats">
                <span>{row.tables} 表</span>
                <span className="data-map-dot">·</span>
                <span>{row.full} 完整</span>
                <span className="data-map-dot">·</span>
                <span>{row.rows.toLocaleString()} 行</span>
              </div>
              <div className="data-map-tile-bar">
                <span style={{ width: `${pct}%` }} />
              </div>
            </button>
          )
        })}
      </div>

      <section className="data-map-table-wrap">
        <div className="data-map-table-head">
          <h4>{selectedDomain ? `${selectedDomain} · 数据表` : '全部数据表'}</h4>
          <span className="muted">{filtered.length} 项</span>
        </div>
        <div className="table-wrap data-map-table-scroll">
          <table className="data-table data-map-table">
            <thead>
              <tr>
                <th>表</th>
                <th>覆盖</th>
                <th>行数</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, selectedDomain ? 999 : 12).map((row) => (
                <tr key={row.key}>
                  <td>
                    <strong>{row.label}</strong>
                    <div className="muted data-map-table-sub">{row.table_name || row.key}</div>
                  </td>
                  <td>
                    <AdminTag spec={schemaCoverageTag(row.coverage)} />
                  </td>
                  <td>{row.row_count >= 0 ? row.row_count.toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!selectedDomain && filtered.length > 12 ? (
          <p className="muted data-map-table-more">点击上方域卡片查看完整列表 · 共 {filtered.length} 张表</p>
        ) : null}
      </section>
    </div>
  )
}
