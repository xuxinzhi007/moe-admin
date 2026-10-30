import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { LoginHeroAside } from '../components/LoginHeroAside'
import { SoftParticles } from '../components/SoftParticles'
import { resolveAdminPath } from '../config/workspaceNav'
import { useAdminAuth } from '../context/AdminAuthContext'

export function LoginPage() {
  const { token, login, loggingIn, bootstrapped } = useAdminAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (searchParams.get('expired') === '1') {
      setError('登录已过期，请重新登录')
    }
  }, [searchParams])

  const rawFrom =
    (location.state as { from?: string } | null)?.from?.replace(/^\/ops/, '') || '/biz'
  const from = resolveAdminPath(rawFrom)

  if (bootstrapped && token) {
    return <Navigate to={from} replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const err = await login(username.trim(), password)
    if (err) {
      setError(err)
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <div className="login-page">
      <SoftParticles count={48} opacity={0.4} />
      <div className="login-layout">
        <LoginHeroAside />

        <div className="login-card">
          <div className="login-brand">
            <h1>登录</h1>
            <p>直接连接管理后台 API</p>
          </div>

          <p className="login-hint muted">
            仅需要管理后台 API 可达，Deploy Agent 不影响登录。
          </p>

          <form className="login-form" onSubmit={(e) => void onSubmit(e)}>
            <label>
              <span>用户名</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </label>

            <label>
              <span>密码</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="默认 admin123（首次迁移后）"
                required
              />
            </label>

            {error ? <div className="login-error">{error}</div> : null}

            <button
              type="submit"
              className="btn btn-primary btn-block login-submit-btn"
              disabled={loggingIn}
            >
              <span className="login-submit-shine" aria-hidden />
              <span className="login-submit-label">{loggingIn ? '登录中…' : '登录'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
