import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { MonitorPageLayout } from '../ui'
import { DayTrendChart } from '../components/DayTrendChart'
import { useAdminAuth } from '../context/AdminAuthContext'
import { DeployApiError } from '../api/deployClient'
import {
  normalizeAnalyticsOverview,
  type AnalyticsOverview,
} from '../lib/analyticsData'

type Overview = AnalyticsOverview

const PIE_COLORS = ['#6b5fc1', '#34d3c8', '#86a8e7', '#f3b74f', '#c9b6ff', '#a8d8ea']

export function AnalyticsPage() {
  const { client } = useAdminAuth()
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await client.getAnalyticsOverview()
      if (!res.success || !res.data) {
        setError(res.message || '加载失败')
        setData(null)
        return
      }
      setData(normalizeAnalyticsOverview(res.data))
    } catch (e) {
      setError(e instanceof DeployApiError ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => {
    void load()
  }, [load])

  const moeSuccessPct = useMemo(() => {
    if (!data?.moe_tool_success_rate) return '—'
    return `${Math.round(data.moe_tool_success_rate * 100)}%`
  }, [data])

  const memoryPie = useMemo(
    () =>
      (data?.memory_by_type || []).map((row) => ({
        name: row.memory_type || 'unknown',
        value: row.count,
      })),
    [data],
  )

  return (
    <MonitorPageLayout
      title="数据分析看板"
      description="用户增长 · 记忆写入 · Moe 工具调用 · AI 对话量（近 14 日趋势）"
      headActions={
        <button type="button" className="btn btn-secondary" disabled={loading} onClick={() => void load()}>
          刷新
        </button>
      }
      error={error || undefined}
    >
      {loading && !data && <p className="muted">加载中…</p>}

      {data && (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <span className="stat-label">注册用户</span>
              <strong className="stat-value">{data.user_total}</strong>
              <span className="stat-sub">近 7 日新增 {data.users_new_7d}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">记忆条目</span>
              <strong className="stat-value">{data.memory_total}</strong>
              <span className="stat-sub">覆盖 {data.memory_users} 位用户</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Moe 工具调用（7 日）</span>
              <strong className="stat-value">{data.moe_tool_calls_7d}</strong>
              <span className="stat-sub">成功率 {moeSuccessPct}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">AI 对话</span>
              <strong className="stat-value">{data.chat_sessions_total}</strong>
              <span className="stat-sub">近 7 日消息 {data.chat_messages_7d}</span>
            </div>
          </div>

          <div className="chart-grid">
            <DayTrendChart title="用户注册（14 日）" data={data.users_by_day} color="#7f7fd5" />
            <DayTrendChart title="记忆写入（14 日）" data={data.memories_by_day} color="#91eae4" />
            <DayTrendChart title="Moe 工具调用（14 日）" data={data.moe_tools_by_day} color="#86a8e7" />
            <DayTrendChart title="AI 对话消息（14 日）" data={data.chat_messages_by_day} color="#ffb347" />
          </div>

          {memoryPie.length > 0 && (
            <div className="chart-card" style={{ maxWidth: 420 }}>
              <h3 className="chart-card-title">记忆类型分布</h3>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={memoryPie}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={88}
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {memoryPie.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </MonitorPageLayout>
  )
}
