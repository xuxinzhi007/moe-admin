import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminPanel, MonitorPageLayout } from '../ui'
import { useDeploy } from '../context/DeployContext'

export function ReleasePage() {
  const { client, token, runJob } = useDeploy()
  const [ghRef, setGhRef] = useState('main')
  const [out, setOut] = useState('—')

  const refresh = useCallback(async () => {
    try {
      const data = await client.releases()
      setOut(JSON.stringify(data, null, 2))
    } catch (e) {
      setOut(e instanceof Error ? e.message : '加载失败')
    }
  }, [client])

  useEffect(() => {
    if (token) void refresh()
  }, [token, refresh])

  return (
    <MonitorPageLayout
      title="GitHub APK 构建"
      description="触发 flutter-release.yml · 不写入后端 app_releases"
      envNote="正式发版推 v* tag；强制更新 / changelog 在运营区 App 版本更新"
      headActions={
        <Link className="btn btn-ghost" to="/biz/update">
          App 版本更新
        </Link>
      }
    >
      <AdminPanel title="说明">
        <p className="muted config-hint" style={{ margin: 0 }}>
          本页只调度 GitHub Actions 打 APK。正式发版推荐推 tag（如 <code>v1.0.3</code>）；CI 成功后会自动{' '}
          <code>PUT /api/admin/app-release</code>。强制更新 / changelog 精修请去运营区{' '}
          <Link to="/biz/update">App 版本更新</Link>。速查：
          <code>docs/dev/app-release-cheatsheet.md</code>。
        </p>
      </AdminPanel>

      <AdminPanel
        title="workflow_dispatch"
        actions={
          <input
            value={ghRef}
            onChange={(e) => setGhRef(e.target.value)}
            placeholder="ref：main 或 v1.0.3"
            title="分支名或 tag；正式发版优先推 v* tag"
            style={{
              background: 'var(--panel2, var(--surface-soft))',
              border: '1px solid var(--border, var(--hairline))',
              color: 'var(--text, var(--ink))',
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 12,
              width: 180,
            }}
          />
        }
      >
        <div className="btn-row">
          <button type="button" className="btn btn-ghost" onClick={() => void refresh()}>
            刷新 Releases
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void runJob('github_trigger_apk', { ref: ghRef })}
          >
            触发构建
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => void runJob('github_list_workflows')}
          >
            最近构建
          </button>
        </div>
      </AdminPanel>

      <AdminPanel title="Releases / 输出">
        <pre className="log-pre" style={{ maxHeight: 480 }}>
          {out}
        </pre>
      </AdminPanel>
    </MonitorPageLayout>
  )
}
