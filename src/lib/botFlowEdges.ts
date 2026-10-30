import type { Edge } from '@xyflow/react'
import type { Node } from '@xyflow/react'
import { inferToolSide, type ToolSide } from './botFlowHub'

export const CORE_PORT_COUNT = 8
export const CORE_ID = 'core'
export const TOOL_SOURCE_HANDLE = 'tool-out'

export const LEFT_CORE_PORTS = ['port-0', 'port-1', 'port-2', 'port-3'] as const
export const RIGHT_CORE_PORTS = ['port-4', 'port-5', 'port-6', 'port-7'] as const

const EDGE_STYLE = {
  stroke: 'rgba(145, 234, 228, 0.85)',
  strokeWidth: 2,
  strokeDasharray: '6 4',
} as const

export function capabilityEdge(
  source: string,
  target: string,
  targetHandle?: string,
  id?: string,
): Edge {
  return {
    id: id ?? `cap-${source}-${target}${targetHandle ? `-${targetHandle}` : ''}`,
    source,
    target,
    sourceHandle: TOOL_SOURCE_HANDLE,
    targetHandle,
    type: 'smoothstep',
    selectable: true,
    deletable: true,
    focusable: true,
    reconnectable: 'target',
    style: { ...EDGE_STYLE },
  }
}

export function portSide(portId: string | null | undefined): ToolSide | null {
  if (!portId) return null
  if ((LEFT_CORE_PORTS as readonly string[]).includes(portId)) return 'left'
  if ((RIGHT_CORE_PORTS as readonly string[]).includes(portId)) return 'right'
  return null
}

export function nextCorePortForSide(side: ToolSide, used: Set<string | null | undefined>): string {
  const pool = side === 'left' ? LEFT_CORE_PORTS : RIGHT_CORE_PORTS
  for (const h of pool) {
    if (!used.has(h)) return h
  }
  return pool[0]
}

/** @deprecated 使用 nextCorePortForSide */
export function nextCorePort(used: Set<string | null | undefined>): string {
  for (let i = 0; i < CORE_PORT_COUNT; i++) {
    const h = `port-${i}`
    if (!used.has(h)) return h
  }
  return `port-${used.size % CORE_PORT_COUNT}`
}

function toolSideFromNode(node: Node | undefined, coreX: number): ToolSide {
  if (!node) return 'left'
  const d = node.data as { side?: ToolSide }
  if (d.side === 'left' || d.side === 'right') return d.side
  return inferToolSide(node.position.x, coreX)
}

export function assignCorePorts(edges: Edge[], nodes: Node[], coreId: string = CORE_ID): Edge[] {
  const core = nodes.find((n) => n.id === coreId)
  const coreX = core?.position.x ?? 420
  const usedLeft = new Set<string>()
  const usedRight = new Set<string>()

  return edges.map((e) => {
    if (e.target !== coreId) {
      return { ...e, selectable: true, deletable: true, focusable: true }
    }
    const srcNode = nodes.find((n) => n.id === e.source)
    const side = portSide(e.targetHandle) ?? toolSideFromNode(srcNode, coreX)
    const used = side === 'left' ? usedLeft : usedRight
    let targetHandle = e.targetHandle
    if (!targetHandle || portSide(targetHandle) !== side) {
      targetHandle = nextCorePortForSide(side, used)
    }
    used.add(targetHandle)
    return capabilityEdge(e.source, e.target, targetHandle, e.id)
  })
}
