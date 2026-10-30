import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminFilterInput } from '../components/AdminFilterInput'
import { AdminTable, AdminToolbar, AdminPanel, TabbedPageLayout } from '../ui'
import type { AdminTableColumn } from '../ui'
import { useAdminAuth } from '../context/AdminAuthContext'
import { DeployApiError } from '../api/deployClient'

type Tab = 'vip' | 'gift'

const ORDER_TABS: { key: Tab; label: string; hint: string }[] = [
  { key: 'vip', label: 'VIP 订单', hint: '订阅与会员' },
  { key: 'gift', label: '礼物购买', hint: '虚拟礼物订单' },
]

type OrderRow = Record<string, string | number>

export function WalletOrdersPage() {
  const { client } = useAdminAuth()
  const [tab, setTab] = useState<Tab>('vip')
  const [page, setPage] = useState(1)
  const [userId, setUserId] = useState('')
  const [keyword, setKeyword] = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [filterKw, setFilterKw] = useState('')
  const [vipItems, setVipItems] = useState<OrderRow[]>([])
  const [giftItems, setGiftItems] = useState<OrderRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const pageSize = 20

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (tab === 'vip') {
        const res = await client.listVipOrders({
          page,
          page_size: pageSize,
          user_id: filterUser || undefined,
          keyword: filterKw || undefined,
        })
        if (!res.success || !res.data) {
          setError(res.message || '加载失败')
          setVipItems([])
          setTotal(0)
          return
        }
        setVipItems((res.data.items || []) as unknown as OrderRow[])
        setTotal(res.data.total)
      } else {
        const res = await client.listGiftPurchaseOrders({
          page,
          page_size: pageSize,
          user_id: filterUser || undefined,
          keyword: filterKw || undefined,
        })
        if (!res.success || !res.data) {
          setError(res.message || '加载失败')
          setGiftItems([])
          setTotal(0)
          return
        }
        setGiftItems((res.data.items || []) as unknown as OrderRow[])
        setTotal(res.data.total)
      }
    } catch (e) {
      setError(e instanceof DeployApiError ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [client, tab, page, filterUser, filterKw])

  useEffect(() => {
    void load()
  }, [load])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const rows = tab === 'vip' ? vipItems : giftItems

  const vipColumns = useMemo(
    (): AdminTableColumn<OrderRow>[] => [
      { key: 'order_no', header: '订单号', render: (row) => row.order_no },
      { key: 'user', header: '用户', render: (row) => row.user_id },
      { key: 'plan', header: '套餐', render: (row) => row.plan_name },
      { key: 'amount', header: '金额', render: (row) => `¥${Number(row.amount).toFixed(2)}` },
      { key: 'status', header: '状态', render: (row) => row.status },
      { key: 'time', header: '时间', render: (row) => row.created_at },
    ],
    [],
  )

  const giftColumns = useMemo(
    (): AdminTableColumn<OrderRow>[] => [
      { key: 'order_no', header: '订单号', render: (row) => row.order_no },
      { key: 'user', header: '用户', render: (row) => row.user_id },
      { key: 'gift', header: '礼物', render: (row) => row.gift_name },
      { key: 'qty', header: '数量', render: (row) => row.quantity },
      { key: 'amount', header: '金额', render: (row) => row.total_amount },
      { key: 'status', header: '状态', render: (row) => row.status },
      { key: 'time', header: '时间', render: (row) => row.created_at },
    ],
    [],
  )

  return (
    <TabbedPageLayout
      title="钱包与订单"
      description="VIP 订阅与礼物购买订单（只读查询）"
      metrics={[{ label: '匹配结果', value: loading ? '…' : total }]}
      tabs={ORDER_TABS}
      activeTab={tab}
      onTabChange={(next) => {
        setTab(next)
        setPage(1)
      }}
    >
      <AdminPanel>
        <AdminToolbar
          search={{
            value: keyword,
            onChange: setKeyword,
            onSubmit: () => {
              setPage(1)
              setFilterUser(userId.trim())
              setFilterKw(keyword.trim())
            },
            placeholder: '订单号 / 礼物名',
            submitLabel: '筛选',
          }}
          filters={
            <AdminFilterInput
              label="用户"
              value={userId}
              onChange={setUserId}
              placeholder="用户 ID"
              ariaLabel="按用户 ID 筛选"
            />
          }
        />
        {error ? <p className="text-danger">{error}</p> : null}
        <AdminTable
          columns={tab === 'vip' ? vipColumns : giftColumns}
          rows={rows}
          rowKey={(row) => String(row.id)}
          loading={loading}
          emptyText="暂无订单"
        />
        {totalPages > 1 ? (
          <div className="pager">
            <button type="button" className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              上一页
            </button>
            <span className="muted">
              {page}/{totalPages} · 共 {total} 条
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
  )
}
