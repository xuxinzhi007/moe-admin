import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { BotFlowCanvas } from '../components/bot-flow/BotFlowCanvas'
import { useAdminAuth } from '../context/AdminAuthContext'
import { DeployApiError } from '../api/deployClient'
import type { MoeBotFlowData, MoeBrainPipelineData } from '../api/adminClient'
import { clientDefaultFlow } from '../lib/botFlowTemplate'
import { normalizeBotFlowData } from '../lib/botFlowData'
import { openMoeBrainPipelineWs } from '../lib/moePipelineWs'
import { normalizePipelineData } from '../lib/pipelineData'
import { asArray } from '../lib/apiRecord'
import { AdminPanel } from '../ui'

type ToolRow = { name: string; description: string }

type FlowPanelProps = {
  agentKey: string
  agentLabel: string
  runningOnce?: boolean
}

export function MoeBotFlowPanel({
  agentKey,
  agentLabel,
  runningOnce = false,
}: FlowPanelProps) {
  const { client } = useAdminAuth()
  const [pipeline, setPipeline] = useState<MoeBrainPipelineData | null>(null)
  const [flow, setFlow] = useState<MoeBotFlowData | null>(null)
  const [tools, setTools] = useState<ToolRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [pollTick, setPollTick] = useState(0)

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
    const timer = window.setTimeout(() => {
      void loadTools()
      void loadFlow()
      void loadPipeline()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadTools, loadFlow, loadPipeline, pollTick])

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

  return (
    <AdminPanel
      title={`流程编排画布 · ${agentLabel}`}
      actions={
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={saving}
            onClick={() => void resetToDefault()}
          >
            恢复默认模板
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={loading}
            onClick={() => setPollTick((n) => n + 1)}
          >
            刷新画布
          </button>
        </div>
      }
    >
      {error ? <p className="text-danger">{error}</p> : null}
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
    </AdminPanel>
  )
}

/** 兼容旧路由 /ai/moe-flow → 重定向至 AI 大脑的流程编排 Tab */
export function MoeBotFlowPage() {
  const [params] = useSearchParams()
  const agent = params.get('agent')?.trim() || 'moe_guide'
  return <Navigate to={`/ai/moe-brain?agent=${encodeURIComponent(agent)}&tab=flow`} replace />
}
