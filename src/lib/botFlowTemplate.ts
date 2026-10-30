/** Bot 编排画布：步骤状态映射（布局由服务端保存） */

export type FlowNodeStatus = 'standby' | 'running' | 'ok' | 'fail' | 'skip' | 'disabled'

export type FlowNodeLike = {
  id: string
  type: string
  step_key?: string
  tool_name?: string
}

export type ToolInvokeLike = { tool: string; ok: boolean }

export type ToolNodeStatus = 'unused' | 'called_ok' | 'called_fail'

/** 工具节点高亮：按本次试跑时间窗内的 moe_tool_calls */
export function mapToolsToNodeStatus(
  nodes: FlowNodeLike[],
  invoked: ToolInvokeLike[],
): Record<string, ToolNodeStatus> {
  const byTool = new Map<string, ToolInvokeLike>()
  for (const row of invoked) {
    byTool.set(row.tool, row)
  }
  const out: Record<string, ToolNodeStatus> = {}
  for (const n of nodes) {
    if (n.type !== 'tool') continue
    const name = n.tool_name ?? ''
    const hit = byTool.get(name)
    if (!hit) {
      out[n.id] = 'unused'
    } else {
      out[n.id] = hit.ok ? 'called_ok' : 'called_fail'
    }
  }
  return out
}

export type StepLike = { key: string; status: string; detail?: string; duration_ms?: number }

export function mapStepsToNodeStatus(
  steps: StepLike[],
  nodes: FlowNodeLike[],
): Record<string, FlowNodeStatus> {
  const out: Record<string, FlowNodeStatus> = {}
  let genStatus: FlowNodeStatus = 'skip'

  for (const s of steps) {
    const st = mapStepStatus(s.status)
    if (s.key.startsWith('gen_attempt_')) {
      genStatus = mergeStatus(genStatus, st)
      continue
    }
    for (const node of nodes) {
      if (node.type !== 'step' || !node.step_key) {
        continue
      }
      const key = node.step_key
      const matched =
        s.key === key ||
        (key === 'gen_attempt' && s.key.startsWith('gen_attempt_')) ||
        (node.id === 'prep' &&
          (s.key === 'topic_profile' || s.key === 'resolve_model' || s.key === 'assemble_prompt'))
      if (matched) {
        out[node.id] = mergeStatus(out[node.id] ?? 'skip', st)
      }
    }
  }
  if (genStatus !== 'skip') {
    const llm = nodes.find((n) => n.id === 'llm' || n.step_key === 'gen_attempt')
    if (llm) {
      out[llm.id] = genStatus
    }
  }
  return out
}

function mapStepStatus(raw: string): FlowNodeStatus {
  const s = raw.trim().toLowerCase()
  if (s === 'ok') return 'ok'
  if (s === 'fail' || s === 'error') return 'fail'
  if (s === 'running') return 'running'
  if (s === 'skip') return 'skip'
  return 'standby'
}

function mergeStatus(a: FlowNodeStatus, b: FlowNodeStatus): FlowNodeStatus {
  const rank: Record<FlowNodeStatus, number> = {
    fail: 5,
    running: 4,
    ok: 3,
    skip: 2,
    standby: 1,
    disabled: 0,
  }
  return rank[b] > rank[a] ? b : a
}

export { hubDefaultFlow as clientDefaultFlow } from './botFlowHub'

export function globalRunMode(
  hasRun: boolean,
  ok: boolean,
  steps: StepLike[],
): 'idle' | 'running' | 'success' | 'failed' {
  if (!hasRun) return 'idle'
  if (steps.some((s) => s.status === 'running')) return 'running'
  return ok ? 'success' : 'failed'
}
