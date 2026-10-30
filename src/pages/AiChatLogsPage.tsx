import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { IdCell } from '../components/IdCell'
import { useAdminAuth } from '../context/AdminAuthContext'
import { formatDateTime } from '../lib/format'
import { DeployApiError } from '../api/deployClient'
import { AdminFilterInput } from '../components/AdminFilterInput'
import { AdminFilterPills } from '../components/AdminFilterPills'
import { AdminPanel, AdminPagination, AdminTable, AdminToolbar, TabbedPageLayout } from '../ui'
import type { AdminTableColumn } from '../ui'

type Tab = 'sessions' | 'messages'

type SessionRow = {
  id: string
  user_id: string
  username?: string
  session_id: string
  model?: string
  message_count?: number
  last_message_at?: string
  updated_at: string
}

type MessageRow = {
  id: string
  user_id: string
  username?: string
  session_id: string
  role: string
  content: string
  model?: string
  created_at: string
}

const emptyFilters = {
  userId: '',
  sessionId: '',
  role: '',
  keyword: '',
  from: '',
  to: '',
}

const TABS = [
  { key: 'sessions' as const, label: '会话', hint: '会话列表' },
  { key: 'messages' as const, label: '消息', hint: '消息明细' },
]

export function AiChatLogsPage() {
  const { client } = useAdminAuth()
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'messages' ? 'messages' : 'sessions'

  const [filters, setFilters] = useState(emptyFilters)
  const [applied, setApplied] = useState(emptyFilters)
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [message, setMessage] = useState('')
  const pageSize = tab === 'sessions' ? 20 : 30

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (tab === 'sessions') {
        const res = await client.listAiChatSessions({
          page,
          page_size: pageSize,
          user_id: applied.userId || undefined,
          session_id: applied.sessionId || undefined,
          from: applied.from || undefined,
          to: applied.to || undefined,
        })
        if (!res.success || !res.data) {
          setError(res.message || '加载失败')
          setSessions([])
          setTotal(0)
          return
        }
        setSessions(res.data.items || [])
        setTotal(res.data.total || 0)
      } else {
        const res = await client.listAiChatMessages({
          page,
          page_size: pageSize,
          user_id: applied.userId || undefined,
          session_id: applied.sessionId || undefined,
          role: applied.role || undefined,
          keyword: applied.keyword || undefined,
          from: applied.from || undefined,
          to: applied.to || undefined,
        })
        if (!res.success || !res.data) {
          setError(res.message || '加载失败')
          setMessages([])
          setTotal(0)
          return
        }
        setMessages(res.data.items || [])
        setTotal(res.data.total || 0)
      }
    } catch (e) {
      setError(e instanceof DeployApiError ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [applied, client, page, pageSize, tab])

  useEffect(() => {
    void load()
  }, [load])

  function setTab(next: Tab) {
    setParams({ tab: next })
    setPage(1)
  }

  function applyFilters() {
    setApplied({ ...filters })
    setPage(1)
  }

  function resetFilters() {
    setFilters(emptyFilters)
    setApplied(emptyFilters)
    setPage(1)
  }

  async function exportCsv() {
    setExporting(true)
    setMessage('')
    try {
      const res = await client.exportAiChatMessages({
        user_id: applied.userId || undefined,
        session_id: applied.sessionId || undefined,
        role: applied.role || undefined,
        keyword: applied.keyword || undefined,
        from: applied.from || undefined,
        to: applied.to || undefined,
        limit: 5000,
      })
      if (!res.success || !res.data) {
        setMessage(res.message || '导出失败')
        return
      }
      const blob = new Blob([res.data.csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ai_chat_messages_${Date.now()}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setMessage(
        res.data.truncated
          ? `已导出 ${res.data.row_count} 条（已达上限，结果被截断）`
          : `已导出 ${res.data.row_count} 条`,
      )
    } catch (e) {
      setMessage(e instanceof DeployApiError ? e.message : '导出失败')
    } finally {
      setExporting(false)
    }
  }

  function openSessionMessages(sessionId: string) {
    setFilters((f) => ({ ...f, sessionId }))
    setApplied((f) => ({ ...f, sessionId }))
    setTab('messages')
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const sessionColumns = useMemo(
    (): AdminTableColumn<SessionRow>[] => [
      {
        key: 'user',
        header: '用户',
        render: (row) => (
          <>
            {row.username || '—'}
            <br />
            <IdCell id={row.user_id} />
          </>
        ),
      },
      {
        key: 'session',
        header: 'Session',
        render: (row) => <IdCell id={row.session_id} />,
      },
      { key: 'model', header: '模型', render: (row) => row.model || '—' },
      { key: 'count', header: '消息数', render: (row) => row.message_count ?? 0 },
      {
        key: 'last',
        header: '最后消息',
        render: (row) => (row.last_message_at ? formatDateTime(row.last_message_at) : '—'),
      },
      {
        key: 'updated',
        header: '更新',
        render: (row) => formatDateTime(row.updated_at),
      },
      {
        key: 'actions',
        header: '',
        render: (row) => (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => openSessionMessages(row.session_id)}>
            查看消息
          </button>
        ),
      },
    ],
    [],
  )

  const messageColumns = useMemo(
    (): AdminTableColumn<MessageRow>[] => [
      { key: 'time', header: '时间', render: (row) => formatDateTime(row.created_at) },
      {
        key: 'user',
        header: '用户',
        render: (row) => (
          <>
            {row.username || '—'}
            <br />
            <IdCell id={row.user_id} />
          </>
        ),
      },
      {
        key: 'role',
        header: '角色',
        render: (row) => (
          <span className={`pill pill-${row.role === 'user' ? 'primary' : 'muted'}`}>{row.role}</span>
        ),
      },
      { key: 'content', header: '内容', cellClassName: 'cell-pre', render: (row) => row.content },
      {
        key: 'session',
        header: 'Session',
        render: (row) => <IdCell id={row.session_id} />,
      },
    ],
    [],
  )

  return (
    <TabbedPageLayout
      title="AI 对话日志"
      description="仅记录 App 端用户与 AI 酒馆/聊天的对话（RecordLlmChatTurn）。Bot 试跑发帖、memory_* 工具调用请分别看「AI 大脑·发帖流水线」与「工具与 Bot·调用审计」。"
      metrics={[{ label: '匹配结果', value: loading ? '…' : total }]}
      headActions={
        tab === 'messages' ? (
          <button type="button" className="btn btn-secondary" disabled={exporting} onClick={() => void exportCsv()}>
            {exporting ? '导出中…' : '导出 CSV'}
          </button>
        ) : undefined
      }
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
    >
      {message ? <p className="form-hint ok">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      <AdminPanel>
        <AdminToolbar
          search={
            tab === 'messages'
              ? {
                  value: filters.keyword,
                  onChange: (v) => setFilters((f) => ({ ...f, keyword: v })),
                  onSubmit: applyFilters,
                  placeholder: '内容关键词',
                  submitLabel: '筛选',
                }
              : {
                  value: filters.userId,
                  onChange: (v) => setFilters((f) => ({ ...f, userId: v })),
                  onSubmit: applyFilters,
                  placeholder: '用户 ID',
                  submitLabel: '筛选',
                }
          }
          filters={
            <div className="admin-filter-grid">
              {tab === 'messages' ? (
                <>
                  <AdminFilterInput
                    label="用户"
                    value={filters.userId}
                    onChange={(v) => setFilters((f) => ({ ...f, userId: v }))}
                    placeholder="用户 ID"
                  />
                  <AdminFilterInput
                    label="Session"
                    value={filters.sessionId}
                    onChange={(v) => setFilters((f) => ({ ...f, sessionId: v }))}
                    placeholder="可选"
                  />
                  <AdminFilterPills
                    ariaLabel="消息角色"
                    value={filters.role}
                    onChange={(v) => setFilters((f) => ({ ...f, role: v }))}
                    options={[
                      { value: '', label: '全部' },
                      { value: 'user', label: 'user' },
                      { value: 'assistant', label: 'assistant' },
                      { value: 'system', label: 'system' },
                    ]}
                  />
                </>
              ) : (
                <AdminFilterInput
                  label="Session"
                  value={filters.sessionId}
                  onChange={(v) => setFilters((f) => ({ ...f, sessionId: v }))}
                  placeholder="可选"
                />
              )}
              <AdminFilterInput
                label="从"
                type="date"
                value={filters.from}
                onChange={(v) => setFilters((f) => ({ ...f, from: v }))}
              />
              <AdminFilterInput
                label="到"
                type="date"
                value={filters.to}
                onChange={(v) => setFilters((f) => ({ ...f, to: v }))}
              />
              <div className="admin-filter-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={resetFilters}>
                  重置
                </button>
              </div>
            </div>
          }
        />
        {tab === 'sessions' ? (
          <AdminTable columns={sessionColumns} rows={sessions} rowKey={(row) => row.id} loading={loading} />
        ) : (
          <AdminTable columns={messageColumns} rows={messages} rowKey={(row) => row.id} loading={loading} />
        )}
        {totalPages > 1 ? (
          <AdminPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        ) : null}
      </AdminPanel>
    </TabbedPageLayout>
  )
}
