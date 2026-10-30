import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  reconnectEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type ReactFlowInstance,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { MoeBotFlowData, MoeFlowEdgeItem, MoeFlowNodeItem } from '../../api/adminClient'
import {
  HUB_CORE_ID,
  MAX_HUB_TOOLS,
  inferToolSide,
  toHubView,
  toolSlotPosition,
  type ToolSide,
} from '../../lib/botFlowHub'
import {
  assignCorePorts,
  capabilityEdge,
  nextCorePortForSide,
  portSide,
} from '../../lib/botFlowEdges'
import { toolIdFromNodeId, toolTitleZh } from '../../lib/moeToolLabels'
import {
  type FlowNodeStatus,
  type StepLike,
  type ToolInvokeLike,
  type ToolNodeStatus,
  globalRunMode,
  mapToolsToNodeStatus,
} from '../../lib/botFlowTemplate'
import { CoreFlowNode, ToolFlowNode, type BotFlowNodeData } from './botFlowNodes'

const nodeTypes = {
  core: CoreFlowNode,
  tool: ToolFlowNode,
}

const CORE_ID = HUB_CORE_ID

type ToolCatalog = Map<string, { description: string }>

function buildCoreData(
  agentLabel: string,
  mode: ReturnType<typeof globalRunMode>,
  linkedCount: number,
  runActive: boolean,
): BotFlowNodeData {
  if (runActive) {
    return {
      label: agentLabel,
      subtitle: '试跑进行中',
      status: 'running',
      statusLabel: '试跑中',
      nodeType: 'core',
    }
  }
  let st: FlowNodeStatus = 'standby'
  if (mode === 'running') st = 'running'
  else if (mode === 'success') st = 'ok'
  else if (mode === 'failed') st = 'fail'
  return {
    label: agentLabel,
    subtitle: `左右各 4 接入点 · 已接入 ${linkedCount}/${MAX_HUB_TOOLS}`,
    status: st,
    statusLabel:
      mode === 'idle' ? '待机' : mode === 'running' ? '运行中' : mode === 'success' ? '正常' : '需关注',
    nodeType: 'core',
  }
}

function buildToolData(
  toolKey: string,
  description: string,
  linked: boolean,
  toolStatus: Record<string, ToolNodeStatus>,
  nodeId: string,
  side: ToolSide,
): BotFlowNodeData {
  let st: FlowNodeStatus = linked ? 'standby' : 'disabled'
  const ts = toolStatus[nodeId]
  if (ts === 'called_ok') st = 'ok'
  else if (ts === 'called_fail') st = 'fail'
  return {
    label: toolTitleZh(toolKey),
    toolKey,
    subtitle: description || '工具能力',
    status: st,
    statusLabel: linked ? (st === 'ok' ? '已调用' : st === 'fail' ? '失败' : '已接入') : '未接入',
    nodeType: 'tool',
    side,
  }
}

function resolveToolSide(item: MoeFlowNodeItem, coreX: number): ToolSide {
  if (item.kind === 'left' || item.kind === 'right') return item.kind
  return inferToolSide(item.position_x, coreX)
}

function resolveToolKey(item: MoeFlowNodeItem): string {
  if (item.tool_name?.trim()) return item.tool_name.trim()
  return toolIdFromNodeId(item.id)
}

function toFlowNodes(
  hub: MoeBotFlowData,
  agentLabel: string,
  mode: ReturnType<typeof globalRunMode>,
  toolStatus: Record<string, ToolNodeStatus>,
  catalog: ToolCatalog,
  linkedIds: Set<string>,
  runActive: boolean,
): Node[] {
  const core = hub.nodes.find((n) => n.id === CORE_ID) ?? hub.nodes.find((n) => n.type === 'core')
  if (!core) return []
  const out: Node[] = [
    {
      id: CORE_ID,
      type: 'core',
      position: { x: core.position_x, y: core.position_y },
      draggable: true,
      selectable: true,
      deletable: false,
      data: buildCoreData(agentLabel, mode, linkedIds.size, runActive),
    },
  ]
  for (const t of hub.nodes.filter((n) => n.type === 'tool')) {
    const key = resolveToolKey(t)
    const desc = catalog.get(key)?.description ?? t.subtitle ?? ''
    const side = resolveToolSide(t, core.position_x)
    out.push({
      id: t.id,
      type: 'tool',
      position: { x: t.position_x, y: t.position_y },
      draggable: true,
      selectable: true,
      deletable: true,
      data: buildToolData(key, desc, linkedIds.has(t.id), toolStatus, t.id, side),
    })
  }
  return out
}

function toFlowEdges(hub: MoeBotFlowData, flowNodes: Node[]): Edge[] {
  const raw = hub.edges
    .filter((e) => e.target === CORE_ID || e.source === CORE_ID)
    .map((e) => {
      const source = e.source === CORE_ID ? e.target : e.source
      const handle = e.label && portSide(e.label) ? e.label : undefined
      return capabilityEdge(source, CORE_ID, handle, e.id)
    })
  return assignCorePorts(raw, flowNodes, CORE_ID)
}

function flowNodesToApi(nodes: Node[], linkedIds: Set<string>): MoeFlowNodeItem[] {
  return nodes.map((n) => {
    const d = n.data as BotFlowNodeData
    const linked = linkedIds.has(n.id)
    return {
      id: n.id,
      type: d.nodeType,
      label: d.nodeType === 'core' ? 'Moe Bot' : d.label,
      subtitle: d.subtitle,
      tool_name: d.toolKey,
      kind: d.nodeType === 'tool' ? d.side : undefined,
      position_x: n.position.x,
      position_y: n.position.y,
      enabled: d.nodeType === 'tool' ? linked : true,
    }
  })
}

function flowEdgesToApi(edges: Edge[]): MoeFlowEdgeItem[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    kind: 'capability',
    label: e.targetHandle ?? undefined,
  }))
}

type Props = {
  agentLabel: string
  flow: MoeBotFlowData
  tools: Array<{ name: string; description: string }>
  steps: StepLike[]
  toolsInvoked: ToolInvokeLike[]
  hasRun: boolean
  ok: boolean
  runFeedback?: string
  runActive?: boolean
  saving: boolean
  onSave: (payload: {
    nodes: MoeFlowNodeItem[]
    edges: MoeFlowEdgeItem[]
    viewport_zoom?: number
    viewport_x?: number
    viewport_y?: number
  }) => Promise<void>
}

function BotFlowCanvasInner({
  agentLabel,
  flow,
  tools,
  steps,
  toolsInvoked,
  hasRun,
  ok,
  runFeedback,
  runActive = false,
  saving,
  onSave,
}: Props) {
  const rfRef = useRef<ReactFlowInstance | null>(null)
  const nodesRef = useRef<Node[]>([])
  const catalog = useMemo(() => {
    const m: ToolCatalog = new Map()
    for (const t of tools) m.set(t.name, { description: t.description })
    return m
  }, [tools])

  const hubFlow = useMemo(() => toHubView(flow, agentLabel), [flow, agentLabel])
  const mode = runActive ? 'running' : globalRunMode(hasRun, ok, steps)
  const nodeMeta = useMemo(
    () => hubFlow.nodes.map((n) => ({ id: n.id, type: n.type, tool_name: n.tool_name })),
    [hubFlow.nodes],
  )
  const toolStatus = useMemo(() => mapToolsToNodeStatus(nodeMeta, toolsInvoked), [nodeMeta, toolsInvoked])

  const layoutKey = `${flow.agent_key}:${flow.updated_at ?? 'init'}:${hubFlow.nodes.length}:${hubFlow.edges.length}`

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])

  const linkedIdsFromEdges = useCallback(
    (eds: Edge[]) => new Set(eds.filter((e) => e.target === CORE_ID).map((e) => e.source)),
    [],
  )

  useEffect(() => {
    const linked = linkedIdsFromEdges(
      hubFlow.edges.map((e) => capabilityEdge(e.source, e.target, e.label, e.id)),
    )
    const flowNodes = toFlowNodes(
      hubFlow,
      agentLabel,
      mode,
      toolStatus,
      catalog,
      linked,
      runActive,
    )
    setNodes(flowNodes)
    setEdges(toFlowEdges(hubFlow, flowNodes))
    const t = window.setTimeout(() => rfRef.current?.fitView({ padding: 0.25, duration: 200 }), 80)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey])

  useEffect(() => {
    const linkedIds = linkedIdsFromEdges(edges)
    setNodes((nds) => {
      if (nds.length === 0) return nds
      let changed = false
      const next = nds.map((n) => {
        const d = n.data as BotFlowNodeData
        if (d.nodeType === 'core') {
          const data = buildCoreData(agentLabel, mode, linkedIds.size, runActive)
          if (
            d.label === data.label &&
            d.subtitle === data.subtitle &&
            d.status === data.status &&
            d.statusLabel === data.statusLabel
          ) {
            return n
          }
          changed = true
          return { ...n, data }
        }
        if (d.nodeType !== 'tool' || !d.toolKey) return n
        const core = nds.find((x) => x.id === CORE_ID)
        const side = d.side ?? inferToolSide(n.position.x, core?.position.x ?? 420)
        const desc = catalog.get(d.toolKey)?.description ?? d.subtitle
        const data = buildToolData(d.toolKey, desc, linkedIds.has(n.id), toolStatus, n.id, side)
        if (
          d.label === data.label &&
          d.subtitle === data.subtitle &&
          d.status === data.status &&
          d.statusLabel === data.statusLabel &&
          d.side === data.side
        ) {
          return n
        }
        changed = true
        return { ...n, data }
      })
      return changed ? next : nds
    })
  }, [edges, toolStatus, mode, agentLabel, catalog, linkedIdsFromEdges, runActive, setNodes])

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const safe = changes.filter((ch) => {
        if (ch.type === 'remove' && 'id' in ch && ch.id === CORE_ID) return false
        return true
      })
      onNodesChange(safe)
    },
    [onNodesChange],
  )

  const onConnect = useCallback(
    (conn: Connection) => {
      if (!conn.source || !conn.target) return
      const other = conn.source === CORE_ID ? conn.target : conn.source
      if (other === CORE_ID) return
      const nds = nodesRef.current
      const core = nds.find((n) => n.id === CORE_ID)
      const srcNode = nds.find((n) => n.id === other)
      const side =
        (conn.targetHandle ? portSide(conn.targetHandle) : null) ??
        (srcNode ? inferToolSide(srcNode.position.x, core?.position.x ?? 420) : 'left')
      setEdges((eds) => {
        const used = new Set(
          eds
            .filter((e) => e.target === CORE_ID && portSide(e.targetHandle) === side)
            .map((e) => e.targetHandle),
        )
        const port =
          conn.targetHandle && conn.target === CORE_ID && portSide(conn.targetHandle) === side
            ? conn.targetHandle
            : nextCorePortForSide(side, used)
        const filtered = eds.filter((e) => e.source !== other)
        return assignCorePorts([...filtered, capabilityEdge(other, CORE_ID, port)], nds, CORE_ID)
      })
    },
    [setEdges],
  )

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      setEdges((eds) => {
        const next = reconnectEdge(oldEdge, newConnection, eds)
        return assignCorePorts(next, nodesRef.current, CORE_ID)
      })
    },
    [setEdges],
  )

  const deleteSelected = useCallback(() => {
    setNodes((nds) => nds.filter((n) => !n.selected || n.id === CORE_ID))
    setEdges((eds) => eds.filter((e) => !e.selected))
  }, [setNodes, setEdges])

  const disconnectSelectedEdges = useCallback(() => {
    setEdges((eds) => eds.filter((e) => !e.selected))
  }, [setEdges])

  const persist = useCallback(async () => {
    const inst = rfRef.current
    const vp = inst?.getViewport()
    const linkedIds = linkedIdsFromEdges(edges)
    await onSave({
      nodes: flowNodesToApi(nodes, linkedIds),
      edges: flowEdgesToApi(edges),
      viewport_zoom: vp?.zoom,
      viewport_x: vp?.x,
      viewport_y: vp?.y,
    })
  }, [nodes, edges, onSave, linkedIdsFromEdges])

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      if (deleted.some((n) => n.id === CORE_ID)) return
      const removed = new Set(deleted.map((n) => n.id))
      setEdges((eds) => eds.filter((e) => !removed.has(e.source) && !removed.has(e.target)))
    },
    [setEdges],
  )

  const addToolNode = useCallback(
    (tool: { name: string; description: string }) => {
      const toolId = `tool-${tool.name}`
      setNodes((nds) => {
        if (nds.some((n) => n.id === toolId)) return nds
        const toolCount = nds.filter((n) => (n.data as BotFlowNodeData).nodeType === 'tool').length
        if (toolCount >= MAX_HUB_TOOLS) return nds
        const core = nds.find((n) => n.id === CORE_ID)
        const cx = core?.position.x ?? 420
        const cy = core?.position.y ?? 220
        const slot = toolSlotPosition(cx, cy, toolCount)
        const nextNodes: Node[] = [
          ...nds,
          {
            id: toolId,
            type: 'tool',
            position: { x: slot.x, y: slot.y },
            draggable: true,
            deletable: true,
            data: buildToolData(tool.name, tool.description, true, {}, toolId, slot.side),
          },
        ]
        setEdges((eds) => {
          if (eds.some((e) => e.source === toolId && e.target === CORE_ID)) return eds
          const used = new Set(
            eds
              .filter((e) => e.target === CORE_ID && portSide(e.targetHandle) === slot.side)
              .map((e) => e.targetHandle),
          )
          const port = nextCorePortForSide(slot.side, used)
          return assignCorePorts(
            [...eds.filter((e) => e.source !== toolId), capabilityEdge(toolId, CORE_ID, port)],
            nextNodes,
            CORE_ID,
          )
        })
        return nextNodes
      })
    },
    [setNodes, setEdges],
  )

  const linkedCount = edges.filter((e) => e.target === CORE_ID).length
  const canvasToolCount = nodes.filter((n) => (n.data as BotFlowNodeData).nodeType === 'tool').length
  const canvasFull = canvasToolCount >= MAX_HUB_TOOLS
  const hasEdgeSelection = edges.some((e) => e.selected)

  const paletteState = useMemo(() => {
    const onCanvas = new Set<string>()
    const linked = new Set<string>()
    for (const n of nodes) {
      const d = n.data as BotFlowNodeData
      if (d.nodeType === 'tool' && d.toolKey) onCanvas.add(d.toolKey)
    }
    for (const e of edges) {
      if (e.target !== CORE_ID) continue
      const src = nodes.find((n) => n.id === e.source)
      const key = (src?.data as BotFlowNodeData | undefined)?.toolKey
      if (key) linked.add(key)
    }
    return { onCanvas, linked }
  }, [nodes, edges])

  return (
    <div
      className={`bot-flow-canvas-wrap bot-flow-mode--${mode} ${runActive ? 'bot-flow-run-active' : ''}`}
    >
      {runActive ? (
        <p className="brain-pulse-run-banner bot-flow-run-banner">
          <span className="brain-pulse-run-dot" aria-hidden />
          试跑进行中…
        </p>
      ) : null}
      {runFeedback ? <p className="muted bot-flow-feedback">{runFeedback}</p> : null}
      <div className="bot-flow-toolbar">
        <span className="muted">
          Bot 左右各 4 个接入点（共 8 个工具位），新工具默认左右交替排布。选中连线可 Delete 断开或拖到另一侧接入点。
        </span>
        <div className="btn-row bot-flow-tool-palette">
          {tools.map((t) => {
            const onCanvas = paletteState.onCanvas.has(t.name)
            const linked = paletteState.linked.has(t.name)
            const badge = onCanvas ? (linked ? '已接入' : '已添加') : ''
            return (
              <button
                key={t.name}
                type="button"
                className={[
                  'btn btn-sm bot-flow-tool-btn',
                  onCanvas ? 'bot-flow-tool-btn--on-canvas' : 'btn-ghost',
                  linked ? 'bot-flow-tool-btn--linked' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                title={
                  onCanvas
                    ? linked
                      ? `${toolTitleZh(t.name)}（${t.name}）· 已在画布且已连 Bot`
                      : `${toolTitleZh(t.name)}（${t.name}）· 已在画布，未连 Bot`
                    : canvasFull
                      ? `已达上限：左右各 4 个，共 ${MAX_HUB_TOOLS} 个工具`
                      : `${toolTitleZh(t.name)}（${t.name}）· 添加到${canvasToolCount % 2 === 0 ? '左侧' : '右侧'}`
                }
                disabled={onCanvas || (!onCanvas && canvasFull)}
                onClick={() => addToolNode(t)}
              >
                {badge ? <span className="bot-flow-tool-btn-badge">{badge}</span> : null}
                <span className="bot-flow-tool-btn-zh">{onCanvas ? toolTitleZh(t.name) : `+ ${toolTitleZh(t.name)}`}</span>
              </button>
            )
          })}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={!hasEdgeSelection}
            onClick={disconnectSelectedEdges}
          >
            断开连线
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={deleteSelected}>
            删除选中
          </button>
          <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={() => void persist()}>
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
      <div className="bot-flow-rf">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onReconnect={onReconnect}
          onNodesDelete={onNodesDelete}
          nodeTypes={nodeTypes}
          deleteKeyCode={['Backspace', 'Delete']}
          edgesFocusable
          elementsSelectable
          reconnectRadius={24}
          fitView
          minZoom={0.35}
          maxZoom={1.4}
          onInit={(inst) => {
            rfRef.current = inst
            window.setTimeout(() => inst.fitView({ padding: 0.25 }), 50)
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} color="rgba(127,127,213,0.1)" />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>
      <p className="muted bot-flow-hint">
        Bot 1 个 · 画布工具 {canvasToolCount}/{MAX_HUB_TOOLS} · 已接入 {linkedCount} · 断开后请保存
      </p>
    </div>
  )
}

export function BotFlowCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <BotFlowCanvasInner {...props} />
    </ReactFlowProvider>
  )
}
