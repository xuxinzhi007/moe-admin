/** 管理后台登录页路径（与 BrowserRouter basename=/ops 一致）。 */
export function adminLoginPath(expired = false): string {
  return expired ? '/login?expired=1' : '/login'
}

/** 会话失效后整页跳转登录（避免仍停留在受保护路由）。 */
export function redirectToAdminLogin(expired = true) {
  const path = adminLoginPath(expired)
  if (typeof window === 'undefined') return
  const base = window.location.pathname.startsWith('/ops') ? '/ops' : ''
  const target = `${base}${path}`
  if (window.location.pathname !== target) {
    window.location.replace(target)
  }
}
