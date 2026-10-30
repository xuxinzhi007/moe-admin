import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminTag } from '../components/AdminTag'
import { IdCell } from '../components/IdCell'
import { PostContentPreview } from '../components/PostContentPreview'
import { UserCell } from '../components/UserCell'
import { useAdminAuth } from '../context/AdminAuthContext'
import { useDrawerDismiss } from '../hooks/useDrawerDismiss'
import { reportReasonTag } from '../lib/adminLabels'
import { formatDateTime } from '../lib/format'
import { AdminFilterPills } from '../components/AdminFilterPills'
import { DeployApiError } from '../api/deployClient'
import { AdminTable, AdminToolbar, ListPageLayout } from '../ui'
import type { AdminTableColumn } from '../ui'

type ReportRow = {
  id: string
  post_id: string
  reporter_user_id: string
  reporter_user_name?: string
  reporter_user_avatar?: string
  post_author_id?: string
  post_author_name?: string
  post_author_avatar?: string
  reason: string
  post_content_preview: string
  post_content?: string
  post_images?: string[]
  hand_draw_thumb_url?: string
  has_hand_draw?: boolean
  created_at: string
}

function previewLabel(row: ReportRow) {
  if (row.hand_draw_thumb_url?.trim() || row.has_hand_draw) return '手绘动态'
  if ((row.post_images?.length ?? 0) > 0) return '图片动态'
  const text = (row.post_content_preview || row.post_content || '').trim()
  if (!text) return '—'
  if (text.length <= 32) return text
  return `${text.slice(0, 32)}…`
}

export function ReportsPage() {
  const { client } = useAdminAuth()
  const [items, setItems] = useState<ReportRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [detailRow, setDetailRow] = useState<ReportRow | null>(null)
  /** 本页客户端筛选（接口暂无 reason 参数） */
  const [reasonFilter, setReasonFilter] = useState('')
  const pageSize = 30

  useDrawerDismiss(detailRow !== null, () => setDetailRow(null))

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await client.listPostReports({ page, page_size: pageSize })
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
  }, [client, page])

  useEffect(() => {
    void load()
  }, [load])

  const filteredItems = useMemo(() => {
    if (!reasonFilter) return items
    return items.filter((row) =>
      (row.reason || '').toLowerCase().includes(reasonFilter.toLowerCase()),
    )
  }, [items, reasonFilter])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const columns = useMemo(
    (): AdminTableColumn<ReportRow>[] => [
      { key: 'id', header: 'ID', render: (row) => <IdCell id={row.id} /> },
      {
        key: 'post',
        header: '动态',
        render: (row) => (
          <div className="user-cell-text">
            <span className="user-cell-name">{row.post_author_name || `动态 #${row.post_id}`}</span>
            <span className="user-cell-sub muted">
              <IdCell id={row.post_id} title="动态 ID" />
            </span>
          </div>
        ),
      },
      {
        key: 'reporter',
        header: '举报人',
        render: (row) => (
          <UserCell
            name={row.reporter_user_name}
            avatar={row.reporter_user_avatar}
            sub={row.reporter_user_id ? `UID ${row.reporter_user_id}` : undefined}
          />
        ),
      },
      {
        key: 'reason',
        header: '原因',
        render: (row) => <AdminTag spec={reportReasonTag(row.reason)} />,
      },
      {
        key: 'preview',
        header: '预览',
        render: (row) => (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ maxWidth: 220, textAlign: 'left', whiteSpace: 'normal' }}
            onClick={() => setDetailRow(row)}
          >
            {previewLabel(row)}
          </button>
        ),
      },
      {
        key: 'time',
        header: '时间',
        cellClassName: 'muted',
        render: (row) => formatDateTime(row.created_at),
      },
      {
        key: 'actions',
        header: '',
        render: (row) => (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDetailRow(row)}>
              查看详情
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={async () => {
                if (!confirm('删除被举报动态？')) return
                const res = await client.deletePost(row.post_id)
                if (!res.success) setError(res.message || '删除失败')
                else await load()
              }}
            >
              删动态
            </button>
          </div>
        ),
      },
    ],
    [client, load],
  )

  return (
    <>
      <ListPageLayout
        title="举报处理"
        description="用户举报动态记录，可预览正文、图片与手绘缩略图"
        metrics={[
          { label: '待处理举报', value: loading ? '…' : total },
          {
            label: '本页匹配',
            value: loading ? '…' : String(filteredItems.length),
            hint: reasonFilter ? `原因含「${reasonFilter}」` : '当前页',
          },
        ]}
        toolbar={
          <AdminToolbar
            filters={
              <AdminFilterPills
                ariaLabel="举报原因"
                value={reasonFilter}
                onChange={setReasonFilter}
                options={[
                  { value: '', label: '全部原因' },
                  { value: 'spam', label: 'spam' },
                  { value: 'abuse', label: 'abuse' },
                  { value: '违规', label: '违规' },
                ]}
              />
            }
          />
        }
        error={error}
        pagination={{ page, totalPages, total, onPageChange: setPage }}
      >
        <AdminTable
          columns={columns}
          rows={filteredItems}
          rowKey={(row) => row.id}
          loading={loading}
          emptyText="暂无举报"
        />
      </ListPageLayout>

      {detailRow ? (
        <div className="drawer-backdrop" role="presentation" onClick={() => setDetailRow(null)}>
          <p className="drawer-backdrop-hint">点击空白处或按 Esc 关闭</p>
          <aside
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="举报详情"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-head">
              <div>
                <h3>举报详情</h3>
                <p className="drawer-subtitle">
                  举报 #{detailRow.id} · 动态 #{detailRow.post_id}
                </p>
              </div>
              <button type="button" className="btn btn-ghost drawer-close" onClick={() => setDetailRow(null)}>
                ✕
              </button>
            </div>
            <div className="drawer-body">
              <dl className="moe-call-detail-grid">
                <div>
                  <dt>举报时间</dt>
                  <dd>{formatDateTime(detailRow.created_at)}</dd>
                </div>
                <div>
                  <dt>举报原因</dt>
                  <dd>
                    <AdminTag spec={reportReasonTag(detailRow.reason)} />
                  </dd>
                </div>
                <div>
                  <dt>举报人</dt>
                  <dd>
                    <UserCell
                      name={detailRow.reporter_user_name}
                      avatar={detailRow.reporter_user_avatar}
                      sub={detailRow.reporter_user_id ? `UID ${detailRow.reporter_user_id}` : undefined}
                      size="md"
                    />
                    {detailRow.reporter_user_id ? (
                      <p className="muted" style={{ marginTop: 8 }}>
                        <Link to="/biz/users">打开用户详情</Link>
                      </p>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt>动态作者</dt>
                  <dd>
                    <UserCell
                      name={detailRow.post_author_name}
                      avatar={detailRow.post_author_avatar}
                      sub={detailRow.post_author_id ? `UID ${detailRow.post_author_id}` : undefined}
                      size="md"
                    />
                    {detailRow.post_author_id ? (
                      <p className="muted" style={{ marginTop: 8 }}>
                        <Link to="/biz/users">打开用户详情</Link>
                      </p>
                    ) : null}
                  </dd>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <dt>动态内容</dt>
                  <dd>
                    <PostContentPreview
                      content={detailRow.post_content || detailRow.post_content_preview}
                      images={detailRow.post_images}
                      handDrawThumbUrl={detailRow.hand_draw_thumb_url}
                    />
                  </dd>
                </div>
              </dl>
            </div>
            <div className="drawer-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setDetailRow(null)}>
                关闭
              </button>
              <Link to="/biz/content/posts" className="btn btn-ghost">
                动态审核
              </Link>
              <button
                type="button"
                className="btn btn-primary"
                onClick={async () => {
                  if (!confirm('删除被举报动态？')) return
                  const res = await client.deletePost(detailRow.post_id)
                  if (!res.success) setError(res.message || '删除失败')
                  else {
                    setDetailRow(null)
                    await load()
                  }
                }}
              >
                删动态
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  )
}
