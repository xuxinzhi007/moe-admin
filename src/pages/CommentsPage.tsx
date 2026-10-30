import { useCallback, useEffect, useMemo, useState } from 'react'
import { IdCell } from '../components/IdCell'
import { UserCell } from '../components/UserCell'
import { useAdminAuth } from '../context/AdminAuthContext'
import { formatDateTime } from '../lib/format'
import { DeployApiError } from '../api/deployClient'
import { AdminFilterInput } from '../components/AdminFilterInput'
import { AdminTable, AdminToolbar, ListPageLayout } from '../ui'
import type { AdminTableColumn } from '../ui'

type CommentRow = {
  id: string
  post_id: string
  user_name: string
  content: string
  created_at: string
}

export function CommentsPage() {
  const { client } = useAdminAuth()
  const [items, setItems] = useState<CommentRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [postId, setPostId] = useState('')
  const [search, setSearch] = useState('')
  const [filterPost, setFilterPost] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const pageSize = 30

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await client.listComments({
        page,
        page_size: pageSize,
        keyword: search || undefined,
        post_id: filterPost || undefined,
      })
      if (!res.success || !res.data) {
        setError(res.message || '加载失败')
        return
      }
      setItems(res.data.items || [])
      setTotal(res.data.total || 0)
    } catch (e) {
      setError(e instanceof DeployApiError ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [client, page, search, filterPost])

  useEffect(() => {
    void load()
  }, [load])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const columns = useMemo(
    (): AdminTableColumn<CommentRow>[] => [
      { key: 'id', header: 'ID', render: (row) => <IdCell id={row.id} /> },
      { key: 'post', header: '动态', render: (row) => <IdCell id={row.post_id} /> },
      { key: 'user', header: '用户', render: (row) => <UserCell name={row.user_name} /> },
      {
        key: 'content',
        header: '内容',
        cellClassName: 'cell-content',
        render: (row) => (
          <span className={`cell-clamp${row.content?.trim() ? '' : ' is-empty'}`} title={row.content}>
            {row.content?.trim() || '—'}
          </span>
        ),
      },
      {
        key: 'time',
        header: '时间',
        cellClassName: 'cell-muted cell-nowrap',
        render: (row) => formatDateTime(row.created_at),
      },
      {
        key: 'actions',
        header: '',
        cellClassName: 'cell-actions',
        render: (row) => (
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-danger"
            onClick={async () => {
              if (!confirm('删除该评论？')) return
              const res = await client.deleteComment(row.id)
              if (!res.success) setError(res.message || '删除失败')
              else await load()
            }}
          >
            删除
          </button>
        ),
      },
    ],
    [client, load],
  )

  function applySearch() {
    setPage(1)
    setSearch(keyword.trim())
    setFilterPost(postId.trim())
  }

  return (
    <ListPageLayout
      title="评论管理"
      description="按动态或关键词检索评论并下架"
      metrics={[{ label: '匹配结果', value: loading ? '…' : total }]}
      toolbar={
        <AdminToolbar
          search={{
            value: keyword,
            onChange: setKeyword,
            onSubmit: applySearch,
            placeholder: '评论内容',
          }}
          filters={
            <AdminFilterInput
              label="动态"
              value={postId}
              onChange={setPostId}
              placeholder="动态 ID"
              ariaLabel="按动态 ID 筛选"
            />
          }
        />
      }
      error={error}
      pagination={{ page, totalPages, total, onPageChange: setPage }}
    >
      <AdminTable columns={columns} rows={items} rowKey={(row) => row.id} loading={loading} emptyText="暂无评论" />
    </ListPageLayout>
  )
}
