import { useNavigate } from 'react-router-dom'
import type { WorkspaceId } from '../config/workspaceNav'
import { useAdminAuth } from '../context/AdminAuthContext'
import { visibleWorkspaces } from '../lib/adminAccess'

type WorkspaceSwitcherProps = {
  active: WorkspaceId
}

/** 顶栏工作区切换：按角色过滤可见区 */
export function WorkspaceSwitcher({ active }: WorkspaceSwitcherProps) {
  const navigate = useNavigate()
  const { user } = useAdminAuth()
  const workspaces = visibleWorkspaces(user?.role)

  return (
    <div className="ws-switch" role="tablist" aria-label="工作区">
      {workspaces.map((ws) => {
        const isActive = ws.id === active
        return (
          <button
            key={ws.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`ws-switch-btn${isActive ? ' is-active' : ''}`}
            title={ws.caption}
            onClick={() => {
              if (!isActive) navigate(ws.home)
            }}
          >
            {ws.label}
          </button>
        )
      })}
    </div>
  )
}
