import {
  WORKSPACES,
  type WorkspaceId,
  type WorkspaceMeta,
} from '../config/workspaceNav'

/** 后台账号角色（与 AdminAccounts 创建表单一致）。 */
export type AdminRole = 'super_admin' | 'admin' | string

/**
 * 工作区可见性：
 * - super_admin：运营 + AI + 运维
 * - 其余（含 admin）：运营 + AI（看不到 Deploy / Docker 等）
 */
export function canAccessWorkspace(role: AdminRole | undefined | null, ws: WorkspaceId): boolean {
  if (ws === 'infra') {
    return normalizeRole(role) === 'super_admin'
  }
  return true
}

export function visibleWorkspaces(role: AdminRole | undefined | null): WorkspaceMeta[] {
  return WORKSPACES.filter((ws) => canAccessWorkspace(role, ws.id))
}

export function defaultWorkspaceHome(role: AdminRole | undefined | null): string {
  const list = visibleWorkspaces(role)
  return list[0]?.home ?? '/biz'
}

export function isSuperAdmin(role: AdminRole | undefined | null): boolean {
  return normalizeRole(role) === 'super_admin'
}

function normalizeRole(role: AdminRole | undefined | null): string {
  return String(role || '')
    .trim()
    .toLowerCase()
}
