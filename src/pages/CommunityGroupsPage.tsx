import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAdminAuth } from '../context/AdminAuthContext'
import { DeployApiError } from '../api/deployClient'
import { AdminTable, AdminToolbar, ListPageLayout } from '../ui'
import type { AdminTableColumn } from '../ui'

type GroupRow = {
  id: string
  name: string
  description: string
  creator_name: string
  member_count: number
  status: string
  is_public: boolean
  created_at: string
}

export function CommunityGroupsPage() {
  const { client } = useAdminAuth()
  const [items, setItems] = useState<GroupRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const pageSize = 20

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await client.listGroups({ page, page_size: pageSize, keyword: search || undefined })
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
  }, [client, page, search])

  useEffect(() => {
    void load()
  }, [load])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const columns = useMemo(
    (): AdminTableColumn<GroupRow>[] => [
      { key: 'id', header: 'ID', render: (row) => row.id },
      { key: 'name', header: '名称', render: (row) => row.name },
      { key: 'creator', header: '创建者', render: (row) => row.creator_name },
      { key: 'members', header: '成员', render: (row) => row.member_count },
      { key: 'public', header: '公开', render: (row) => (row.is_public ? '是' : '否') },
      { key: 'status', header: '状态', render: (row) => row.status },
      {
        key: 'actions',
        header: '',
        render: (row) => (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={async () => {
              if (!confirm(`删除社区「${row.name}」？`)) return
              const res = await client.deleteGroup(row.id)
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

  return (
    <ListPageLayout
      title="兴趣社区"
      description="社区小组列表与运营下架"
      metrics={[{ label: '小组数量', value: loading ? '…' : total }]}
      toolbar={
        <AdminToolbar
          search={{
            value: keyword,
            onChange: setKeyword,
            onSubmit: () => {
              setPage(1)
              setSearch(keyword.trim())
            },
            placeholder: '搜索名称 / 简介',
          }}
        />
      }
      error={error}
      pagination={{ page, totalPages, total, onPageChange: setPage }}
    >
      <AdminTable columns={columns} rows={items} rowKey={(row) => row.id} loading={loading} emptyText="暂无社区" />
    </ListPageLayout>
  )
}
