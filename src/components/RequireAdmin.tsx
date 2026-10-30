import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'

export function RequireAdmin() {
  const { token, bootstrapped } = useAdminAuth()
  const location = useLocation()

  if (!bootstrapped) {
    return (
      <div className="login-page">
        <div className="login-card">
          <p className="muted">正在验证登录状态…</p>
        </div>
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
