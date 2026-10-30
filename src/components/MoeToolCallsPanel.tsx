import { useMemo, useState } from 'react'
import { AdminFilterInput } from './AdminFilterInput'
import { AdminFilterPills } from './AdminFilterPills'
import { AdminTag } from './AdminTag'
import { IdCell } from './IdCell'
import {
  copyText,
  type MoeToolCallRow,
  parseToolArguments,
  sourceLabel,
} from '../lib/moeToolCallFormat'
import { formatDateTime } from '../lib/format'

export type MoeCallsFilters = {
  tool: string
  agentKey: string
  source: string
  result: '' | 'ok' | 'fail'
}

type Props = {
  /** 嵌入平台治理式布局时使用 platform-panel 外壳 */
  embedded?: boolean
  calls: MoeToolCallRow[]
  total: number
  page: number
  pageSize: number
  loading?: boolean
  toolOptions: string[]
  filters: MoeCallsFilters
  onFiltersChange: (next: MoeCallsFilters) => void
  onApply: () => void
  onReset: () => void
  onPageChange: (page: number) => void
  onRefresh?: () => void
  showToast?: (msg: string) => void
}

export function MoeToolCallsPanel({
  embedded = false,
  calls,
  total,
  page,
  pageSize,
  loading,
  toolOptions,
  filters,
  onFiltersChange,
  onApply,
  onReset,
  onPageChange,
  onRefresh,
  showToast,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detailRow, setDetailRow] = useState<MoeToolCallRow | null>(null)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const parsedById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof parseToolArguments>>()
    for (const row of calls) {
      map.set(row.id, parseToolArguments(row.tool, row.arguments_preview))
    }
    return map
  }, [calls])

  async function handleCopy(text: string, label: string) {
    const ok = await copyText(text)
    showToast?.(ok ? `已复制${label}` : '复制失败')
  }

  const rootClass = embedded
    ? 'panel platform-panel moe-calls-panel'
    : 'panel moe-calls-panel'

  return (
    <section className={rootClass}>
      <header className="platform-section-head page-head-row">
        <div>
          <h3>调用明细</h3>
          <p className="muted">点击卡片展开参数；「详情」查看完整 JSON 与错误信息</p>
        </div>
        <div className="btn-row">
          {onRefresh ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onRefresh} disabled={loading}>
              刷新
            </button>
          ) : null}
          <span className="tag tag-neutral">共 {total} 条</span>
        </div>
      </header>

      <form
        className="moe-calls-filters admin-filter-grid"
        onSubmit={(e) => {
          e.preventDefault()
          onApply()
        }}
      >
        <label className="admin-filter-input">
          <span className="admin-filter-input-label">工具</span>
          <select
            value={filters.tool}
            onChange={(e) => onFiltersChange({ ...filters, tool: e.target.value })}
            aria-label="工具"
          >
            <option value="">全部</option>
            {toolOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <AdminFilterInput
          label="Agent"
          value={filters.agentKey}
          onChange={(v) => onFiltersChange({ ...filters, agentKey: v })}
          placeholder="agent_key"
        />
        <AdminFilterPills
          ariaLabel="来源"
          value={filters.source}
          onChange={(v) => onFiltersChange({ ...filters, source: v })}
          options={[
            { value: '', label: '全部来源' },
            { value: 'api', label: 'API' },
            { value: 'runtime', label: 'Bot' },
          ]}
        />
        <AdminFilterPills
          ariaLabel="结果"
          value={filters.result}
          onChange={(v) =>
            onFiltersChange({
              ...filters,
              result: v as MoeCallsFilters['result'],
            })
          }
          options={[
            { value: '', label: '全部' },
            { value: 'ok', label: '成功' },
            { value: 'fail', label: '失败' },
          ]}
        />
        <div className="admin-filter-actions">
          <button type="submit" className="btn btn-ghost btn-sm" disabled={loading}>
            筛选
          </button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={loading} onClick={onReset}>
            重置
          </button>
        </div>
      </form>

      <div className="moe-calls-list">
        {loading ? (
          <div className="moe-calls-empty muted">加载中…</div>
        ) : calls.length === 0 ? (
          <div className="moe-calls-empty muted">暂无调用记录</div>
        ) : (
          calls.map((row) => {
            const parsed = parsedById.get(row.id) ?? parseToolArguments(row.tool, row.arguments_preview)
            const expanded = expandedId === row.id
            return (
              <article
                key={row.id}
                className={`moe-call-card${expanded ? ' is-expanded' : ''}${row.ok ? '' : ' is-failed'}`}
              >
                <button
                  type="button"
                  className="moe-call-card-main"
                  onClick={() => setExpandedId(expanded ? null : row.id)}
                  aria-expanded={expanded}
                >
                  <div className="moe-call-card-top">
                    <code className="moe-call-tool">{row.tool}</code>
                    <AdminTag
                      spec={
                        row.ok
                          ? { label: '成功', tone: 'ok' }
                          : { label: '失败', tone: 'fail' }
                      }
                    />
                    <AdminTag
                      spec={{
                        label: sourceLabel(row.source),
                        tone: row.source === 'runtime' ? 'purple' : 'info',
                      }}
                    />
                    <span className="moe-call-latency">{row.latency_ms} ms</span>
                  </div>
                  <div className="moe-call-card-meta muted">
                    <time>{formatDateTime(row.created_at)}</time>
                    <span>·</span>
                    <span>
                      用户 <IdCell id={row.actor_user_id} />
                    </span>
                    {row.agent_key ? (
                      <>
                        <span>·</span>
                        <span>
                          Agent <code>{row.agent_key}</code>
                        </span>
                      </>
                    ) : null}
                  </div>
                  <p className="moe-call-summary">{parsed.summary}</p>
                </button>

                {expanded ? (
                  <div className="moe-call-card-expand">
                    {parsed.fields.length > 0 ? (
                      <dl className="moe-call-fields">
                        {parsed.fields.map((f) => (
                          <div key={f.key} className="moe-call-field">
                            <dt>{f.key}</dt>
                            <dd>{f.value}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                    {row.error_msg ? (
                      <div className="moe-call-error">
                        <strong>错误</strong>
                        <pre>{row.error_msg}</pre>
                      </div>
                    ) : null}
                    {parsed.formattedJson ? (
                      <pre className="moe-call-json">{parsed.formattedJson}</pre>
                    ) : null}
                  </div>
                ) : null}

                <div className="moe-call-card-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setExpandedId(expanded ? null : row.id)}
                  >
                    {expanded ? '收起' : '展开参数'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setDetailRow(row)}
                  >
                    详情
                  </button>
                  {parsed.formattedJson ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => void handleCopy(parsed.formattedJson, '参数')}
                    >
                      复制 JSON
                    </button>
                  ) : null}
                </div>
              </article>
            )
          })
        )}
      </div>

      <div className="pager">
        <button
          type="button"
          className="btn"
          disabled={page <= 1 || loading}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          上一页
        </button>
        <span>
          {page} / {totalPages}（共 {total} 条）
        </span>
        <button
          type="button"
          className="btn"
          disabled={page >= totalPages || loading}
          onClick={() => onPageChange(page + 1)}
        >
          下一页
        </button>
      </div>

      {detailRow ? (
        <div className="drawer-backdrop" onClick={() => setDetailRow(null)}>
          <aside
            className="drawer moe-call-detail-drawer"
            aria-label="调用详情"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-head">
              <div>
                <h3>调用详情</h3>
                <p className="drawer-subtitle">
                  #{detailRow.id} · {detailRow.tool}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost drawer-close"
                onClick={() => setDetailRow(null)}
              >
                ✕
              </button>
            </div>
            <div className="drawer-body">
              <dl className="moe-call-detail-grid">
                <div>
                  <dt>时间</dt>
                  <dd>{formatDateTime(detailRow.created_at)}</dd>
                </div>
                <div>
                  <dt>结果</dt>
                  <dd>
                    <AdminTag
                      spec={
                        detailRow.ok
                          ? { label: '成功', tone: 'ok' }
                          : { label: '失败', tone: 'fail' }
                      }
                    />
                  </dd>
                </div>
                <div>
                  <dt>耗时</dt>
                  <dd>{detailRow.latency_ms} ms</dd>
                </div>
                <div>
                  <dt>来源</dt>
                  <dd>{sourceLabel(detailRow.source)}</dd>
                </div>
                <div>
                  <dt>用户</dt>
                  <dd>
                    <IdCell id={detailRow.actor_user_id} />
                  </dd>
                </div>
                <div>
                  <dt>Agent</dt>
                  <dd>{detailRow.agent_key || '—'}</dd>
                </div>
              </dl>
              {detailRow.error_msg ? (
                <div className="moe-call-error">
                  <strong>错误信息</strong>
                  <pre>{detailRow.error_msg}</pre>
                </div>
              ) : null}
              <div className="moe-call-detail-json-wrap">
                <div className="moe-call-detail-json-head">
                  <strong>请求参数</strong>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() =>
                      void handleCopy(
                        parseToolArguments(detailRow.tool, detailRow.arguments_preview).formattedJson,
                        '参数',
                      )
                    }
                  >
                    复制
                  </button>
                </div>
                <pre className="moe-call-json">
                  {parseToolArguments(detailRow.tool, detailRow.arguments_preview).formattedJson || '—'}
                </pre>
              </div>
            </div>
            <div className="drawer-foot">
              <button type="button" className="btn btn-primary" onClick={() => setDetailRow(null)}>
                关闭
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  )
}
