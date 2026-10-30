import { useEffect, useState } from 'react'
import { useAdminAuth } from '../context/AdminAuthContext'
import { useDeploy } from '../context/DeployContext'
import { useDrawerDismiss } from '../hooks/useDrawerDismiss'
import { isSuperAdmin } from '../lib/adminAccess'
import { AGENT_URL, DEFAULT_DEPLOY_TOKEN } from '../lib/storage'

type Props = {
  open: boolean
  onClose: () => void
}

export function SettingsDrawer({ open, onClose }: Props) {
  const { user } = useAdminAuth()
  const {
    baseUrl,
    token,
    deployTarget,
    saveConnection,
    verifyToken,
    probeAgent,
    agentOnline,
    authOk,
    client,
  } = useDeploy()
  const [url, setUrl] = useState(baseUrl)
  const [tok, setTok] = useState(token)
  const [target, setTarget] = useState(deployTarget)
  const [authLog, setAuthLog] = useState('—')
  const showDeploy = isSuperAdmin(user?.role)

  useEffect(() => {
    if (open) {
      setUrl(baseUrl)
      setTok(token || DEFAULT_DEPLOY_TOKEN)
      setTarget(deployTarget)
    }
  }, [open, baseUrl, token, deployTarget])

  useDrawerDismiss(open, onClose)

  if (!open) return null

  async function handleSave() {
    await saveConnection(url, tok.trim() || DEFAULT_DEPLOY_TOKEN, target)
    onClose()
  }

  async function handleVerify() {
    await saveConnection(url, tok.trim() || DEFAULT_DEPLOY_TOKEN, target)
    const ok = await verifyToken()
    setAuthLog(
      ok
        ? '运维网关鉴权通过'
        : '鉴权失败：检查 Agent 是否启动，或高级里 Token 是否与 config.yaml 一致',
    )
  }

  async function handleSsh() {
    try {
      const data = await client.sshCheck('cloud')
      const p = data.probe
      setAuthLog((p?.message || '') + '\n' + (p?.output || ''))
    } catch (e) {
      setAuthLog(e instanceof Error ? e.message : 'SSH 检查失败')
    }
  }

  return (
    <div
      className="drawer-backdrop"
      role="presentation"
      onClick={onClose}
      aria-hidden={false}
    >
      <p className="drawer-backdrop-hint">点击空白处或按 Esc 关闭</p>
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label="连接设置"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-head">
          <h3>连接设置</h3>
          <button type="button" className="btn btn-ghost drawer-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="drawer-body">
          {!showDeploy ? (
            <>
              <p className="settings-muted">
                业务操作凭顶部账号登录即可。数据环境请用顶栏「本机 / 云端」切换。
              </p>
              <p className="settings-muted">
                当前角色 <code>{user?.role || 'admin'}</code> 无运维发布权限；Deploy Agent / Token
                仅 <code>super_admin</code> 可见。
              </p>
              <p className="settings-status">
                登录用户：{user?.username || '—'} · 角色：{user?.role || '—'}
              </p>
            </>
          ) : (
            <>
              <p className="settings-muted">
                业务操作凭顶部账号登录即可。运维发布走本机 Deploy Agent（默认自动鉴权），一般无需再填
                Token。
              </p>

              <label>Agent URL</label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={AGENT_URL}
                spellCheck={false}
              />
              <p className="settings-muted">
                填 Deploy Agent 地址（<code>{AGENT_URL}</code>），不要填 Vite 前端端口 :5173。
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setUrl(AGENT_URL)}
                >
                  恢复默认
                </button>
              </p>

              <label>默认目标</label>
              <select value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="local">本机</option>
                <option value="cloud">云 VPS</option>
              </select>

              <div className="btn-row">
                <button type="button" className="btn btn-primary" onClick={() => void handleSave()}>
                  保存
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => void handleVerify()}>
                  检测连接
                </button>
              </div>

              <details className="settings-advanced">
                <summary>高级 · Agent Token（可选）</summary>
                <label>Deploy Token</label>
                <input
                  type="password"
                  value={tok}
                  onChange={(e) => setTok(e.target.value)}
                  placeholder={DEFAULT_DEPLOY_TOKEN}
                  spellCheck={false}
                  autoComplete="off"
                />
                <p className="settings-muted">
                  仅当你改过 <code>backend/deploy/config.yaml</code> 的 <code>token</code> 时才需要改这里。
                  默认与 Agent 的 <code>{DEFAULT_DEPLOY_TOKEN}</code> 一致。
                </p>
              </details>

              <p className="settings-status">
                Agent：{' '}
                {agentOnline === null ? '检测中…' : agentOnline ? '在线' : '离线'}
                {' · '}
                鉴权：{authOk ? '通过' : authOk === false ? '失败' : '—'}
              </p>
              <div className="btn-row btn-row-spaced">
                <button type="button" className="btn btn-ghost" onClick={() => void probeAgent()}>
                  检测 Agent
                </button>
                <button type="button" className="btn btn-mint" onClick={() => void handleSsh()}>
                  测试 SSH
                </button>
              </div>
              <pre className="log-pre settings-log">{authLog}</pre>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
