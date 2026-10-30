import { useEffect, useState } from 'react'
import { AdminTag } from '../components/AdminTag'
import { deployJobStatusTag } from '../lib/adminLabels'
import { UploadProgressBar } from '../components/UploadProgressBar'
import { AdminPanel, MonitorPageLayout } from '../ui'
import { useDeploy } from '../context/DeployContext'
import { stripUploadProgressLines } from '../lib/uploadProgress'
import type { DeployJob } from '../types/deploy'

export function JobsPage() {
  const { jobs, refreshJobs, activeJob, client } = useDeploy()
  const [selected, setSelected] = useState<DeployJob | null>(null)
  const [detail, setDetail] = useState<DeployJob | null>(null)

  useEffect(() => {
    void refreshJobs()
  }, [refreshJobs])

  useEffect(() => {
    if (activeJob) setSelected(activeJob)
  }, [activeJob])

  useEffect(() => {
    if (!selected) {
      setDetail(null)
      return
    }
    void client.getJob(selected.id).then((d) => setDetail(d.job))
  }, [selected, client])

  const show = detail || selected
  const liveLog = activeJob && show && activeJob.id === show.id ? activeJob.log : show?.log

  return (
    <MonitorPageLayout
      title="任务审计"
      description="Deploy Agent 内存队列（最近任务）"
      envNote="任务在 Agent 进程内存中 · 重启 Agent 后队列清空"
      metrics={[
        { label: '队列', value: String(jobs.length), hint: '最近任务数' },
        {
          label: '进行中',
          value: activeJob ? activeJob.type : '无',
          hint: activeJob ? activeJob.status : '空闲',
        },
      ]}
      headActions={
        <button type="button" className="btn btn-ghost" onClick={() => void refreshJobs()}>
          刷新
        </button>
      }
    >
      <div className="split">
        <AdminPanel title="任务队列" className="jobs-queue-panel">
          <table className="jobs-table">
            <thead>
              <tr>
                <th>类型</th>
                <th>状态</th>
                <th>目标</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ color: 'var(--muted)' }}>
                    暂无任务
                  </td>
                </tr>
              ) : (
                jobs.map((j) => (
                  <tr
                    key={j.id}
                    className={selected?.id === j.id ? 'selected' : ''}
                    onClick={() => setSelected(j)}
                  >
                    <td>{j.type}</td>
                    <td>
                      <AdminTag spec={deployJobStatusTag(j.status)} />
                    </td>
                    <td>{j.target || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </AdminPanel>

        <AdminPanel
          title="任务详情"
          actions={
            show ? (
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{show.id.slice(0, 8)}</span>
            ) : null
          }
        >
          {show ? (
            <>
              <p style={{ fontSize: 12, margin: '0 0 8px' }}>
                <AdminTag spec={deployJobStatusTag(show.status)} /> {show.type} · {show.target}
              </p>
              <UploadProgressBar log={liveLog} />
              <pre className="log-pre" style={{ maxHeight: 400 }}>
                {stripUploadProgressLines(liveLog) || '—'}
              </pre>
            </>
          ) : (
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>选择左侧任务查看日志</p>
          )}
        </AdminPanel>
      </div>
    </MonitorPageLayout>
  )
}
