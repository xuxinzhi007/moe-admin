import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdminFormDrawer } from '../components/AdminFormDrawer'
import { FormField } from '../components/FormField'
import { IdCell } from '../components/IdCell'
import { useAdminAuth } from '../context/AdminAuthContext'
import { formatDateTime } from '../lib/format'
import { DeployApiError } from '../api/deployClient'
import { AdminFilterPills } from '../components/AdminFilterPills'
import { AdminPanel, AdminTable, AdminToolbar, TabbedPageLayout } from '../ui'
import type { AdminTableColumn } from '../ui'

type Tab = 'topic' | 'dictionary'

type TopicRow = { id: string; name: string; color: string; created_at: string }

type DictRow = {
  id: string
  category: string
  tag: string
  label?: string
  note?: string
  sort_order: number
  enabled: boolean
  updated_at: string
}

const topicEmpty = { name: '', color: '#7f7fd5' }
const dictEmpty = {
  category: 'bot_forbidden',
  tag: '',
  label: '',
  note: '',
  sort_order: '0',
  enabled: true,
}

const TABS = [
  { key: 'topic' as const, label: '话题标签', hint: '动态话题' },
  { key: 'dictionary' as const, label: 'Bot 策略字典', hint: '禁止/偏好' },
]

export function TagsCenterPage() {
  const { client } = useAdminAuth()
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'dictionary' ? 'dictionary' : 'topic'

  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [dictCategory, setDictCategory] = useState('')
  const [topicItems, setTopicItems] = useState<TopicRow[]>([])
  const [dictItems, setDictItems] = useState<DictRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editingTopic, setEditingTopic] = useState<TopicRow | null>(null)
  const [editingDict, setEditingDict] = useState<DictRow | null>(null)
  const [topicForm, setTopicForm] = useState(topicEmpty)
  const [dictForm, setDictForm] = useState(dictEmpty)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(false)

  const pageSize = 50

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (tab === 'topic') {
        const res = await client.listTopicTags({
          page,
          page_size: pageSize,
          keyword: search || undefined,
        })
        if (!res.success || !res.data) {
          setError(res.message || '加载失败')
          setTopicItems([])
          setTotal(0)
          return
        }
        setTopicItems(res.data.items || [])
        setTotal(res.data.total || 0)
      } else {
        const res = await client.listTagDictionary({
          page,
          page_size: pageSize,
          category: dictCategory || undefined,
          keyword: keyword || undefined,
        })
        if (!res.success || !res.data) {
          setError(res.message || '加载失败')
          setDictItems([])
          setTotal(0)
          return
        }
        setDictItems(res.data.items || [])
        setTotal(res.data.total || 0)
      }
    } catch (e) {
      setError(e instanceof DeployApiError ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [client, dictCategory, page, pageSize, search, tab])

  useEffect(() => {
    void load()
  }, [load])

  function setTab(next: Tab) {
    setParams({ tab: next })
    setPage(1)
    setKeyword('')
    setSearch('')
  }

  async function bootstrapTopicTags() {
    setBootstrapping(true)
    setError('')
    try {
      const res = await client.bootstrapTopicTags()
      if (!res.success) {
        setError(res.message || '导入失败')
        return
      }
      setMessage(res.message || `已导入 ${res.data?.created ?? 0} 个话题标签`)
      await load()
    } catch (e) {
      setError(e instanceof DeployApiError ? e.message : '导入失败')
    } finally {
      setBootstrapping(false)
    }
  }

  async function saveTopic() {
    const name = topicForm.name.trim()
    if (!name) {
      setFormError('请填写标签名')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      if (modal === 'create') {
        const res = await client.createTopicTag({ name, color: topicForm.color })
        if (!res.success) {
          setFormError(res.message || '创建失败')
          return
        }
        setMessage('话题标签已创建')
      } else if (editingTopic) {
        const res = await client.updateTopicTag(editingTopic.id, {
          name,
          color: topicForm.color,
        })
        if (!res.success) {
          setFormError(res.message || '保存失败')
          return
        }
        setMessage('话题标签已更新')
      }
      setModal(null)
      await load()
    } catch (e) {
      setFormError(e instanceof DeployApiError ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  async function saveDict() {
    const tag = dictForm.tag.trim()
    if (!tag) {
      setFormError('请填写 tag 标识')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const sortOrder = Number.parseInt(dictForm.sort_order, 10) || 0
      if (modal === 'create') {
        const res = await client.createTagDictionary({
          category: dictForm.category,
          tag,
          label: dictForm.label.trim(),
          note: dictForm.note.trim(),
          sort_order: sortOrder,
          enabled: dictForm.enabled,
        })
        if (!res.success) {
          setFormError(res.message || '创建失败')
          return
        }
        setMessage('策略标签已创建')
      } else if (editingDict) {
        const res = await client.updateTagDictionary(editingDict.id, {
          category: dictForm.category,
          tag,
          label: dictForm.label.trim(),
          note: dictForm.note.trim(),
          sort_order: sortOrder,
          enabled: dictForm.enabled,
          update_enabled: true,
        })
        if (!res.success) {
          setFormError(res.message || '保存失败')
          return
        }
        setMessage('策略标签已更新')
      }
      setModal(null)
      await load()
    } catch (e) {
      setFormError(e instanceof DeployApiError ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  async function removeTopic(row: TopicRow) {
    if (!window.confirm(`删除话题标签「${row.name}」？`)) return
    const res = await client.deleteTopicTag(row.id)
    if (!res.success) {
      setError(res.message || '删除失败')
      return
    }
    setMessage('已删除')
    await load()
  }

  async function removeDict(row: DictRow) {
    if (!window.confirm(`删除策略标签「${row.tag}」？`)) return
    const res = await client.deleteTagDictionary(row.id)
    if (!res.success) {
      setError(res.message || '删除失败')
      return
    }
    setMessage('已删除')
    await load()
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const drawerOpen = modal !== null

  const topicColumns = useMemo(
    (): AdminTableColumn<TopicRow>[] => [
      { key: 'name', header: '名称', render: (row) => row.name },
      {
        key: 'color',
        header: '颜色',
        render: (row) => (
          <>
            <span className="color-swatch" style={{ background: row.color || '#7f7fd5' }} title={row.color} />
            {row.color}
          </>
        ),
      },
      { key: 'created', header: '创建时间', render: (row) => formatDateTime(row.created_at) },
      {
        key: 'actions',
        header: '',
        render: (row) => (
          <div className="row-actions">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setEditingTopic(row)
                setTopicForm({ name: row.name, color: row.color || '#7f7fd5' })
                setModal('edit')
              }}
            >
              编辑
            </button>
            <button type="button" className="btn btn-ghost btn-sm danger" onClick={() => void removeTopic(row)}>
              删除
            </button>
          </div>
        ),
      },
    ],
    [load],
  )

  const dictColumns = useMemo(
    (): AdminTableColumn<DictRow>[] => [
      { key: 'category', header: '分类', render: (row) => row.category },
      {
        key: 'tag',
        header: 'Tag',
        render: (row) => (
          <>
            <code>{row.tag}</code>
            <br />
            <IdCell id={row.id} />
          </>
        ),
      },
      { key: 'label', header: '展示名', render: (row) => row.label || '—' },
      { key: 'sort', header: '排序', render: (row) => row.sort_order },
      { key: 'enabled', header: '状态', render: (row) => (row.enabled ? '启用' : '停用') },
      { key: 'updated', header: '更新', render: (row) => formatDateTime(row.updated_at) },
      {
        key: 'actions',
        header: '',
        render: (row) => (
          <div className="row-actions">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setEditingDict(row)
                setDictForm({
                  category: row.category,
                  tag: row.tag,
                  label: row.label || '',
                  note: row.note || '',
                  sort_order: String(row.sort_order),
                  enabled: row.enabled,
                })
                setModal('edit')
              }}
            >
              编辑
            </button>
            <button type="button" className="btn btn-ghost btn-sm danger" onClick={() => void removeDict(row)}>
              删除
            </button>
          </div>
        ),
      },
    ],
    [load],
  )

  return (
    <>
      <TabbedPageLayout
        title="统一标签中心"
        description="话题标签（动态）与 Bot 策略标签字典（禁止/偏好）分栏管理"
        metrics={[{ label: '匹配结果', value: loading ? '…' : total }]}
        headActions={
          <div className="btn-row page-head-toolbar">
            {tab === 'topic' ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={bootstrapping || loading}
              onClick={() => {
                if (!window.confirm('仅在话题表为空时导入 6 个官方推荐话题，是否继续？')) return
                void bootstrapTopicTags()
              }}
            >
                {bootstrapping ? '导入中…' : '导入官方话题'}
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setFormError('')
                if (tab === 'topic') {
                  setEditingTopic(null)
                  setTopicForm(topicEmpty)
                } else {
                  setEditingDict(null)
                  setDictForm(dictEmpty)
                }
                setModal('create')
              }}
            >
              新建
            </button>
          </div>
        }
        tabs={TABS}
        activeTab={tab}
        onTabChange={setTab}
      >
        {message ? <p className="form-hint ok">{message}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}

        <AdminPanel>
          <AdminToolbar
            search={{
              value: keyword,
              onChange: setKeyword,
              onSubmit: () => {
                setPage(1)
                setSearch(keyword.trim())
              },
              placeholder: '名称 / tag',
            }}
            filters={
              tab === 'dictionary' ? (
                <AdminFilterPills
                  ariaLabel="策略标签分类"
                  value={dictCategory}
                  onChange={(next) => {
                    setDictCategory(next)
                    setPage(1)
                  }}
                  options={[
                    { value: '', label: '全部' },
                    { value: 'bot_forbidden', label: '禁止' },
                    { value: 'bot_preferred', label: '偏好' },
                  ]}
                />
              ) : null
            }
          />
          {tab === 'topic' ? (
            <AdminTable
              columns={topicColumns}
              rows={topicItems}
              rowKey={(row) => row.id}
              loading={loading}
              emptyText="暂无话题标签 · 后端已对接 /api/admin/topic-tags。App 发动态时会自动写入；也可点「导入官方话题」或手动新建"
            />
          ) : (
            <AdminTable
              columns={dictColumns}
              rows={dictItems}
              rowKey={(row) => row.id}
              loading={loading}
              emptyText="暂无策略标签 · 可手动新建禁止/偏好条目"
            />
          )}
          {totalPages > 1 ? (
            <div className="pager">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                上一页
              </button>
              <span>
                第 {page} / {totalPages} 页 · 共 {total} 条
              </span>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                下一页
              </button>
            </div>
          ) : null}
        </AdminPanel>
      </TabbedPageLayout>

      <AdminFormDrawer
        open={drawerOpen}
        title={
          tab === 'topic'
            ? modal === 'create'
              ? '新建话题标签'
              : '编辑话题标签'
            : modal === 'create'
              ? '新建策略标签'
              : '编辑策略标签'
        }
        onClose={() => setModal(null)}
        onSave={() => void (tab === 'topic' ? saveTopic() : saveDict())}
        saving={saving}
        saveLabel={modal === 'create' ? '创建' : '保存'}
        error={formError}
      >
        {tab === 'topic' ? (
          <>
            <FormField label="名称" required>
              <input value={topicForm.name} onChange={(e) => setTopicForm((f) => ({ ...f, name: e.target.value }))} />
            </FormField>
            <FormField label="颜色">
              <input
                type="color"
                value={topicForm.color}
                onChange={(e) => setTopicForm((f) => ({ ...f, color: e.target.value }))}
              />
            </FormField>
          </>
        ) : (
          <>
            <FormField label="分类" required>
              <select
                value={dictForm.category}
                onChange={(e) => setDictForm((f) => ({ ...f, category: e.target.value }))}
              >
                <option value="bot_forbidden">bot_forbidden（禁止）</option>
                <option value="bot_preferred">bot_preferred（偏好）</option>
              </select>
            </FormField>
            <FormField label="Tag 标识" required>
              <input value={dictForm.tag} onChange={(e) => setDictForm((f) => ({ ...f, tag: e.target.value }))} />
            </FormField>
            <FormField label="展示名">
              <input value={dictForm.label} onChange={(e) => setDictForm((f) => ({ ...f, label: e.target.value }))} />
            </FormField>
            <FormField label="备注">
              <textarea value={dictForm.note} onChange={(e) => setDictForm((f) => ({ ...f, note: e.target.value }))} rows={3} />
            </FormField>
            <FormField label="排序">
              <input
                type="number"
                value={dictForm.sort_order}
                onChange={(e) => setDictForm((f) => ({ ...f, sort_order: e.target.value }))}
              />
            </FormField>
            <FormField label="启用">
              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={dictForm.enabled}
                  onChange={(e) => setDictForm((f) => ({ ...f, enabled: e.target.checked }))}
                />
                启用此条目
              </label>
            </FormField>
          </>
        )}
      </AdminFormDrawer>
    </>
  )
}
