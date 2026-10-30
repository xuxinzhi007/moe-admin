import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminTag } from '../components/AdminTag'
import { AiAgentEditDrawer, type AiAgentRow } from '../components/AiAgentEditDrawer'
import { IdCell } from '../components/IdCell'
import { UserCell } from '../components/UserCell'
import { useAdminAuth } from '../context/AdminAuthContext'
import { useDeploy } from '../context/DeployContext'
import { DeployApiError } from '../api/deployClient'
import { AdminTable, AdminToolbar, ListPageLayout } from '../ui'
import type { AdminTableColumn } from '../ui'

export function AiAgentsPage() {
  const navigate = useNavigate()
  const { client } = useAdminAuth()
  const { showToast } = useDeploy()
  const [items, setItems] = useState<AiAgentRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editRow, setEditRow] = useState<AiAgentRow | null>(null)
  const [models, setModels] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const pageSize = 20

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await client.listAiAgents({ page, page_size: pageSize, keyword: search || undefined })
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
  }, [client, page, search])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void client
      .getMoeInferenceStatus()
      .then((res) => {
        if (res.success && res.data?.models) {
          setModels(res.data.models)
        }
      })
      .catch(() => {
        // 推理探测失败时不阻塞酒馆列表
      })
  }, [client])

  function parseName(payload: string) {
    try {
      const o = JSON.parse(payload) as { name?: string }
      return o.name || '—'
    } catch {
      return '—'
    }
  }

  async function saveAgent(payloadJson: string) {
    if (!editRow) return
    setSaving(true)
    setFormError('')
    try {
      const res = await client.updateAiAgent({
        user_id: editRow.owner_user_id,
        agent_id: editRow.id,
        payload_json: payloadJson,
      })
      if (!res.success) {
        setFormError(res.message || '保存失败')
        return
      }
      showToast('角色卡已更新')
      setEditRow(null)
      await load()
    } catch (e) {
      setFormError(e instanceof DeployApiError ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const columns = useMemo(
    (): AdminTableColumn<AiAgentRow>[] => [
      { key: 'id', header: 'Agent ID', render: (row) => <IdCell id={row.id} /> },
      {
        key: 'name',
        header: '角色名',
        render: (row) => <AdminTag label={parseName(row.payload_json)} tone="purple" />,
      },
      {
        key: 'owner',
        header: '所属用户',
        render: (row) => (
          <UserCell name={row.owner_name || row.owner_user_id} sub={`UID ${row.owner_user_id}`} />
        ),
      },
      {
        key: 'actions',
        header: '',
        render: (row) => (
          <div className="btn-row">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => navigate(`/ai/playground?agent=${encodeURIComponent(row.id)}`)}
            >
              试聊
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setFormError('')
                setEditRow(row)
              }}
            >
              编辑
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={async () => {
                if (!confirm('删除该 Agent？')) return
                const res = await client.deleteAiAgent({
                  user_id: row.owner_user_id,
                  agent_id: row.id,
                })
                if (!res.success) setError(res.message || '删除失败')
                else await load()
              }}
            >
              删除
            </button>
          </div>
        ),
      },
    ],
    [client, load, navigate],
  )

  return (
    <>
      <ListPageLayout
        title="AI 角色酒馆"
        description="公开 Agent 列表与治理 · 可编辑角色卡 JSON 核心字段"
        metrics={[{ label: '公开 Agent', value: loading ? '…' : total }]}
        toolbar={
          <AdminToolbar
            search={{
              value: keyword,
              onChange: setKeyword,
              onSubmit: () => {
                setPage(1)
                setSearch(keyword.trim())
              },
              placeholder: '搜索角色名 / 用户',
            }}
          />
        }
        error={error}
        pagination={{ page, totalPages, total, onPageChange: setPage }}
      >
        <AdminTable
          columns={columns}
          rows={items}
          rowKey={(row) => `${row.owner_user_id}-${row.id}`}
          loading={loading}
          emptyText="暂无公开 Agent"
        />
      </ListPageLayout>

      <AiAgentEditDrawer
        row={editRow}
        saving={saving}
        error={formError}
        models={models}
        onClose={() => setEditRow(null)}
        onSave={(json) => void saveAgent(json)}
      />
    </>
  )
}
