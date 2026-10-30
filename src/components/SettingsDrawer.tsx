import { useState } from 'react'
import { AdminFormDrawer } from './AdminFormDrawer'
import { AdminTag } from './AdminTag'
import { FormField } from './FormField'
import { useAdminAuth } from '../context/AdminAuthContext'
import { useDeploy } from '../context/DeployContext'
import { isSuperAdmin } from '../lib/adminAccess'
import { AGENT_URL, DEFAULT_DEPLOY_TOKEN } from '../lib/storage'

type Props = {
  open: boolean
  onClose: () => void
}

export function SettingsDrawer({ open, onClose }: Props) {
  if (!open) return null
  return <SettingsDrawerInner onClose={onClose} />
}

function SettingsDrawerInner({ onClose }: { onClose: () => void }) {
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
  const [tok, setTok] = useState(token || DEFAULT_DEPLOY_TOKEN)
  const [target, setTarget] = useState(deployTarget)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [authLog, setAuthLog] = useState('点击「检测连接」或「测试云端 SSH」查看实时诊断输出。')
  const [saving, setSaving] = useState(false)
  const [probing, setProbing] = useState(false)

  const showDeploy = isSuperAdmin(user?.role)
  const isWrongVitePort = url.includes(':5173') || url.includes(':4173')

  async function handleSave() {
    setSaving(true)
    try {
      await saveConnection(url.trim() || AGENT_URL, tok.trim() || DEFAULT_DEPLOY_TOKEN, target)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function handleVerify() {
    setProbing(true)
    try {
      await saveConnection(url.trim() || AGENT_URL, tok.trim() || DEFAULT_DEPLOY_TOKEN, target)
      const ok = await verifyToken()
      setAuthLog(
        ok
          ? '✓ 运维网关（Deploy Agent）连接与 Token 鉴权通过。'
          : '✕ 鉴权失败：请确认本机 Deploy Agent (:19010) 已启动，且 Token 与 backend/deploy/config.yaml 一致。',
      )
    } finally {
      setProbing(false)
    }
  }

  async function handleProbeAgent() {
    setProbing(true)
    try {
      await probeAgent()
      setAuthLog('已刷新 Deploy Agent 在线状态。')
    } finally {
      setProbing(false)
    }
  }

  async function handleSsh() {
    setProbing(true)
    setAuthLog('正在连接云端 VPS 测试 SSH 握手与认证…')
    try {
      const data = await client.sshCheck('cloud')
      const p = data.probe
      setAuthLog([p?.message, p?.output].filter(Boolean).join('\n') || 'SSH 检测完成')
    } catch (e) {
      setAuthLog(e instanceof Error ? e.message : 'SSH 检查失败')
    } finally {
      setProbing(false)
    }
  }

  return (
    <AdminFormDrawer
      open
      title="连接与环境设置"
      subtitle="配置本机 Deploy Agent 运维网关、默认部署目标与 SSH 连通性诊断"
      saving={saving}
      onClose={onClose}
      onSave={() => void handleSave()}
      saveLabel="保存设置"
    >
      {!showDeploy ? (
        <section className="drawer-section">
          <div className="drawer-section-head">
            <div>
              <div className="drawer-section-title">当前账号会话</div>
              <div className="drawer-section-desc">
                业务操作凭顶部账号登录即可；数据环境请用顶栏「本机 API / 云端 API」切换
              </div>
            </div>
            <AdminTag label={user?.role || 'admin'} tone="info" />
          </div>
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>
            登录管理员：<strong>{user?.username || '—'}</strong>。当前角色无运维发布权限，Deploy
            Agent 与 SSH 诊断仅对 <code>super_admin</code> 开放。
          </p>
        </section>
      ) : (
        <>
          <section className="drawer-section">
            <div className="drawer-section-head">
              <div>
                <div className="drawer-section-title">1. 运维网关（Deploy Agent）</div>
                <div className="drawer-section-desc">
                  日常业务 API 直连 :8888；构建与远程发布走 Deploy Agent（:19010）
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setUrl(AGENT_URL)}
              >
                恢复默认地址
              </button>
            </div>

            <div className="drawer-grid-2">
              <FormField
                label="Agent URL"
                hint={
                  isWrongVitePort
                    ? '当前填的是前端端口 (:5173)，请点右上角「恢复默认地址」切回 :19010'
                    : `默认地址：${AGENT_URL}`
                }
              >
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={AGENT_URL}
                  spellCheck={false}
                />
              </FormField>

              <FormField label="默认运维目标" hint="构建与远程指令的默认执行环境">
                <select value={target} onChange={(e) => setTarget(e.target.value)}>
                  <option value="local">本机（Local Agent）</option>
                  <option value="cloud">云 VPS（SSH 远程）</option>
                </select>
              </FormField>
            </div>

            <div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowAdvanced((v) => !v)}
              >
                {showAdvanced ? '收起高级 Token 配置' : '展开高级 · Agent Token（可选）'}
              </button>
              {showAdvanced ? (
                <div style={{ marginTop: 10 }}>
                  <FormField
                    label="Deploy Token"
                    hint="仅当修改过 backend/deploy/config.yaml 中的 token 时需要填写"
                  >
                    <input
                      type="password"
                      value={tok}
                      onChange={(e) => setTok(e.target.value)}
                      placeholder={DEFAULT_DEPLOY_TOKEN}
                      spellCheck={false}
                      autoComplete="off"
                    />
                  </FormField>
                </div>
              ) : null}
            </div>
          </section>

          <section className="drawer-section">
            <div className="drawer-section-head">
              <div className="btn-row" style={{ gap: 8, alignItems: 'center' }}>
                <span className="drawer-section-title">2. 状态与连通性诊断</span>
                <AdminTag
                  label={
                    agentOnline === null
                      ? 'Agent 检测中'
                      : agentOnline
                        ? 'Agent 在线'
                        : 'Agent 离线'
                  }
                  tone={agentOnline === null ? 'neutral' : agentOnline ? 'ok' : 'fail'}
                  dot
                />
                <AdminTag
                  label={authOk ? '鉴权通过' : authOk === false ? '鉴权失败' : '鉴权待测'}
                  tone={authOk ? 'ok' : authOk === false ? 'fail' : 'neutral'}
                />
              </div>
              <div className="btn-row" style={{ gap: 6 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={probing}
                  onClick={() => void handleVerify()}
                >
                  检测连接
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={probing}
                  onClick={() => void handleProbeAgent()}
                >
                  刷新状态
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={probing}
                  onClick={() => void handleSsh()}
                >
                  测试云端 SSH
                </button>
              </div>
            </div>

            <pre
              className="log-pre settings-log"
              style={{
                margin: 0,
                maxHeight: 160,
                padding: '10px 12px',
                borderRadius: 10,
                background: 'var(--surface-soft)',
                border: '1px solid var(--hairline)',
                fontSize: 12,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {authLog}
            </pre>
          </section>
        </>
      )}
    </AdminFormDrawer>
  )
}
