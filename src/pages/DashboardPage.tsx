import { Link } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'
import { usePlatform } from '../context/PlatformContext'
import { useEffect, useState } from 'react'
import { AdminPanel, MonitorPageLayout } from '../ui'
import { DeployApiError } from '../api/deployClient'
import { isSuperAdmin } from '../lib/adminAccess'

type DashStats = {
  user_total: number
  landing_feedback_total?: number
  feishu_enabled: boolean
  server_time: string
}

type QuickLink = {
  to: string
  title: string
  desc: string
  infra?: boolean
}

const QUICK_LINKS: QuickLink[] = [
  { to: '/biz/users', title: 'App 用户', desc: '列表 · 角色 · VIP' },
  { to: '/biz/content/reports', title: '举报处理', desc: '待审工单' },
  { to: '/biz/content/posts', title: '动态审核', desc: '列表 · 筛选 · 下架' },
  { to: '/biz/announcements', title: '公告管理', desc: '运营公告发布' },
  { to: '/biz/update', title: 'App 版本更新', desc: 'versionCode · 强制更新' },
  { to: '/ai/agents', title: 'AI 角色酒馆', desc: '角色 · 配置 · 审核' },
  { to: '/infra/platform', title: '平台治理', desc: '连接 · 图库 · 数据地图', infra: true },
  { to: '/infra/deploy', title: '运维部署', desc: '构建 · 发布 · Docker', infra: true },
]

export function DashboardPage() {
  const { client, user } = useAdminAuth()
  const { apiTarget, apiTargetLabel, health, healthLoading, refreshHealth } =
    usePlatform()
  const [stats, setStats] = useState<DashStats | null>(null)
  const [statsErr, setStatsErr] = useState('')
  const [reportTotal, setReportTotal] = useState<number | null>(null)
  const superAdmin = isSuperAdmin(user?.role)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setStatsErr('')
      try {
        const [dashRes, reportRes] = await Promise.all([
          client.dashboard(),
          client.listPostReports({ page: 1, page_size: 1 }),
        ])
        if (cancelled) return
        if (dashRes.success && dashRes.data) {
          setStats(dashRes.data)
        } else {
          setStats(null)
          setStatsErr(dashRes.message || '无法加载统计数据')
        }
        if (reportRes.success && reportRes.data) {
          setReportTotal(reportRes.data.total ?? 0)
        } else {
          setReportTotal(null)
        }
      } catch (e) {
        if (!cancelled) {
          setStats(null)
          setReportTotal(null)
          setStatsErr(e instanceof DeployApiError ? e.message : '无法连接 API')
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [client])

  const currentApi =
    apiTarget === 'cloud' ? health?.cloud_api : health?.local_api

  const quickLinks = QUICK_LINKS.filter((l) => superAdmin || !l.infra)

  return (
    <MonitorPageLayout
      title="运营工作台"
      description={
        <>
          今日概览 · 当前数据环境 <code>{apiTargetLabel}</code>
          {currentApi?.base_url ? (
            <>
              {' '}
              · <code>{currentApi.base_url}</code>
            </>
          ) : null}
        </>
      }
      metrics={[
        {
          label: '注册用户',
          value: stats ? String(stats.user_total) : '—',
          hint: '累计账号',
        },
        {
          label: '待处理举报',
          value: reportTotal == null ? '—' : String(reportTotal),
          hint: '动态举报表',
        },
        {
          label: '落地反馈',
          value:
            stats?.landing_feedback_total != null
              ? String(stats.landing_feedback_total)
              : '—',
          hint: 'landing_feedback',
        },
        {
          label: '业务 API',
          value: currentApi?.online ? '可达' : '不可达',
          hint: apiTargetLabel,
        },
      ]}
      headActions={
        <button
          type="button"
          className="btn btn-primary"
          disabled={healthLoading}
          onClick={() => void refreshHealth()}
        >
          {healthLoading ? '检测中…' : '刷新状态'}
        </button>
      }
      error={statsErr || undefined}
    >
      <AdminPanel title="待办与关注">
        <div className="admin-todo-row">
          <Link to="/biz/content/reports" className="admin-todo-card">
            <strong>举报工单</strong>
            <span className="admin-todo-num">
              {reportTotal == null ? '—' : reportTotal}
            </span>
            <span className="muted">进入处理</span>
          </Link>
          <Link to="/biz/content/posts" className="admin-todo-card">
            <strong>动态审核</strong>
            <span className="muted">筛选异常内容</span>
          </Link>
          <Link to="/biz/update" className="admin-todo-card">
            <strong>App 版本</strong>
            <span className="muted">检查更新配置</span>
          </Link>
          {superAdmin ? (
            <Link to="/infra/deploy" className="admin-todo-card">
              <strong>后端发布</strong>
              <span className="muted">一键发布 / Docker</span>
            </Link>
          ) : null}
        </div>
        <p className="muted config-hint" style={{ marginBottom: 0, marginTop: 12 }}>
          飞书通知：
          {stats ? (stats.feishu_enabled ? '已启用' : '未启用') : '—'}
          {stats?.server_time ? ` · API 时间 ${stats.server_time}` : ''}
          {!superAdmin ? ' · 当前角色无运维区（需 super_admin）' : ''}
        </p>
      </AdminPanel>

      <div className="admin-quick panel">
        <div className="panel-head">
          <h3>快捷入口</h3>
        </div>
        <div className="panel-body admin-quick-grid">
          {quickLinks.map((l) => (
            <Link key={l.to} to={l.to} className="quick-card">
              <strong>{l.title}</strong>
              <span>{l.desc}</span>
            </Link>
          ))}
        </div>
      </div>
    </MonitorPageLayout>
  )
}
