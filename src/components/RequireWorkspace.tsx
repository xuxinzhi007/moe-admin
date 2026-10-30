import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'
import {
  canAccessWorkspace,
  defaultWorkspaceHome,
} from '../lib/adminAccess'
import { detectWorkspace } from '../config/workspaceNav'

/** 无权限进入当前工作区时回落到默认可达首页。 */
export function RequireWorkspace({ children }: { children: ReactNode }) {
  const { user } = useAdminAuth()
  const location = useLocation()
  const ws = detectWorkspace(location.pathname)

  if (!canAccessWorkspace(user?.role, ws)) {
    return <Navigate to={defaultWorkspaceHome(user?.role)} replace />
  }

  return <>{children}</>
}
