import { useState } from 'react'
import { FormField } from '../components/FormField'
import { useAdminAuth } from '../context/AdminAuthContext'
import { DeployApiError } from '../api/deployClient'
import { AdminPanel, ListPageLayout } from '../ui'

export function NotifyPage() {
  const { client } = useAdminAuth()
  const [broadcast, setBroadcast] = useState({ title: '', content: '' })
  const [target, setTarget] = useState({ user_id: '', title: '', content: '' })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  async function sendBroadcast() {
    const title = broadcast.title.trim()
    const content = broadcast.content.trim()
    if (!title || !content) {
      setError('请填写广播标题与内容')
      return
    }
    setSending(true)
    setError('')
    try {
      const res = await client.broadcastNotification({ title, content })
      if (!res.success) {
        setError(res.message || '广播失败')
        return
      }
      setMessage(
        `已向 ${res.data?.notifications_created ?? 0} 位用户写入通知，WS 推送 ${res.data?.ws_sent ?? 0} 次`,
      )
      setBroadcast({ title: '', content: '' })
    } catch (e) {
      setError(e instanceof DeployApiError ? e.message : '广播失败')
    } finally {
      setSending(false)
    }
  }

  async function sendTarget() {
    const userId = target.user_id.trim()
    const title = target.title.trim()
    const content = target.content.trim()
    if (!userId || !title || !content) {
      setError('请填写用户 ID、标题与内容')
      return
    }
    setSending(true)
    setError('')
    try {
      const res = await client.sendNotification({ user_id: userId, title, content })
      if (!res.success) {
        setError(res.message || '发送失败')
        return
      }
      setMessage(`已发送给用户 ${userId}，通知 ID ${res.data?.notification_id ?? '—'}`)
      setTarget({ user_id: '', title: '', content: '' })
    } catch (e) {
      setError(e instanceof DeployApiError ? e.message : '发送失败')
    } finally {
      setSending(false)
    }
  }

  return (
    <ListPageLayout
      title="通知推送"
      description="系统通知广播或指定用户"
      banner={message ? { message, tone: 'ok', onClose: () => setMessage('') } : undefined}
      error={error}
    >
      <div className="overview-bottom">
        <AdminPanel>
          <div className="panel-head">
            <h3>全员广播</h3>
          </div>
          <div className="panel-body">
            <FormField label="标题" required>
              <input value={broadcast.title} onChange={(e) => setBroadcast((f) => ({ ...f, title: e.target.value }))} />
            </FormField>
            <FormField label="内容" required>
              <textarea
                rows={4}
                value={broadcast.content}
                onChange={(e) => setBroadcast((f) => ({ ...f, content: e.target.value }))}
              />
            </FormField>
            <button
              type="button"
              className="btn btn-primary"
              disabled={sending}
              onClick={() => void sendBroadcast()}
            >
              {sending ? '发送中…' : '全员广播'}
            </button>
          </div>
        </AdminPanel>

        <AdminPanel>
          <div className="panel-head">
            <h3>指定用户</h3>
          </div>
          <div className="panel-body">
            <FormField label="用户 ID" required hint="App users 表主键">
              <input value={target.user_id} onChange={(e) => setTarget((f) => ({ ...f, user_id: e.target.value }))} />
            </FormField>
            <FormField label="标题" required>
              <input value={target.title} onChange={(e) => setTarget((f) => ({ ...f, title: e.target.value }))} />
            </FormField>
            <FormField label="内容" required>
              <textarea
                rows={4}
                value={target.content}
                onChange={(e) => setTarget((f) => ({ ...f, content: e.target.value }))}
              />
            </FormField>
            <button type="button" className="btn btn-primary" disabled={sending} onClick={() => void sendTarget()}>
              {sending ? '发送中…' : '发送'}
            </button>
          </div>
        </AdminPanel>
      </div>
    </ListPageLayout>
  )
}
