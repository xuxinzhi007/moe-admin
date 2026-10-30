import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AdminTag, TagRow } from '../components/AdminTag'
import { MoeToolCallsPanel, type MoeCallsFilters } from '../components/MoeToolCallsPanel'
import { TabbedPageLayout } from '../ui'
import type { MoeToolCallRow } from '../lib/moeToolCallFormat'
import { useAdminAuth } from '../context/AdminAuthContext'
import { useDeploy } from '../context/DeployContext'
import { usePlatform } from '../context/PlatformContext'
import { DeployApiError } from '../api/deployClient'
import { normalizeMoeToolStats, type MoeToolStats } from '../lib/analyticsData'

type Tab = 'overview' | 'tools' | 'calls'

type ToolRow = {
  name: string
  description: string
  allowed_tiers: string[]
}

type RuntimeRow = {
  agent_key: string
  display_name: string
  enabled: boolean
  posts_today: number
  post_quota_daily: number
}

const TABS: { key: Tab; label: string; hint: string }[] = [
  { key: 'overview', label: '概览', hint: '指标 · 趋势 · 快捷入口' },
  { key: 'tools', label: '工具目录', hint: '档位权限与说明' },
  { key: 'calls', label: '调用明细', hint: '审计筛选与详情' },
]

export function MoeToolsPage() {
  const { client } = useAdminAuth()
  const { showToast } = useDeploy()
  const { apiTargetLabel } = usePlatform()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'overview'

  const [tools, setTools] = useState<ToolRow[]>([])
  const [defaultTier, setDefaultTier] = useState('s2')
  const [stats, setStats] = useState<MoeToolStats | null>(null)
  const [runtimes, setRuntimes] = useState<RuntimeRow[]>([])
  const [calls, setCalls] = useState<MoeToolCallRow[]>([])
  const [callsTotal, setCallsTotal] = useState(0)
  const [callsPage, setCallsPage] = useState(1)
  const [recentCalls, setRecentCalls] = useState<MoeToolCallRow[]>([])

  const [callFilters, setCallFilters] = useState<MoeCallsFilters>({
    tool: '',
    agentKey: '',
    source: '',
    result: '',
  })
  const [appliedCallFilters, setAppliedCallFilters] = useState<MoeCallsFilters>({
    tool: '',
    agentKey: '',
    source: '',
    result: '',
  })

  const [loading, setLoading] = useState(false)
  const [callsLoading, setCallsLoading] = useState(false)
  const [error, setError] = useState('')
  const pageSize = 20
  const toolOptions = tools.map((t) => t.name)

  const successRate = useMemo(() => {
    if (!stats?.total_calls) return null
    return Math.round((stats.success_calls / stats.total_calls) * 100)
  }, [stats])

  const enabledBots = useMemo(() => runtimes.filter((r) => r.enabled).length, [runtimes])

  function setTab(next: Tab, toolFilter?: string) {
    const nextParams: Record<string, string> = { tab: next }
    setParams(nextParams)
    if (toolFilter) {
      const f: MoeCallsFilters = { tool: toolFilter, agentKey: '', source: '', result: '' }
      setCallFilters(f)
      setAppliedCallFilters(f)
      setCallsPage(1)
    }
  }

  const loadCore = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [schemaRes, statsRes, rtRes, recentRes] = await Promise.all([
        client.getMoeToolsSchema(),
        client.getMoeToolStats({}),
        client.listMoeRuntimes(),
        client.listMoeToolCalls({ page: 1, page_size: 5 }),
      ])
      if (!schemaRes.success || !schemaRes.data) {
        setError(schemaRes.message || '加载失败')
        return
      }
      setTools(schemaRes.data.tools || [])
      setDefaultTier(schemaRes.data.default_tier || 's2')
      if (statsRes.success && statsRes.data) setStats(normalizeMoeToolStats(statsRes.data))
      else setStats(null)
      if (rtRes.success && rtRes.data) {
        setRuntimes(
          (rtRes.data.items || []).map((r) => ({
            agent_key: r.agent_key,
            display_name: r.display_name,
            enabled: r.enabled,
            posts_today: r.posts_today,
            post_quota_daily: r.post_quota_daily,
          })),
        )
      } else {
        setRuntimes([])
      }
      if (recentRes.success && recentRes.data) {
        setRecentCalls(recentRes.data.items || [])
      }
    } catch (e) {
      setError(e instanceof DeployApiError ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [client])

  const loadCalls = useCallback(async () => {
    setCallsLoading(true)
    try {
      const res = await client.listMoeToolCalls({
        page: callsPage,
        page_size: pageSize,
        tool: appliedCallFilters.tool || undefined,
        agent_key: appliedCallFilters.agentKey || undefined,
        source: appliedCallFilters.source || undefined,
        ok_only: appliedCallFilters.result === 'ok',
        failed_only: appliedCallFilters.result === 'fail',
      })
      if (res.success && res.data) {
        setCalls(res.data.items || [])
        setCallsTotal(res.data.total || 0)
      } else {
        setCalls([])
        setCallsTotal(0)
      }
    } catch {
      setCalls([])
      setCallsTotal(0)
    } finally {
      setCallsLoading(false)
    }
  }, [client, callsPage, appliedCallFilters])

  useEffect(() => {
    void loadCore()
  }, [loadCore])

  useEffect(() => {
    if (tab === 'calls') void loadCalls()
  }, [tab, loadCalls])

  function applyCallFilters() {
    setCallsPage(1)
    setAppliedCallFilters({ ...callFilters })
  }

  function resetCallFilters() {
    const empty: MoeCallsFilters = { tool: '', agentKey: '', source: '', result: '' }
    setCallFilters(empty)
    setAppliedCallFilters(empty)
    setCallsPage(1)
  }

  return (
    <TabbedPageLayout
      title="Moe 工具与 Bot"
      description="Chat → tool_calls → Executor → 审计埋点 · 概览指标与工具目录、调用明细在同一页切换"
      envNote={`当前数据环境：${apiTargetLabel} · 工具执行经 /api/moe/tools/execute 埋点`}
      headActions={
        <div className="btn-row">
          <Link className="btn btn-ghost btn-sm" to="/ai/moe-bots">
            社区 Bot
          </Link>
          <button type="button" className="btn btn-ghost" disabled={loading} onClick={() => void loadCore()}>
            刷新
          </button>
        </div>
      }
      tabs={TABS}
      activeTab={tab}
      onTabChange={(next) => setTab(next)}
    >
      {error ? <p className="text-danger">{error}</p> : null}

      {tab === 'overview' ? (
        <div className="platform-overview">
          <div className="platform-health-grid">
            <div className={`platform-health-card${(stats?.total_calls ?? 0) > 0 ? ' is-ok' : ''}`}>
              <div className="label">总调用</div>
              <div className="value">{stats?.total_calls ?? '—'}</div>
              <p className="muted">累计埋点记录</p>
            </div>
            <div
              className={`platform-health-card${
                successRate != null && successRate >= 90 ? ' is-ok' : successRate != null && successRate < 70 ? ' is-err' : ''
              }`}
            >
              <div className="label">成功率</div>
              <div className="value">{successRate != null ? `${successRate}%` : '—'}</div>
              <p className="muted">
                成功 {stats?.success_calls ?? 0} · 失败 {stats?.failed_calls ?? 0}
              </p>
            </div>
            <div className="platform-health-card">
              <div className="label">注册工具</div>
              <div className="value">{tools.length}</div>
              <p className="muted">默认档位 {defaultTier}</p>
            </div>
            <div className="platform-health-card">
              <div className="label">启用 Bot</div>
              <div className="value">{enabledBots}</div>
              <p className="muted">共 {runtimes.length} 个运行时</p>
            </div>
          </div>

          {stats?.by_tool?.length ? (
            <section className="panel platform-panel">
              <header className="platform-section-head">
                <h3>按工具分布</h3>
                <p className="muted">点击工具名可跳转至调用明细并自动筛选</p>
              </header>
              <div className="platform-asset-rings">
                {stats.by_tool.slice(0, 6).map((row) => (
                  <button
                    key={row.tool}
                    type="button"
                    className="platform-asset-ring is-ok moe-stat-ring-btn"
                    onClick={() => setTab('calls', row.tool)}
                  >
                    <strong>{row.total_calls}</strong>
                    <span>{row.tool}</span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {recentCalls.length > 0 ? (
            <section className="panel platform-panel">
              <header className="platform-section-head page-head-row">
                <div>
                  <h3>最近调用</h3>
                  <p className="muted">最新 5 条，完整列表见「调用明细」</p>
                </div>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setTab('calls')}>
                  查看全部 →
                </button>
              </header>
              <div className="moe-recent-calls">
                {recentCalls.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    className="moe-recent-call-row"
                    onClick={() => setTab('calls')}
                  >
                    <code>{row.tool}</code>
                    <AdminTag
                      spec={row.ok ? { label: '成功', tone: 'ok' } : { label: '失败', tone: 'fail' }}
                    />
                    <span className="muted">{row.created_at}</span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {stats?.by_day?.length ? (
            <section className="panel platform-panel">
              <header className="platform-section-head">
                <h3>近 14 日趋势</h3>
              </header>
              <div className="moe-trend-bars">
                {[...stats.by_day].reverse().map((row) => {
                  const max = Math.max(...stats.by_day.map((d) => d.total_calls), 1)
                  const pct = Math.round((row.total_calls / max) * 100)
                  return (
                    <div key={row.date} className="moe-trend-bar" title={`${row.date}: ${row.total_calls} 次`}>
                      <div className="moe-trend-bar-fill" style={{ height: `${Math.max(pct, 4)}%` }} />
                      <span className="moe-trend-bar-label">{row.date.slice(5)}</span>
                    </div>
                  )
                })}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {tab === 'tools' ? (
        <section className="panel platform-panel">
          <header className="platform-section-head">
            <h3>工具目录</h3>
            <p className="muted">
              共 {tools.length} 个工具 · 默认档位 <strong>{defaultTier}</strong>（7B）
            </p>
          </header>
          {loading ? (
            <p className="muted">加载中…</p>
          ) : (
            <div className="moe-tool-grid">
              {tools.map((row) => (
                <article key={row.name} className="moe-tool-card">
                  <div className="moe-tool-card-head">
                    <code className="moe-tool-card-name">{row.name}</code>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setTab('calls', row.name)}
                    >
                      查调用
                    </button>
                  </div>
                  <p className="moe-tool-card-desc">{row.description}</p>
                  <TagRow>
                    {row.allowed_tiers.map((t) => (
                      <AdminTag
                        key={t}
                        spec={{
                          label: t,
                          tone: t === defaultTier ? 'purple' : 'neutral',
                        }}
                      />
                    ))}
                  </TagRow>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {tab === 'calls' ? (
        <MoeToolCallsPanel
          embedded
          calls={calls}
          total={callsTotal}
          page={callsPage}
          pageSize={pageSize}
          loading={callsLoading}
          toolOptions={toolOptions}
          filters={callFilters}
          onFiltersChange={setCallFilters}
          onApply={applyCallFilters}
          onReset={resetCallFilters}
          onPageChange={setCallsPage}
          onRefresh={() => void loadCalls()}
          showToast={showToast}
        />
      ) : null}
    </TabbedPageLayout>
  )
}
