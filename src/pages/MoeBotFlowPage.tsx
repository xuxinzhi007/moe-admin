import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AdminIcon } from '../components/AdminIcon'
import { BotFlowCanvas } from '../components/bot-flow/BotFlowCanvas'
import { InferenceStatusBar } from '../components/InferenceStatusBar'
import { FormField } from '../components/FormField'
import { useAdminAuth } from '../context/AdminAuthContext'
import { DeployApiError } from '../api/deployClient'
import type { MoeBotFlowData, MoeBrainPipelineData } from '../api/adminClient'
import { clientDefaultFlow } from '../lib/botFlowTemplate'
import { normalizeBotFlowData } from '../lib/botFlowData'
import { openMoeBrainPipelineWs, waitMoeBrainPipelineWs } from '../lib/moePipelineWs'
import { normalizePipelineData } from '../lib/pipelineData'
import { asArray } from '../lib/apiRecord'
import { MonitorPageLayout } from '../ui'

type RuntimeRow = { agent_key: string; display_name: string }
type ToolRow = { name: string; description: string }

export function MoeBotFlowPage() {
  const { client } = useAdminAuth()
  const [params, setParams] = useSearchParams()
  const agentKey = params.get('agent')?.trim() || 'moe_guide'

  const [agents, setAgents] = useState<RuntimeRow[]>([])
  const [pipeline, setPipeline] = useState<MoeBrainPipelineData | null>(null)
  const [flow, setFlow] = useState<MoeBotFlowData | null>(null)
  const [tools, setTools] = useState<ToolRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [runningOnce, setRunningOnce] = useState(false)
  const [error, setError] = useState('')
  const [pollTick, setPollTick] = useState(0)

  const agentLabel = useMemo(() => {
    const hit = agents.find((a) => a.agent_key === agentKey)
    return hit?.display_name ? `${hit.display_name}` : agentKey
  }, [agents, agentKey])

  const loadAgents = useCallback(async () => {
    try {
      const res = await client.listMoeRuntimes()
      if (res.success && res.data) {
        setAgents(
          asArray<{ agent_key: string; display_name?: string }>(res.data.items).map((it) => ({
            agent_key: it.agent_key,
            display_name: it.display_name || it.agent_key,
          })),
        )
      }
    } catch {
      /* optional */
    }
  }, [client])

  const loadPipeline = useCallback(async () => {
    if (!agentKey) return
    try {
      const res = await client.getMoeBrainPipeline(agentKey)
      if (res.success && res.data) {
        setPipeline(normalizePipelineData(res.data))
      }
    } catch {
      /* pipeline optional for canvas */
    }
  }, [agentKey, client])

  const loadFlow = useCallback(async () => {
    if (!agentKey) return
    setLoading(true)
    setError('')
    try {
      const res = await client.getMoeBotFlow(agentKey)
      if (res.success && res.data) {
        const normalized = normalizeBotFlowData(res.data)
        if (normalized.nodes.length > 0) {
          setFlow(normalized)
        } else {
          setFlow(clientDefaultFlow(agentKey))
        }
      } else {
        setFlow(clientDefaultFlow(agentKey))
        if (!res.success) {
          setError(res.message || '接口未返回画布，已显示本地默认图')
        }
      }
    } catch (e) {
      setFlow(clientDefaultFlow(agentKey))
      setError(
        e instanceof DeployApiError
          ? `${e.message}（已显示本地默认图，保存可写入服务端）`
          : '加载失败，已显示本地默认图',
      )
    } finally {
      setLoading(false)
    }
  }, [agentKey, client])

  const loadTools = useCallback(async () => {
    try {
      const res = await client.getMoeToolsSchema()
      if (res.success && res.data) {
        setTools(
          asArray<{ name: string; description?: string }>(res.data.tools).map((t) => ({
            name: t.name,
            description: t.description || '',
          })),
        )
      }
    } catch {
      /* optional */
    }
  }, [client])

  useEffect(() => {
    void loadAgents()
    void loadTools()
  }, [loadAgents, loadTools])

  useEffect(() => {
    void loadFlow()
  }, [agentKey, loadFlow])

  useEffect(() => {
    void loadPipeline()
  }, [agentKey, loadPipeline, pollTick])

  useEffect(() => {
    const t = window.setInterval(() => setPollTick((n) => n + 1), 4000)
    return () => window.clearInterval(t)
  }, [])

  const pipelineRunning = Boolean(pipeline?.running)
  const runActive = runningOnce || pipelineRunning

  useEffect(() => {
    if (!runActive || !agentKey.trim()) return
    const url = client.brainPipelineWsUrl(agentKey)
    const handle = openMoeBrainPipelineWs(url, (next) => setPipeline(next))
    return () => handle.close()
  }, [runActive, agentKey, client])

  const saveFlow = useCallback(
    async (payload: {
      nodes: MoeBotFlowData['nodes']
      edges: MoeBotFlowData['edges']
      viewport_zoom?: number
      viewport_x?: number
      viewport_y?: number
    }) => {
      setSaving(true)
      setError('')
      try {
        const res = await client.putMoeBotFlow(agentKey, payload)
        if (res.success && res.data) {
          setFlow(normalizeBotFlowData(res.data))
        } else {
          setError(res.message || '保存失败')
        }
      } catch (e) {
        setError(e instanceof DeployApiError ? e.message : '保存失败')
      } finally {
        setSaving(false)
      }
    },
    [agentKey, client],
  )

  async function runOnce() {
    setRunningOnce(true)
    setError('')
    try {
      const res = await client.runMoeAgentOnce(agentKey, { async: true })
      if (!res.success) {
        setError(res.message || '试跑失败')
        return
      }
      if (res.data?.already_running) {
        setError('该 Bot 正在试跑中')
        return
      }
      if (res.data?.accepted) {
        await waitMoeBrainPipelineWs(client.brainPipelineWsUrl(agentKey))
      }
      setPollTick((n) => n + 1)
    } catch (e) {
      setError(e instanceof DeployApiError ? e.message : '试跑失败')
    } finally {
      setRunningOnce(false)
    }
  }

  async function resetToDefault() {
    setSaving(true)
    setError('')
    try {
      const res = await client.deleteMoeBotFlow(agentKey)
      if (res.success && res.data) {
        setFlow(normalizeBotFlowData(res.data))
      } else {
        setError(res.message || '重置失败')
      }
    } catch (e) {
      setError(e instanceof DeployApiError ? e.message : '重置失败')
    } finally {
      setSaving(false)
    }
  }

  const steps = useMemo(() => pipeline?.steps ?? [], [pipeline?.steps])
  const toolsInvoked = useMemo(
    () =>
      (pipeline?.tools_invoked ?? []).map((t) => ({
        tool: t.tool,
        ok: t.ok,
      })),
    [pipeline?.tools_invoked],
  )
  const hasRun = Boolean(pipeline?.run_at?.trim())
  const runStateLabel = runActive
    ? pipeline?.current_phase
      ? `试跑中·${pipeline.current_phase}`
      : '试跑中'
    : !hasRun
      ? '待机'
      : pipeline?.ok
        ? '成功'
        : '失败'

  const metrics = [
    { label: '运行态', value: runStateLabel },
    {
      label: '稳定度',
      value:
        pipeline?.stability_score !== undefined && pipeline.stability_score > 0
          ? String(pipeline.stability_score)
          : '—',
    },
    { label: '步骤数', value: String(steps.length) },
    { label: '画布', value: flow?.is_default ? '默认模板' : '已保存' },
  ]

  return (
    <MonitorPageLayout
      title="Bot 编排画布"
      description="中心 Bot 接入工具卡片：保存能力配置；发帖试跑走内置流水线，步骤见 AI 大脑。"
      metrics={metrics}
      headActions={
        <div className="btn-row page-head-toolbar">
          <Link className="btn btn-ghost btn-sm" to={`/ai/moe-brain?agent=${encodeURIComponent(agentKey)}`}>
            <AdminIcon name="bot" />
            AI 大脑
          </Link>
          <button type="button" className="btn btn-ghost btn-sm" disabled={saving} onClick={() => void resetToDefault()}>
            恢复默认模板
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={runningOnce}
            onClick={() => void runOnce()}
          >
            {runningOnce ? '试跑中…' : '试跑发帖'}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={loading} onClick={() => setPollTick((n) => n + 1)}>
            刷新状态
          </button>
        </div>
      }
      error={error || undefined}
    >
      <InferenceStatusBar agentKey={agentKey} refreshKey={pollTick} />

      <section className="panel content-panel-table">
        <div className="content-toolbar">
          <div className="content-toolbar-head">
            <strong>选择 Bot</strong>
            <span>连线表示能力/流程示意；实际发帖仍走后端 pipeline 代码路径。</span>
          </div>
        </div>
        <div className="brain-object-select" style={{ maxWidth: 360, padding: '0 16px 16px' }}>
          <FormField label="Agent">
            <select
              value={agentKey}
              onChange={(e) => {
                setParams({ agent: e.target.value })
              }}
            >
              {agents.length === 0 ? (
                <option value={agentKey}>{agentKey}</option>
              ) : (
                agents.map((a) => (
                  <option key={a.agent_key} value={a.agent_key}>
                    {a.display_name} ({a.agent_key})
                  </option>
                ))
              )}
            </select>
          </FormField>
        </div>
      </section>

      <section className="panel bot-flow-panel">
        {loading && !flow?.nodes?.length ? (
          <p className="muted">加载画布…</p>
        ) : flow && (flow.nodes?.length ?? 0) > 0 ? (
          <BotFlowCanvas
            agentLabel={agentLabel}
            flow={flow}
            tools={tools}
            steps={steps}
            toolsInvoked={toolsInvoked}
            hasRun={hasRun}
            ok={Boolean(pipeline?.ok)}
            runActive={runActive}
            runFeedback={pipeline?.run_feedback}
            saving={saving}
            onSave={saveFlow}
          />
        ) : (
          <p className="muted">画布为空，请点「恢复默认模板」或刷新页面。</p>
        )}
      </section>
    </MonitorPageLayout>
  )
}
