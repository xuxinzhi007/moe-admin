/** Vite 开发态：业务 Admin API 直连 :8888（只需 RPC+API，不必起 Agent） */
export function useDirectAdminApi(): boolean {
  if (typeof window === 'undefined') return false
  const port = window.location.port
  return port === '5173' || port === '4173'
}

/** Admin 路由前缀：dev → /api/admin；Agent 托管 → /api/deploy/admin */
export function adminApiPath(suffix: string): string {
  const s = suffix.startsWith('/') ? suffix : `/${suffix}`
  if (useDirectAdminApi()) return `/api/admin${s}`
  return `/api/deploy/admin${s}`
}
