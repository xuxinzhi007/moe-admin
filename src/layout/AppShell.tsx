import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { SidebarNav } from '../components/SidebarNav'
import { SettingsDrawer } from '../components/SettingsDrawer'
import { WorkspaceSwitcher } from '../components/WorkspaceSwitcher'
import { detectWorkspace, workspaceMeta } from '../config/workspaceNav'
import { useAdminAuth } from '../context/AdminAuthContext'
import { useDeploy } from '../context/DeployContext'
import { usePlatform } from '../context/PlatformContext'
import { isSuperAdmin } from '../lib/adminAccess'
import type { ApiTarget } from '../lib/apiTarget'

export function AppShell() {
  const { agentOnline, toast, agentMeta } = useDeploy()
  const { user, logout } = useAdminAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { apiTarget, setApiTarget, health } = usePlatform()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const workspace = detectWorkspace(location.pathname)
  const wsMeta = workspaceMeta(workspace)
  const showDeployChrome = isSuperAdmin(user?.role)

  const agentChip = agentMeta?.pid
    ? `Agent · PID ${agentMeta.pid}`
    : agentOnline
      ? 'Agent 在线'
      : 'Agent 离线'

  const apiOnline =
    apiTarget === 'cloud' ? health?.cloud_api?.online : health?.local_api?.online

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand-wrap">
          <div className="brand">
            <h1>Moe Admin</h1>
            <p>Moe Social 管理后台</p>
          </div>
        </div>
        <div className="sidebar-nav-wrap">
          <SidebarNav />
        </div>
        <div className="sidebar-foot">
          {wsMeta.label}工作区 · {wsMeta.caption}
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <WorkspaceSwitcher active={workspace} />

          {showDeployChrome ? (
            <div className="conn-pill">
              <span
                className={`dot ${agentOnline ? 'ok' : agentOnline === false ? 'err' : ''}`}
              />
              <span>{agentOnline ? '网关在线' : '网关离线'}</span>
            </div>
          ) : null}

          <label className="env-switch" title="切换业务 API 数据源">
            <span className="env-switch-label">数据环境</span>
            <select
              className="select-inline"
              value={apiTarget}
              onChange={(e) => setApiTarget(e.target.value as ApiTarget)}
            >
              <option value="local">本机 API</option>
              <option value="cloud">云端 API</option>
            </select>
            <span
              className={`tag ${apiOnline ? 'tag-ok' : 'tag-fail'}`}
              style={{ marginLeft: 6 }}
            >
              {apiOnline ? '可达' : '不可达'}
            </span>
          </label>

          {showDeployChrome ? (
            <span className="agent-chip" title="Deploy Agent">
              {agentChip}
            </span>
          ) : null}
          {user ? (
            <span className="tag tag-ok topbar-user-tag" title={user.role}>
              {user.username}
              {user.role ? ` · ${user.role}` : ''}
            </span>
          ) : null}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              logout()
              navigate('/login')
            }}
          >
            退出
          </button>
          <button
            type="button"
            className={`btn btn-ghost${settingsOpen ? ' is-active' : ''}`}
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen((open) => !open)}
          >
            {settingsOpen ? '关闭设置' : '设置'}
          </button>
        </header>

        <div className="content">
          <div key={location.pathname} className="admin-page admin-page-enter">
            <Outlet />
          </div>
        </div>
      </div>

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  )
}
