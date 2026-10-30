import { BuildCacheActions } from '../components/BuildCacheActions'
import { AdminPanel, MonitorPageLayout } from '../ui'
import { useDeploy } from '../context/DeployContext'

export function BuildPage() {
  const { runJob, activeJob } = useDeploy()

  function run(type: string) {
    void runJob(type)
  }

  const displayLog =
    activeJob &&
    (activeJob.type.startsWith('backend_') ||
      activeJob.type.startsWith('flutter_') ||
      activeJob.type === 'env_inspect')
      ? activeJob.log
      : '选择任务后在此显示日志'

  return (
    <MonitorPageLayout
      title="构建流水线"
      description="本机交叉编译后端 bin/moe-social · Flutter 区仅调试用"
      envNote="Deploy Agent 本机任务 · 正式 APK 走 GitHub tag / 运维「GitHub APK 构建」"
      metrics={[
        {
          label: '进行中',
          value: activeJob ? activeJob.type : '无',
          hint: activeJob ? activeJob.status : '空闲',
        },
      ]}
    >
      <div className="split">
        <AdminPanel title="后端">
          <div className="btn-row">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => run('backend_build_linux')}
            >
              编 Linux 二进制
            </button>
            <button
              type="button"
              className="btn btn-mint"
              onClick={() => run('backend_build_local')}
            >
              本机构建
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => run('env_inspect')}>
              环境巡检
            </button>
          </div>
        </AdminPanel>
        <AdminPanel title="Flutter（本机调试）">
          <p className="muted config-hint" style={{ marginTop: 0 }}>
            正式 APK 走 GitHub tag / 侧栏「GitHub APK 构建」，不要用本机 build apk 当发版。
          </p>
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={() => run('flutter_doctor')}>
              flutter doctor
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => run('flutter_pub_get')}>
              pub get
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => run('flutter_build_apk')}
            >
              build apk（调试）
            </button>
          </div>
        </AdminPanel>
      </div>

      <BuildCacheActions />

      <AdminPanel title="构建日志">
        <pre className="log-pre" style={{ maxHeight: 420 }}>
          {displayLog || '—'}
        </pre>
      </AdminPanel>
    </MonitorPageLayout>
  )
}
