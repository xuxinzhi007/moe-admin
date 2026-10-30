import { useCallback, useEffect, useState } from 'react'
import { AdminPanel, MonitorPageLayout } from '../ui'
import { useDeploy } from '../context/DeployContext'

const CONFIG_FILES = [
  'docker-compose.binary.yml',
  'docker-compose.yml',
  'config.yaml',
  'config/config.yaml',
  'api/etc/moe.yaml',
] as const

export function DockerPage() {
  const { client, token, runJob, confirmRunJob, showToast } = useDeploy()
  const [checkOut, setCheckOut] = useState(
    '点击检查：backend_dir、compose、bin/moe-social',
  )
  const [dockerOut, setDockerOut] = useState('等待连接…')
  const [configFile, setConfigFile] = useState<string>(CONFIG_FILES[0])
  const [editor, setEditor] = useState('')

  const refreshDocker = useCallback(async () => {
    try {
      const data = await client.status('cloud')
      setDockerOut(data.output || data.message || '—')
    } catch (e) {
      setDockerOut(e instanceof Error ? e.message : '失败')
    }
  }, [client])

  useEffect(() => {
    if (token) void refreshDocker()
  }, [token, refreshDocker])

  async function runRemotePathCheck() {
    setCheckOut('巡检中…')
    try {
      const data = await client.remoteCheck('cloud')
      const c = data.check || {}
      let lines = (c.message || '') + '\n\n'
      lines += `backend_dir: ${c.backend_dir}\n存在: ${c.backend_dir_exists ? '是' : '否'}\n`
      lines += `compose: ${c.compose_file} 存在: ${c.compose_file_exists ? '是' : '否'}\n`
      lines += `bin/moe-social: ${c.binary_exists ? '是' : '否'}\n`
      lines += `容器 moe-social: ${c.container_running || '—'}\n`
      if (c.suggested_backend_dir) {
        lines += `\n建议 backend_dir: ${c.suggested_backend_dir}\n`
      }
      if (c.raw_output) lines += '\n---\n' + c.raw_output
      setCheckOut(lines)
    } catch (e) {
      setCheckOut(e instanceof Error ? e.message : '巡检失败')
    }
  }

  async function loadRemoteConfig() {
    try {
      const data = await client.remoteConfigGet('cloud', configFile)
      setEditor(data.content || '')
      showToast('已读取 ' + configFile)
    } catch (e) {
      showToast(e instanceof Error ? e.message : '读取失败')
    }
  }

  async function saveRemoteConfig() {
    if (!editor.trim()) {
      showToast('内容为空')
      return
    }
    if (!window.confirm(`确认写入 VPS 上的 ${configFile}？\n将自动 .bak 备份。`)) return
    try {
      await client.remoteConfigPut('cloud', configFile, editor)
      showToast('已保存')
    } catch (e) {
      showToast(e instanceof Error ? e.message : '保存失败')
    }
  }

  return (
    <MonitorPageLayout
      title="云服务器 · Docker"
      description="SSH 管理 compose 与 moe-social 容器"
      envNote="云目标 VPS · 服务配置通过 SSH 白名单读写；Modelfile 已移至 AI → 模型与 Modelfile"
      headActions={
        <button type="button" className="btn btn-ghost" onClick={() => void refreshDocker()}>
          刷新状态
        </button>
      }
    >
      <AdminPanel
        title="云平台路径巡检"
        actions={
          <button type="button" className="btn btn-mint" onClick={() => void runRemotePathCheck()}>
            检查 backend_dir
          </button>
        }
      >
        <pre className="log-pre">{checkOut}</pre>
      </AdminPanel>

      <div className="panel remote-config-panel">
        <div className="panel-head">
          <h3>远程配置</h3>
          <div className="remote-config-toolbar">
            <select
              value={configFile}
              onChange={(e) => setConfigFile(e.target.value)}
              aria-label="配置文件"
            >
              {CONFIG_FILES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <div className="btn-row">
              <button type="button" className="btn btn-ghost" onClick={() => void loadRemoteConfig()}>
                读取
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void saveRemoteConfig()}>
                保存到 VPS
              </button>
            </div>
          </div>
        </div>
        <div className="panel-body remote-config-body">
          <textarea
            className="config-editor"
            value={editor}
            onChange={(e) => setEditor(e.target.value)}
            spellCheck={false}
            rows={22}
            wrap="off"
            placeholder="点击「读取」从 VPS 拉取配置；编辑后「保存到 VPS」会自动 .bak 备份。"
          />
          <p className="config-editor-meta">
            当前文件：{configFile}
            {editor.length > 0
              ? ` · ${editor.split(/\r?\n/).length} 行 · ${editor.length} 字符`
              : ''}
            {configFile.includes('config.yaml')
              ? ' · 改 feishu/wechat 后请重启 moe-social 容器'
              : ''}
          </p>
        </div>
      </div>

      <AdminPanel
        title="docker-compose.binary.yml"
        actions={
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={() => void runJob('docker_ps')}>
              状态
            </button>
            <button type="button" className="btn btn-primary" onClick={() => void runJob('docker_up')}>
              Up
            </button>
            <button
              type="button"
              className="btn btn-mint"
              onClick={() => void runJob('docker_restart', { service: 'moe-social' })}
            >
              重启服务
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => confirmRunJob('docker_down', '确认 down 全部容器？')}
            >
              Down
            </button>
          </div>
        }
      >
        <div className="btn-row" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => void runJob('docker_logs', { service: 'moe-social', tail: '120' })}
          >
            服务日志
          </button>
        </div>
        <pre className="log-pre" style={{ maxHeight: 360 }}>
          {dockerOut}
        </pre>
      </AdminPanel>
    </MonitorPageLayout>
  )
}
