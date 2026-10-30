import { useCallback, useEffect, useState } from 'react'
import { AdminFormDrawer } from '../components/AdminFormDrawer'
import { AdminTag, TagRow } from '../components/AdminTag'
import { FormField } from '../components/FormField'
import { PageMessage } from '../components/PageMessage'
import { AdminPanel, MonitorPageLayout } from '../ui'
import { useAdminAuth } from '../context/AdminAuthContext'
import { DeployApiError } from '../api/deployClient'

type Release = {
  platform: string
  version_name: string
  version_code: number
  apk_url: string
  changelog: string
  force_update: boolean
  enabled: boolean
  updated_at: string
  updated_by: string
}

const emptyForm = {
  version_name: '',
  version_code: '',
  apk_url: '',
  changelog: '',
  force_update: false,
  enabled: true,
}

export function AppReleasePage() {
  const { client } = useAdminAuth()
  const [configured, setConfigured] = useState(false)
  const [release, setRelease] = useState<Release | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [formError, setFormError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await client.getAppRelease('android')
      if (!res.success) {
        setError(res.message || '加载失败')
        setRelease(null)
        setConfigured(false)
        return
      }
      const data = res.data
      setConfigured(Boolean(data?.configured))
      const r = data?.release ?? null
      setRelease(r)
      if (r) {
        setForm({
          version_name: r.version_name || '',
          version_code: r.version_code ? String(r.version_code) : '',
          apk_url: r.apk_url || '',
          changelog: r.changelog || '',
          force_update: Boolean(r.force_update),
          enabled: r.enabled !== false,
        })
      } else {
        setForm(emptyForm)
      }
    } catch (e) {
      setError(e instanceof DeployApiError ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => {
    void load()
  }, [load])

  async function save() {
    const code = Number(form.version_code)
    if (!form.version_name.trim()) {
      setFormError('请填写版本名（versionName，如 1.2.3）')
      return
    }
    if (!Number.isInteger(code) || code <= 0) {
      setFormError('versionCode 须为正整数（对应 pubspec.yaml 的 + 后数字）')
      return
    }
    if (!form.apk_url.trim().startsWith('http')) {
      setFormError('请填写完整的 APK 下载 URL（http/https）')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const res = await client.upsertAppRelease({
        platform: 'android',
        version_name: form.version_name.trim(),
        version_code: code,
        apk_url: form.apk_url.trim(),
        changelog: form.changelog.trim(),
        force_update: form.force_update,
        enabled: form.enabled,
      })
      if (!res.success || !res.data?.release) {
        setFormError(res.message || '保存失败')
        return
      }
      setRelease(res.data.release)
      setConfigured(true)
      setMessage('已保存。客户端将在进入主界面后按 versionCode 检查更新。')
      setDrawerOpen(false)
    } catch (e) {
      setFormError(e instanceof DeployApiError ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <MonitorPageLayout
        title="App 版本更新"
        description="配置 Android 侧载更新：版本号、APK 下载地址、强制更新 · 不上传安装包"
        envNote="公开接口 GET /api/public/app-release/latest · 推 v* tag 后 CI 通常已自动回写；本页改 changelog / 强制更新"
        headActions={
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading}
            onClick={() => {
              setFormError('')
              setDrawerOpen(true)
            }}
          >
            {configured ? '编辑版本' : '配置首个版本'}
          </button>
        }
        error={error || undefined}
      >
        <PageMessage message={message} tone="ok" onClose={() => setMessage('')} />

        {loading && !release && !configured ? (
          <p className="muted">加载中…</p>
        ) : configured && release ? (
          <div className="config-cards">
            <AdminPanel title="当前生效配置" className="config-card">
              <dl className="config-dl">
                <div className="config-dl-item">
                  <dt>平台</dt>
                  <dd>
                    <code>{release.platform}</code>
                  </dd>
                </div>
                <div className="config-dl-item">
                  <dt>版本名</dt>
                  <dd>
                    <code>{release.version_name || '—'}</code>
                  </dd>
                </div>
                <div className="config-dl-item">
                  <dt>versionCode</dt>
                  <dd>
                    <code>{release.version_code || '—'}</code>
                  </dd>
                </div>
                <div className="config-dl-item">
                  <dt>状态</dt>
                  <dd>
                    <TagRow>
                      <AdminTag
                        label={release.enabled ? '已启用' : '已停用'}
                        tone={release.enabled ? 'ok' : 'neutral'}
                        dot
                      />
                      <AdminTag
                        label={release.force_update ? '强制更新' : '可稍后'}
                        tone={release.force_update ? 'warn' : 'neutral'}
                      />
                    </TagRow>
                  </dd>
                </div>
                <div className="config-dl-item">
                  <dt>最近更新</dt>
                  <dd className="config-dl-mono">{release.updated_at || '—'}</dd>
                </div>
                <div className="config-dl-item config-dl-item--wide">
                  <dt>APK URL</dt>
                  <dd>
                    {release.apk_url ? (
                      <a
                        className="config-dl-link text-break-all"
                        href={release.apk_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {release.apk_url}
                      </a>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
                <div className="config-dl-item config-dl-item--wide">
                  <dt>更新说明</dt>
                  <dd className="text-pre-wrap">{release.changelog || '—'}</dd>
                </div>
              </dl>
              <p className="muted config-hint">
                推荐：推 <code>v*</code> tag，Actions 打 APK 并回写本页字段（versionCode =
                GITHUB_RUN_NUMBER）。也可手工填 GitHub Release / OSS 直链。强制更新请在此页勾选保存。速查：
                <code>docs/dev/app-release-cheatsheet.md</code>。
              </p>
            </AdminPanel>
          </div>
        ) : (
          <p className="muted">尚未配置 App 版本。点击「配置首个版本」填写 versionCode 与 APK 下载地址。</p>
        )}
      </MonitorPageLayout>

      <AdminFormDrawer
        open={drawerOpen}
        title="编辑 App 版本"
        subtitle="只填下载 URL，不上传文件 · 保存后立即对客户端生效"
        error={formError}
        saving={saving}
        onClose={() => setDrawerOpen(false)}
        onSave={() => void save()}
        saveLabel="保存并生效"
      >
        <FormField label="版本名 versionName（展示用）">
          <input
            value={form.version_name}
            onChange={(e) => setForm((f) => ({ ...f, version_name: e.target.value }))}
            placeholder="1.2.3"
            spellCheck={false}
          />
        </FormField>
        <FormField label="versionCode（覆盖安装依据，必填正整数）">
          <input
            value={form.version_code}
            onChange={(e) => setForm((f) => ({ ...f, version_code: e.target.value }))}
            placeholder="例如 pubspec 1.2.3+42 则填 42"
            inputMode="numeric"
            spellCheck={false}
          />
        </FormField>
        <FormField label="APK 下载 URL">
          <input
            value={form.apk_url}
            onChange={(e) => setForm((f) => ({ ...f, apk_url: e.target.value }))}
            placeholder="https://github.com/.../releases/download/.../app-release.apk"
            spellCheck={false}
          />
        </FormField>
        <FormField label="更新说明">
          <textarea
            value={form.changelog}
            onChange={(e) => setForm((f) => ({ ...f, changelog: e.target.value }))}
            rows={5}
            placeholder="本次更新内容…"
          />
        </FormField>
        <FormField label="选项">
          <div className="checkbox-stack">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
              />
              <span>启用（关闭后客户端视为无更新）</span>
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.force_update}
                onChange={(e) => setForm((f) => ({ ...f, force_update: e.target.checked }))}
              />
              <span>强制更新（用户必须更新才能继续使用主功能）</span>
            </label>
          </div>
        </FormField>
      </AdminFormDrawer>
    </>
  )
}
