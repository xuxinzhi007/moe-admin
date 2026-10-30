import {
  useCallback,
  useEffect,
  useMemo,
  type MouseEvent,
} from 'react'
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  kindTone,
  layoutCodeGraphNodes,
  nodeVisualSize,
  relationLabel,
} from './layout'
import type { CodeGraphEdge, CodeGraphNode } from './types'

type GraphNodeData = {
  label: string
  summary?: string
  kind: string
  refId?: string
  isFocus: boolean
}

function CodeGraphNodeView({ data, selected }: NodeProps) {
  const d = data as GraphNodeData
  const tone = kindTone(d.kind)
  return (
    <div
      className={[
        'codegraph-node',
        `codegraph-node--${tone}`,
        d.isFocus ? 'codegraph-node--focus' : '',
        selected ? 'codegraph-node--selected' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="codegraph-node-kind">{d.kind}</div>
      <div className="codegraph-node-label" title={d.label}>
        {d.label}
      </div>
      {d.summary ? (
        <div className="codegraph-node-summary" title={d.summary}>
          {d.summary}
        </div>
      ) : null}
    </div>
  )
}

const nodeTypes = { codegraph: CodeGraphNodeView }

type Props = {
  nodes: CodeGraphNode[]
  edges: CodeGraphEdge[]
  focusId: string | null
  selectedId: string | null
  onSelect: (id: string) => void
  viewKey: string
  /** 全览时默认只画箭头；探索模式或打开标签时显示关系文字 */
  showEdgeLabels?: boolean
  showMiniMap?: boolean
}

function FitOnChange({ viewKey }: { viewKey: string }) {
  const { fitView } = useReactFlow()
  useEffect(() => {
    const t = window.setTimeout(() => {
      void fitView({ padding: 0.18, duration: 240, maxZoom: 1.05 })
    }, 40)
    return () => window.clearTimeout(t)
  }, [viewKey, fitView])
  return null
}

function CodeGraphCanvasInner({
  nodes: graphNodes,
  edges: graphEdges,
  focusId,
  selectedId,
  onSelect,
  viewKey,
  showEdgeLabels = true,
  showMiniMap = false,
}: Props) {
  const layout = useMemo(
    () => layoutCodeGraphNodes(graphNodes, graphEdges),
    [graphNodes, graphEdges],
  )

  const hotIds = useMemo(() => {
    if (!selectedId) return null
    const set = new Set<string>([selectedId])
    for (const e of graphEdges) {
      if (e.source === selectedId) set.add(e.target)
      if (e.target === selectedId) set.add(e.source)
    }
    return set
  }, [selectedId, graphEdges])

  const nodes: Node[] = useMemo(() => {
    return graphNodes.map((n) => {
      const pos = layout.get(n.id) ?? { x: 0, y: 0 }
      const size = nodeVisualSize(n.kind)
      const dimmed = hotIds !== null && !hotIds.has(n.id)
      return {
        id: n.id,
        type: 'codegraph',
        position: { x: pos.x, y: pos.y },
        data: {
          label: n.label,
          summary: n.summary,
          kind: n.kind,
          refId: n.ref_id,
          isFocus: focusId === n.id || selectedId === n.id,
        },
        selected: selectedId === n.id,
        style: {
          width: size.w,
          height: 'auto',
          opacity: dimmed ? 0.28 : 1,
        },
      }
    })
  }, [graphNodes, layout, focusId, selectedId, hotIds])

  const edges: Edge[] = useMemo(() => {
    return graphEdges.map((e) => {
      const hot =
        selectedId !== null &&
        (e.source === selectedId || e.target === selectedId)
      const dimmed = hotIds !== null && !hot
      const showLabel = showEdgeLabels || hot
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'smoothstep',
        label: showLabel ? relationLabel(e.relation) : undefined,
        animated: hot,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: hot ? '#2563eb' : dimmed ? '#cbd5e1' : '#64748b',
        },
        labelStyle: {
          fontSize: 10,
          fill: hot ? '#1d4ed8' : '#64748b',
          fontWeight: hot ? 700 : 500,
        },
        labelBgStyle: { fill: '#ffffff', fillOpacity: 0.92 },
        labelBgPadding: [3, 5] as [number, number],
        labelBgBorderRadius: 4,
        style: {
          stroke: hot ? '#2563eb' : dimmed ? '#e2e8f0' : '#64748b',
          strokeWidth: hot ? 2.4 : 1.35,
          opacity: dimmed ? 0.25 : 0.9,
        },
      }
    })
  }, [graphEdges, selectedId, hotIds, showEdgeLabels])

  const onNodeClick = useCallback(
    (_: MouseEvent, node: Node) => {
      onSelect(node.id)
    },
    [onSelect],
  )

  return (
    <ReactFlow
      key={viewKey}
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={onNodeClick}
      fitView
      minZoom={0.08}
      maxZoom={1.4}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable
      proOptions={{ hideAttribution: true }}
      defaultEdgeOptions={{ type: 'smoothstep' }}
    >
      <FitOnChange viewKey={viewKey} />
      <Background gap={20} size={1} color="#e2e8f0" />
      {showMiniMap ? <MiniMap pannable zoomable /> : null}
      <Controls showInteractive={false} />
    </ReactFlow>
  )
}

export function CodeGraphCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <CodeGraphCanvasInner {...props} />
    </ReactFlowProvider>
  )
}

export function selectedNodeOf(
  nodes: CodeGraphNode[],
  id: string | null,
): CodeGraphNode | null {
  if (!id) return null
  return nodes.find((n) => n.id === id) ?? null
}
