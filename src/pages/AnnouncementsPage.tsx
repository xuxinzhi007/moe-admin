import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminFormDrawer } from '../components/AdminFormDrawer'
import { AdminTag } from '../components/AdminTag'
import { FormField } from '../components/FormField'
import { IdCell } from '../components/IdCell'
import { AdminFilterPills } from '../components/AdminFilterPills'
import { useAdminAuth } from '../context/AdminAuthContext'
import { announcementTag } from '../lib/adminLabels'
import { formatDateTime } from '../lib/format'
import { DeployApiError } from '../api/deployClient'
import { AdminTable, AdminToolbar, ListPageLayout } from '../ui'
import type { AdminTableColumn } from '../ui'

type Row = { id: string; title: string; content: string; status: string; published_at?: string; created_at: string }

const emptyForm = { title: '', content: '' }

export function AnnouncementsPage() {
  const { client } = useAdminAuth()
  const [items, setItems] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing] = useState<Row | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const pageSize = 20

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await client.listAnnouncements({
        page,
        page_size: pageSize,
        status: status || undefined,
      })
      if (!res.success || !res.data) {
        setError(res.message || '加载失败')
        setItems([])
        setTotal(0)
        return
      }
      setItems(res.data.items || [])
      setTotal(res.data.total || 0)
    } catch (e) {
      setError(e instanceof DeployApiError ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [client, page, status])

  useEffect(() => {
    void load()
  }, [load])

  async function save() {
    const title = form.title.trim()
    const content = form.content.trim()
    if (!title) {
      setFormError('请填写标题')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      if (modal === 'create') {
        const res = await client.createAnnouncement({ title, content })
        if (!res.success) {
          setFormError(res.message || '创建失败')
          return
        }
        setMessage('公告已创建')
      } else if (editing) {
        const res = await client.updateAnnouncement(editing.id, { title, content })
        if (!res.success) {
          setFormError(res.message || '保存失败')
          return
        }
        setMessage('公告已更新')
      }
      setModal(null)
      await load()
    } catch (e) {
      setFormError(e instanceof DeployApiError ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const columns = useMemo(
    (): AdminTableColumn<Row>[] => [
      { key: 'id', header: 'ID', render: (row) => <IdCell id={row.id} /> },
      { key: 'title', header: '标题', render: (row) => row.title },
      {
        key: 'status',
        header: '状态',
        render: (row) => <AdminTag spec={announcementTag(row.status)} />,
      },
      {
        key: 'published',
        header: '发布时间',
        cellClassName: 'muted',
        render: (row) => formatDateTime(row.published_at),
      },
      {
        key: 'actions',
        header: '',
        render: (row) => (
          <>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setEditing(row)
                setForm({ title: row.title, content: row.content })
                setFormError('')
                setModal('edit')
              }}
            >
              编辑
            </button>
            {row.status !== 'published' ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={async () => {
                  const res = await client.publishAnnouncement(row.id)
                  if (!res.success) setError(res.message || '发布失败')
                  else {
                    const pushed = (res.data as { notifications_created?: number; ws_sent?: number } | undefined)
                    const n = pushed?.notifications_created ?? 0
                    const w = pushed?.ws_sent ?? 0
                    setMessage(`已发布 · 推送 ${n} 条通知 · WS ${w} 人在线`)
                    await load()
                  }
                }}
              >
                发布
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={async () => {
                if (!confirm(`删除公告「${row.title}」？`)) return
                const res = await client.deleteAnnouncement(row.id)
                if (!res.success) setError(res.message || '删除失败')
                else await load()
              }}
            >
              删除
            </button>
          </>
        ),
      },
    ],
    [client, load],
  )

  return (
    <>
      <ListPageLayout
        title="公告管理"
        description="App 内公告运营 · 草稿与发布状态分色展示"
        headActions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditing(null)
              setForm(emptyForm)
              setFormError('')
              setModal('create')
            }}
          >
            新建公告
          </button>
        }
        banner={message ? { message, tone: 'ok', onClose: () => setMessage('') } : undefined}
        toolbar={
          <AdminToolbar
            filters={
              <AdminFilterPills
                ariaLabel="公告状态"
                value={status}
                onChange={(next) => {
                  setStatus(next)
                  setPage(1)
                }}
                options={[
                  { value: '', label: '全部' },
                  { value: 'draft', label: '草稿' },
                  { value: 'published', label: '已发布' },
                ]}
              />
            }
          />
        }
        error={error}
        pagination={{ page, totalPages, total, onPageChange: setPage }}
      >
        <AdminTable columns={columns} rows={items} rowKey={(row) => row.id} loading={loading} emptyText="暂无公告" />
      </ListPageLayout>

      <AdminFormDrawer
        open={modal !== null}
        title={modal === 'create' ? '新建公告' : '编辑公告'}
        subtitle={editing ? `ID ${editing.id}` : undefined}
        error={formError}
        saving={saving}
        onClose={() => setModal(null)}
        onSave={() => void save()}
      >
        <FormField label="标题" required>
          <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        </FormField>
        <FormField label="内容" required>
          <textarea rows={6} value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
        </FormField>
      </AdminFormDrawer>
    </>
  )
}
