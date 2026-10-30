import { useEffect, useRef, useState } from 'react'
import { BuildCacheActions } from '../components/BuildCacheActions'
import { EnvKv } from '../components/EnvKv'
import { AdminTag } from '../components/AdminTag'
import { deployJobStatusTag } from '../lib/adminLabels'
import { UploadProgressBar } from '../components/UploadProgressBar'
import { stripUploadProgressLines } from '../lib/uploadProgress'
import { AdminPanel, MonitorPageLayout } from '../ui'
import { useDeploy } from '../context/DeployContext'
import { useOverviewData } from '../hooks/useOverviewData'

function badgeClass(kind: 'ok' | 'fail' | 'pending') {
  if (kind === 'ok') return 'tag tag-ok'
  if (kind === 'fail') return 'tag tag-fail'
  return 'tag tag-pending'
}

export function OverviewPage() {
  const {
    runJob,
    activeJob,
    deployTarget,
    setDeployTarget,
    bootstrapped,
    authOk,
    agentOnline,
  } = useDeploy()
  const [metricsTarget, setMetricsTarget] = useState('local')
  const overview = useOverviewData(metricsTarget)
  const { refreshCloud, refreshLocal } = overview
  const handledJobId = useRef<string | null>(null)

  useEffect(() => {
    if (!activeJob) return
    if (activeJob.status !== 'succeeded' && activeJob.status !== 'failed') return
    if (handledJobId.current === activeJob.id) return
    handledJobId.current = activeJob.id
    const t = activeJob.type || ''
    if (t.startsWith('docker') || t.includes('upload')) {
      void refreshCloud()
    }
    if (t.startsWith('backend_')) {
      void refreshLocal()
    }
  }, [activeJob, refreshCloud, refreshLocal])

  return (
    <MonitorPageLayout
      title="运维总览"
      description={
        <>
          本机编 Linux 单二进制 <code>bin/moe-social</code> · 云 VPS <code>/root/gowork/backend</code> · APK
          走 GitHub tag
        </>
      }
      metrics={[
        { label: '本机', value: overview.localBadge.text, hint: '开发编包环境' },
        { label: '云 VPS', value: overview.cloudBadge.text, hint: overview.cloudHostLabel },
        {
          label: '运维网关',
          value: authOk === true ? '就绪' : agentOnline ? '鉴权失败' : '离线',
          hint:
            authOk === true
              ? '可执行发布任务'
              : '检查 Agent 是否启动；自定义 token 见设置→高级',
        },
        {
          label: '进行中任务',
          value: activeJob ? activeJob.type : '无',
          hint: activeJob ? activeJob.status : '空闲',
        },
      ]}
      headActions={
        <button
          type="button"
          className="btn btn-ghost"
          disabled={!bootstrapped || authOk !== true}
          onClick={() => void overview.refreshAll()}
        >
          刷新总览
        </button>
      }
    >
      {!bootstrapped ? <p className="loading-hint">正在连接 Deploy Agent…</p> : null}

      <section className="overview-section" aria-label="环境状态">
        <div className="env-grid">
          <article className="env-card">
            <div className="env-card-head">
              <h3>
                本机 <span className="sub">开发 · 编 Linux 包</span>
              </h3>
              <span className={badgeClass(overview.localBadge.kind)}>{overview.localBadge.text}</span>
            </div>
            <div className="env-card-body">
              <EnvKv rows={overview.localRows} />
              <div className="env-actions btn-row">
                <button type="button" className="btn btn-ghost" onClick={() => void overview.refreshLocal()}>
                  刷新
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void runJob('backend_build_linux')}
                >
                  编译 Linux
                </button>
                <BuildCacheActions compact />
              </div>
            </div>
          </article>

          <article className="env-card env-card-cloud">
            <div className="env-card-head">
              <h3>
                云 VPS <span className="sub">{overview.cloudHostLabel}</span>
              </h3>
              <span className={badgeClass(overview.cloudBadge.kind)}>{overview.cloudBadge.text}</span>
            </div>
            <div className="env-card-body">
              <EnvKv rows={overview.cloudRows} />
              <pre className="env-pre">{overview.cloudDockerOut}</pre>
              <div className="env-actions btn-row">
                <button type="button" className="btn btn-ghost" onClick={() => void overview.refreshCloud()}>
                  刷新
                </button>
                <button
                  type="button"
                  className="btn btn-mint"
                  onClick={() => {
                    setDeployTarget('cloud')
                    void runJob('docker_ps')
                  }}
                >
                  容器状态
                </button>
                <button type="button" className="btn btn-primary" onClick={() => void runJob('docker_up')}>
                  Docker Up
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>

      {activeJob ? (
        <section className="overview-section" aria-label="当前任务">
          <div className="live-job-dock">
            <div className="live-job-head">
              <strong>{activeJob.type}</strong>
              <AdminTag spec={deployJobStatusTag(activeJob.status)} />
              <span className="tag tag-pending">{activeJob.target || deployTarget}</span>
            </div>
            <UploadProgressBar log={activeJob.log} />
            <pre className="env-pre live-job-log">
              {stripUploadProgressLines(activeJob.log) || '等待输出…'}
            </pre>
          </div>
        </section>
      ) : null}

      <AdminPanel title="文档与边界">
        <p className="muted config-hint" style={{ margin: 0 }}>
          后端部署：<code>docs/dev/deploy-platform.md</code> · App 发版速查：
          <code>docs/dev/app-release-cheatsheet.md</code>。本页「一键发布」只更新云端{' '}
          <code>moe-social</code>；手机 APK / 强制更新在运营区「App 版本更新」或侧栏「GitHub APK
          构建」。
        </p>
      </AdminPanel>

      <section className="overview-section overview-bottom" aria-label="发布与快捷操作">
        <AdminPanel
          title="后端发布流水线"
          actions={
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void runJob('backend_release_pipeline')}
            >
              一键发布（仅后端）
            </button>
          }
        >
          <div className="pipeline compact">
            <div className="pipe-step">
              <span className="num">1</span> 本机编包
            </div>
            <span className="pipe-arrow">→</span>
            <div className="pipe-step">
              <span className="num">2</span> 上传 VPS
            </div>
            <span className="pipe-arrow">→</span>
            <div className="pipe-step">
              <span className="num">3</span> 健康检查
            </div>
          </div>
          <p className="muted config-hint" style={{ marginTop: 12, marginBottom: 0 }}>
            串联：编 <code>bin/moe-social</code> → 上传 → 检查容器。手机 APK 不在此流程，见侧栏「GitHub APK
            构建」或运营区「App 版本更新」。
          </p>
        </AdminPanel>

        <AdminPanel title="快捷操作">
          <div className="btn-row">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void runJob('backend_build_linux')}
            >
              ① 本机编 Linux
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void runJob('backend_upload_binaries')}
            >
              ② 上传 VPS
            </button>
            <button type="button" className="btn btn-primary" onClick={() => void runJob('docker_up')}>
              ③ 云 Docker Up
            </button>
            <button
              type="button"
              className="btn btn-mint"
              onClick={() => {
                setDeployTarget('cloud')
                void runJob('docker_ps')
              }}
            >
              ④ 云容器状态
            </button>
          </div>
        </AdminPanel>
      </section>

      <section className="overview-section" aria-label="环境指标">
        <AdminPanel
          title="环境指标"
          actions={
            <select
              className="select-inline"
              value={metricsTarget}
              onChange={(e) => setMetricsTarget(e.target.value)}
            >
              <option value="local">本机</option>
              <option value="cloud">云平台</option>
            </select>
          }
        >
          {overview.metricsLoading ? (
            <p className="loading-hint">加载指标…</p>
          ) : (
            <div className="metrics">
              {overview.metricsRows.map((row) => (
                <div key={row.key} className="metric">
                  <div className="label">{row.key}</div>
                  <div className="value">{row.value}</div>
                </div>
              ))}
            </div>
          )}
        </AdminPanel>
      </section>
    </MonitorPageLayout>
  )
}
