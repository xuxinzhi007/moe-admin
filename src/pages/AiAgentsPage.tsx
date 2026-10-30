import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminTag } from '../components/AdminTag'
import {
  AiAgentEditDrawer,
  parseAgentPayload,
  type AiAgentRow,
  type SaveAiAgentInput,
} from '../components/AiAgentEditDrawer'
import { IdCell } from '../components/IdCell'
import { InferenceStatusBar } from '../components/InferenceStatusBar'
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
      const res = await client.listAiAgents({
        page,
        page_size: pageSize,
        keyword: search || undefined,
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
  }, [client, page, search])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(timer)
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

  function openCreateDrawer() {
    setFormError('')
    setEditRow({
      id: `agent_${Date.now().toString(36)}`,
      owner_user_id: '1',
      owner_name: '官方酒馆',
      payload_json: JSON.stringify({
        name: '',
        description: '',
        system_prompt: '',
        model_name: models[0] || '',
        persona: '',
        scenario: '',
        opening_message: '',
        is_public: true,
      }),
      isNew: true,
    })
  }

  async function saveAgent(input: SaveAiAgentInput) {
    setSaving(true)
    setFormError('')
    try {
      if (input.syncOllama && input.ollamaModelName) {
        const modelRes = await client.createMoeInferenceModel({
          name: input.ollamaModelName.toLowerCase(),
          base_model: input.baseModel,
          system_prompt: input.systemPrompt,
          replace_existing: true,
        })
        if (!modelRes.success) {
          setFormError(modelRes.message || '同步创建 Ollama 模型失败')
          return
        }
      }

      const res = await client.updateAiAgent({
        user_id: input.userId,
        agent_id: input.agentId,
        payload_json: input.payloadJson,
      })
      if (!res.success) {
        setFormError(res.message || '保存角色卡失败')
        return
      }
      showToast(
        input.syncOllama && input.ollamaModelName
          ? `角色卡已保存，并已同步生成 Ollama 模型 ${input.ollamaModelName}`
          : editRow?.isNew
            ? '新角色卡已创建'
            : '角色卡已更新',
      )
      setEditRow(null)
      await load()
    } catch (e) {
      setFormError(e instanceof DeployApiError ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const boundModelCount = useMemo(
    () =>
      items.filter((row) => {
        const parsed = parseAgentPayload(row.payload_json)
        return Boolean(parsed.model_name.trim())
      }).length,
    [items],
  )

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const columns = useMemo(
    (): AdminTableColumn<AiAgentRow>[] => [
      {
        key: 'name',
        header: '角色 / Agent ID',
        render: (row) => {
          const parsed = parseAgentPayload(row.payload_json)
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div className="btn-row" style={{ gap: 6 }}>
                <strong>{parsed.name || '未命名角色'}</strong>
                <AdminTag
                  label={parsed.is_public ? '公开' : '私密'}
                  tone={parsed.is_public ? 'ok' : 'neutral'}
                />
              </div>
              <IdCell id={row.id} />
            </div>
          )
        },
      },
      {
        key: 'summary',
        header: '简介与开场白',
        render: (row) => {
          const parsed = parseAgentPayload(row.payload_json)
          return (
            <div style={{ maxWidth: 360 }}>
              <div>{parsed.description || <span className="muted">暂无角色简介</span>}</div>
              {parsed.opening_message ? (
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  开场白：「{parsed.opening_message.slice(0, 48)}
                  {parsed.opening_message.length > 48 ? '…' : ''}」
                </div>
              ) : null}
            </div>
          )
        },
      },
      {
        key: 'model',
        header: '绑定模型',
        render: (row) => {
          const parsed = parseAgentPayload(row.payload_json)
          const modelName = parsed.model_name.trim()
          if (!modelName) {
            return <span className="muted">跟随默认模型</span>
          }
          const online = models.length === 0 || models.includes(modelName)
          return (
            <AdminTag
              label={online ? modelName : `${modelName} · 未挂载`}
              tone={online ? 'info' : 'warn'}
            />
          )
        },
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
              去试聊
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
              className="btn btn-ghost btn-sm text-danger"
              onClick={async () => {
                if (!confirm('确认删除该角色卡？')) return
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
    [client, load, models, navigate],
  )

  return (
    <>
      <ListPageLayout
        title="AI 角色酒馆"
        description="统一管理全站与用户的 AI 角色卡（人设、开场白、绑定模型）· 支持新建角色并同步生成 Ollama 派生模型"
        envNote="角色卡为唯一角色数据源 · 修改后在 App 酒馆与管理台试聊台即时生效"
        metrics={[
          { label: '酒馆角色总数', value: loading ? '…' : total },
          { label: '本页指定模型', value: boundModelCount },
          { label: '在线可用模型', value: models.length },
        ]}
        headActions={
          <div className="btn-row">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigate('/ai/playground?mode=agent')}
            >
              打开角色试聊台
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={openCreateDrawer}
            >
              新建角色卡
            </button>
          </div>
        }
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
        <InferenceStatusBar agentKey="" />
        <AdminTable
          columns={columns}
          rows={items}
          rowKey={(row) => `${row.owner_user_id}-${row.id}`}
          loading={loading}
          emptyText="暂无角色卡，点击右上角「新建角色卡」创建第一个 AI 角色"
        />
      </ListPageLayout>

      <AiAgentEditDrawer
        row={editRow}
        saving={saving}
        error={formError}
        models={models}
        onClose={() => setEditRow(null)}
        onSave={(input) => void saveAgent(input)}
      />
    </>
  )
}
