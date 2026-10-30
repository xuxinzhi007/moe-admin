import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { AdminTag } from './AdminTag'
import type { BrainEpisode } from '../lib/brainData'
import type { BrainGraphData, BrainGraphNode } from '../lib/brainGraphData'
import {
  filterGraphView,
  findEpisodeMeta,
  neighborsOf,
  type GraphLayer,
} from '../lib/brainGraphFilter'
import {
  KIND_LABEL,
  RELATION_LABEL,
  kindTone,
  layoutBrainGraphNodes,
  nodeVisualSize,
} from '../lib/brainGraphLayout'

type GraphNodeData = {
  label: string
  summary: string
  kind: string
  refId: string
  dimmed?: boolean
  qualityScore?: number
  approved?: boolean
}

type Props = {
  graph: BrainGraphData | null
  episodes?: BrainEpisode[]
  loading?: boolean
  selectedId?: string | null
  onSelect?: (node: BrainGraphNode | null) => void
  onRefresh?: () => void
  onOpenWorkbench?: () => void
}

function BrainGraphNodeView({ data, selected }: NodeProps<Node<GraphNodeData>>) {
  const tone = kindTone(data.kind)
  const size = nodeVisualSize(data.kind)
  const isDot = data.kind === 'tag' || data.kind === 'topic'
  return (
    <div
      className={`brain-kg-node brain-kg-node--${tone} ${selected ? 'brain-kg-node--selected' : ''} ${data.dimmed ? 'brain-kg-node--dimmed' : ''} ${isDot ? 'brain-kg-node--dot' : ''}`}
      style={{ width: size.w, minHeight: isDot ? size.h : size.h }}
    >
      <span className="brain-kg-node-kind">{KIND_LABEL[data.kind] ?? data.kind}</span>
      <strong className="brain-kg-node-label">{data.label}</strong>
      {!isDot && data.summary ? (
        <span className="brain-kg-node-summary">{data.summary}</span>
      ) : null}
      {data.kind === 'episode' && data.qualityScore !== undefined ? (
        <span className="brain-kg-node-score">
          质量 {data.qualityScore}
          {data.approved ? ' ✓' : ''}
        </span>
      ) : null}
    </div>
  )
}

const nodeTypes = { brainKg: BrainGraphNodeView }

function BrainKnowledgeGraphInner({
  graph,
  episodes = [],
  loading,
  selectedId,
  onSelect,
  onRefresh,
  onOpenWorkbench,
}: Props) {
  const [dims, setDims] = useState({ w: 900, h: 560 })
  const [search, setSearch] = useState('')
  const [layers, setLayers] = useState<Record<GraphLayer, boolean>>({
    episodes: true,
    memories: true,
    tags: false,
  })

  useEffect(() => {
    const el = document.querySelector('.brain-kg-workspace')
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (rect && rect.width > 0 && rect.height > 0) {
        setDims({ w: rect.width, h: Math.max(rect.height, 480) })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const filtered = useMemo(() => {
    if (!graph) return null
    return filterGraphView(graph, {
      layers,
      selectedId: selectedId ?? null,
      search,
      maxTags: 18,
    })
  }, [graph, layers, selectedId, search])

  const layout = useMemo(
    () => layoutBrainGraphNodes(filtered?.nodes ?? [], dims.w, dims.h),
    [filtered?.nodes, dims.w, dims.h],
  )

  const focusSet = useMemo(() => {
    if (!selectedId || !filtered) return null
    return neighborsOf(selectedId, filtered.edges)
  }, [selectedId, filtered])

  const episodeByRef = useMemo(() => {
    const m = new Map<number, BrainEpisode>()
    for (const e of episodes) m.set(e.id, e)
    return m
  }, [episodes])

  const nodes: Node<GraphNodeData>[] = useMemo(() => {
    return (filtered?.nodes ?? []).map((n) => {
      const pos = layout.get(n.id) ?? { x: dims.w / 2, y: dims.h / 2 }
      const size = nodeVisualSize(n.kind)
      const ep =
        n.kind === 'episode' ? episodeByRef.get(Number(n.ref_id)) : undefined
      return {
        id: n.id,
        type: 'brainKg',
        position: { x: pos.x - size.w / 2, y: pos.y - size.h / 2 },
        data: {
          label: n.label,
          summary: n.summary,
          kind: n.kind,
          refId: n.ref_id,
          dimmed: focusSet !== null && !focusSet.has(n.id),
          qualityScore: ep?.quality_score,
          approved: ep?.approved,
        },
        selected: selectedId === n.id,
      }
    })
  }, [filtered?.nodes, layout, dims.w, dims.h, selectedId, focusSet, episodeByRef])

  const edges: Edge[] = useMemo(() => {
    return (filtered?.edges ?? []).map((e) => {
      const dimmed =
        focusSet !== null && !(focusSet.has(e.source) && focusSet.has(e.target))
      const label = RELATION_LABEL[e.relation] ?? e.relation
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'smoothstep',
        label: focusSet && focusSet.has(e.source) && focusSet.has(e.target) ? label : undefined,
        animated: e.relation === 'authored' && !dimmed,
        className: `brain-kg-edge ${dimmed ? 'brain-kg-edge--dimmed' : ''}`,
        style: {
          stroke: dimmed ? '#d8dee9' : '#7f8caa',
          strokeWidth: dimmed ? 1 : 1.2 + e.weight * 0.8,
          opacity: dimmed ? 0.35 : 0.85,
        },
      }
    })
  }, [filtered?.edges, focusSet])

  const selectedNode = useMemo(
    () => filtered?.nodes.find((n) => n.id === selectedId) ?? null,
    [filtered?.nodes, selectedId],
  )

  const selectedEpisode = useMemo(
    () => findEpisodeMeta(selectedNode, episodes),
    [selectedNode, episodes],
  )

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<GraphNodeData>) => {
      const raw = filtered?.nodes.find((n) => n.id === node.id) ?? null
      onSelect?.(raw)
    },
    [filtered?.nodes, onSelect],
  )

  const onPaneClick = useCallback(() => onSelect?.(null), [onSelect])

  function toggleLayer(key: GraphLayer) {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <section className="panel brain-kg-panel">
      <header className="platform-section-head brain-kg-head">
        <div>
          <h3>知识图谱</h3>
          <p className="muted">
            观察 Bot 与自传、记忆、标签之间的关联；默认隐藏标签层，点击自传可展开邻居。
          </p>
        </div>
        {onRefresh ? (
          <button type="button" className="btn btn-ghost btn-sm" disabled={loading} onClick={onRefresh}>
            {loading ? '刷新中…' : '刷新图谱'}
          </button>
        ) : null}
      </header>

      <div className="brain-kg-toolbar">
        <input
          className="brain-kg-search"
          placeholder="搜索节点…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="brain-kg-layer-toggles">
          {(
            [
              ['episodes', '自传'],
              ['memories', '记忆'],
              ['tags', '标签'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`brain-kg-layer-btn ${layers[key] ? 'brain-kg-layer-btn--on' : ''}`}
              onClick={() => toggleLayer(key)}
            >
              {label}
            </button>
          ))}
        </div>
        {graph ? (
          <div className="brain-kg-stats">
            <span>自传 {graph.episode_count}</span>
            <span>记忆 {graph.memory_count}</span>
            <span>标签 {graph.tag_count}</span>
          </div>
        ) : null}
      </div>

      <div className="brain-kg-legend">
        {Object.entries(KIND_LABEL).map(([kind, label]) => (
          <span key={kind} className={`brain-kg-legend-item brain-kg-legend-item--${kindTone(kind)}`}>
            {label}
          </span>
        ))}
      </div>

      <div className="brain-kg-layout">
        <div className="brain-kg-workspace">
          {loading && !graph ? <p className="muted brain-kg-loading">加载图谱…</p> : null}
          {!loading && filtered && filtered.nodes.length <= 1 ? (
            <p className="muted brain-kg-empty">暂无图谱数据，试跑发帖后会自动生成节点。</p>
          ) : null}
          {filtered && filtered.nodes.length > 1 ? (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              fitView
              fitViewOptions={{ padding: 0.25 }}
              minZoom={0.25}
              maxZoom={2}
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={20} size={1} color="#dce3ef" />
              <Controls showInteractive={false} />
              <MiniMap
                pannable
                zoomable
                nodeColor={(n) => {
                  const k = (n.data as GraphNodeData)?.kind
                  if (k === 'agent') return '#6b5fc1'
                  if (k === 'episode') return '#2bb8a9'
                  if (k === 'memory') return '#6b8fd4'
                  return '#b8a9e8'
                }}
                maskColor="rgba(248,250,255,0.82)"
              />
            </ReactFlow>
          ) : null}
        </div>

        <aside className="brain-kg-sidebar">
          <h4 className="brain-kg-sidebar-title">节点详情</h4>
          {!selectedNode ? (
            <div className="brain-kg-sidebar-empty">
              <p className="muted">点击画布中的节点，查看内容与关联。</p>
              <ul className="brain-kg-hints">
                <li>默认只显示 Bot、自传、记忆三层</li>
                <li>打开「标签」层可查看话题分布</li>
                <li>选中节点会高亮一跳邻居</li>
              </ul>
            </div>
          ) : (
            <div className="brain-kg-sidebar-body">
              <AdminTag label={KIND_LABEL[selectedNode.kind] ?? selectedNode.kind} tone="neutral" />
              <strong className="brain-kg-sidebar-label">{selectedNode.label}</strong>
              {selectedNode.summary ? (
                <p className="brain-kg-sidebar-summary">{selectedNode.summary}</p>
              ) : null}

              {selectedEpisode ? (
                <div className="brain-kg-sidebar-meta">
                  <div className="brain-kg-meta-row">
                    <span>质量</span>
                    <AdminTag
                      label={`${selectedEpisode.quality_score}${selectedEpisode.approved ? ' ✓' : ''}`}
                      tone={
                        selectedEpisode.approved || selectedEpisode.quality_score >= 70
                          ? 'ok'
                          : selectedEpisode.quality_score >= 50
                            ? 'warn'
                            : 'fail'
                      }
                    />
                  </div>
                  <div className="brain-kg-meta-row">
                    <span>文艺</span>
                    <strong>{selectedEpisode.style_score}</strong>
                  </div>
                  <div className="brain-kg-meta-row">
                    <span>时间</span>
                    <span className="muted">{selectedEpisode.created_at}</span>
                  </div>
                  {selectedEpisode.tags.length > 0 ? (
                    <div className="brain-kg-tag-list">
                      {selectedEpisode.tags.map((tag) => (
                        <AdminTag key={tag} label={tag} tone="neutral" />
                      ))}
                    </div>
                  ) : null}
                  {onOpenWorkbench ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ marginTop: 12 }}
                      onClick={onOpenWorkbench}
                    >
                      在工作台润色 / 删除 →
                    </button>
                  ) : null}
                </div>
              ) : null}

              {selectedNode.kind === 'memory' ? (
                <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                  Key: <code>{selectedNode.ref_id}</code>
                </p>
              ) : null}
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}

export function BrainKnowledgeGraph(props: Props) {
  return (
    <ReactFlowProvider>
      <BrainKnowledgeGraphInner {...props} />
    </ReactFlowProvider>
  )
}
