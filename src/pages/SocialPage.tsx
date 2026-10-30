import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdminTag } from '../components/AdminTag'
import { IdCell } from '../components/IdCell'
import { UserCell } from '../components/UserCell'
import { useAdminAuth } from '../context/AdminAuthContext'
import { friendRequestTag } from '../lib/adminLabels'
import { formatDateTime } from '../lib/format'
import { DeployApiError } from '../api/deployClient'
import { AdminPanel, AdminTable, AdminToolbar, TabbedPageLayout } from '../ui'
import type { AdminTableColumn } from '../ui'

type Tab = 'follows' | 'requests'

type FollowRow = {
  id: string
  follower_id?: string
  follower_name: string
  following_id?: string
  following_name: string
  created_at: string
}

type RequestRow = {
  id: string
  from_user_id?: string
  from_user_name: string
  to_user_id?: string
  to_user_name: string
  status: string
  created_at: string
}

const TABS = [
  { key: 'follows' as const, label: '关注关系', hint: '单向关注链' },
  { key: 'requests' as const, label: '好友申请', hint: '双向好友请求' },
]

export function SocialPage() {
  const { client } = useAdminAuth()
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'requests' ? 'requests' : 'follows'

  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [follows, setFollows] = useState<FollowRow[]>([])
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const pageSize = 20

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (tab === 'follows') {
        const res = await client.listFollows({
          page,
          page_size: pageSize,
          keyword: search || undefined,
        })
        if (!res.success || !res.data) {
          setError(res.message || '加载失败')
          setFollows([])
          setTotal(0)
          return
        }
        setFollows(res.data.items || [])
        setTotal(res.data.total || 0)
      } else {
        const res = await client.listFriendRequests({
          page,
          page_size: pageSize,
          keyword: search || undefined,
        })
        if (!res.success || !res.data) {
          setError(res.message || '加载失败')
          setRequests([])
          setTotal(0)
          return
        }
        setRequests(res.data.items || [])
        setTotal(res.data.total || 0)
      }
    } catch (e) {
      setError(e instanceof DeployApiError ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [client, page, search, tab])

  useEffect(() => {
    void load()
  }, [load])

  function setTab(next: Tab) {
    setParams({ tab: next })
    setPage(1)
    setKeyword('')
    setSearch('')
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const followColumns = useMemo(
    (): AdminTableColumn<FollowRow>[] => [
      { key: 'id', header: 'ID', render: (row) => <IdCell id={row.id} /> },
      {
        key: 'follower',
        header: '关注者',
        render: (row) => <UserCell name={row.follower_name} sub={`UID ${row.follower_id || '—'}`} />,
      },
      {
        key: 'following',
        header: '被关注',
        render: (row) => <UserCell name={row.following_name} sub={`UID ${row.following_id || '—'}`} />,
      },
      { key: 'time', header: '时间', render: (row) => formatDateTime(row.created_at) },
      {
        key: 'actions',
        header: '',
        render: (row) => (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={async () => {
              if (!confirm('解除该关注关系？')) return
              const res = await client.deleteFollow(row.id)
              if (!res.success) setError(res.message || '删除失败')
              else await load()
            }}
          >
            解除
          </button>
        ),
      },
    ],
    [client, load],
  )

  const requestColumns = useMemo(
    (): AdminTableColumn<RequestRow>[] => [
      { key: 'id', header: 'ID', render: (row) => <IdCell id={row.id} /> },
      {
        key: 'from',
        header: '发起人',
        render: (row) => <UserCell name={row.from_user_name} sub={`UID ${row.from_user_id || '—'}`} />,
      },
      {
        key: 'to',
        header: '接收人',
        render: (row) => <UserCell name={row.to_user_name} sub={`UID ${row.to_user_id || '—'}`} />,
      },
      {
        key: 'status',
        header: '状态',
        render: (row) => <AdminTag spec={friendRequestTag(row.status)} />,
      },
      { key: 'time', header: '时间', render: (row) => formatDateTime(row.created_at) },
    ],
    [],
  )

  return (
    <TabbedPageLayout
      title="好友与关注"
      description="用户关系链只读与治理 · 属于 App 用户维度，展示头像昵称并支持解除关注"
      metrics={[{ label: '匹配结果', value: loading ? '…' : total }]}
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
    >
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
            placeholder: '昵称 / 用户 ID',
          }}
        />
        {tab === 'follows' ? (
          <AdminTable
            columns={followColumns}
            rows={follows}
            rowKey={(row) => row.id}
            loading={loading}
            emptyText="暂无关注关系"
          />
        ) : (
          <AdminTable
            columns={requestColumns}
            rows={requests}
            rowKey={(row) => row.id}
            loading={loading}
            emptyText="暂无好友申请"
          />
        )}
        {totalPages > 1 ? (
          <div className="pager">
            <button type="button" className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              上一页
            </button>
            <span>
              第 {page} / {totalPages} 页 · 共 {total} 条
            </span>
            <button type="button" className="btn btn-ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              下一页
            </button>
          </div>
        ) : null}
      </AdminPanel>
    </TabbedPageLayout>
  )
}
