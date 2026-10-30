/** Bot 能力 hub：中心 Bot + 工具卡片接入（画布展示用） */

import type { MoeBotFlowData, MoeFlowEdgeItem, MoeFlowNodeItem } from '../api/adminClient'
import { asArray } from './apiRecord'

export const HUB_CORE_ID = 'core'
export const HUB_CENTER = { x: 420, y: 220 }

/** Bot 两侧各 4 个接入点，共 8 个工具位 */
export const MAX_HUB_TOOLS = 8
export const MAX_TOOLS_PER_SIDE = 4

export type ToolSide = 'left' | 'right'

export function hubDefaultFlow(agentKey: string): MoeBotFlowData {
  return {
    agent_key: agentKey,
    version: 2,
    entry_node_id: HUB_CORE_ID,
    is_default: true,
    nodes: [
      {
        id: HUB_CORE_ID,
        type: 'core',
        label: 'Moe Bot',
        subtitle: '主体 · 左右各 4 个工具接入点',
        position_x: HUB_CENTER.x,
        position_y: HUB_CENTER.y,
      },
    ],
    edges: [],
  }
}

/** 旧版线性步骤图转为 hub 视图（步骤节点隐藏，只保留 Bot + 工具） */
export function toHubView(flow: MoeBotFlowData, agentLabel: string): MoeBotFlowData {
  const nodes = asArray<MoeFlowNodeItem>(flow.nodes)
  const flowEdges = asArray<MoeFlowEdgeItem>(flow.edges)
  let core = nodes.find((n) => n.type === 'core')
  if (!core) {
    core = {
      id: HUB_CORE_ID,
      type: 'core',
      label: 'Moe Bot',
      subtitle: `${agentLabel} · 左右各 4 个接入点`,
      position_x: HUB_CENTER.x,
      position_y: HUB_CENTER.y,
    }
  }
  const tools = nodes.filter((n) => n.type === 'tool')
  const toolIds = new Set(tools.map((t) => t.id))
  const edges: MoeFlowEdgeItem[] = []
  const seen = new Set<string>()
  for (const e of flowEdges) {
    const linksCore = e.source === core.id || e.target === core.id
    const linksTool = toolIds.has(e.source) || toolIds.has(e.target)
    if (linksCore && linksTool) {
      const norm = normalizeToolToCoreEdge(e, core.id)
      if (!seen.has(norm.source)) {
        edges.push(norm)
        seen.add(norm.source)
      }
    }
  }
  return {
    ...flow,
    nodes: [core, ...tools],
    edges,
  }
}

/** 工具 → Bot 方向（能力接入） */
export function normalizeToolToCoreEdge(e: MoeFlowEdgeItem, coreId: string): MoeFlowEdgeItem {
  if (e.target === coreId) {
    return { ...e, source: e.source, target: coreId, kind: 'capability' }
  }
  return { id: e.id, source: e.source, target: coreId, kind: 'capability' }
}

export function inferToolSide(toolX: number, coreX: number): ToolSide {
  return toolX < coreX - 16 ? 'left' : 'right'
}

/** 新工具默认左右交替排布，每侧最多 4 个 */
export function toolSlotPosition(
  coreX: number,
  coreY: number,
  index: number,
): { x: number; y: number; side: ToolSide } {
  const clamped = Math.min(index, MAX_HUB_TOOLS - 1)
  const side: ToolSide = clamped % 2 === 0 ? 'left' : 'right'
  const row = Math.min(Math.floor(clamped / 2), MAX_TOOLS_PER_SIDE - 1)
  const yStep = 78
  const y = coreY + (row - (MAX_TOOLS_PER_SIDE - 1) / 2) * yStep
  const xOffset = 280
  return {
    x: side === 'left' ? coreX - xOffset : coreX + xOffset,
    y,
    side,
  }
}

export function connectedToolNames(edges: MoeFlowEdgeItem[], coreId: string = HUB_CORE_ID): Set<string> {
  const names = new Set<string>()
  for (const e of edges) {
    if (e.target === coreId) {
      names.add(e.source)
    }
    if (e.source === coreId && e.target.startsWith('tool-')) {
      names.add(e.target)
    }
  }
  return names
}
