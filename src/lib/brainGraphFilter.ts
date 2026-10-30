import type { BrainGraphData, BrainGraphEdge, BrainGraphNode } from './brainGraphData'

export type GraphLayer = 'episodes' | 'memories' | 'tags'

function isTagKind(kind: string): boolean {
  return kind === 'tag' || kind === 'topic'
}

/** 默认「核心视图」：Bot + 自传 + 记忆；标签按需展开，避免外圈拥挤。 */
export function filterGraphView(
  graph: BrainGraphData,
  opts: {
    layers: Record<GraphLayer, boolean>
    selectedId: string | null
    search: string
    maxTags: number
  },
): BrainGraphData {
  const q = opts.search.trim().toLowerCase()
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]))
  const keep = new Set<string>()

  for (const n of graph.nodes) {
    if (n.kind === 'agent') {
      keep.add(n.id)
      continue
    }
    if (n.kind === 'episode' && opts.layers.episodes) keep.add(n.id)
    if (n.kind === 'memory' && opts.layers.memories) keep.add(n.id)
  }

  if (opts.layers.tags) {
    const tags = graph.nodes
      .filter((n) => isTagKind(n.kind))
      .sort((a, b) => b.weight - a.weight || a.label.localeCompare(b.label))
      .slice(0, opts.maxTags)
    for (const t of tags) keep.add(t.id)
  }

  if (opts.selectedId && nodeMap.has(opts.selectedId)) {
    keep.add(opts.selectedId)
    for (const e of graph.edges) {
      if (e.source === opts.selectedId) keep.add(e.target)
      if (e.target === opts.selectedId) keep.add(e.source)
    }
  }

  if (q) {
    const matched = new Set<string>()
    for (const id of keep) {
      const n = nodeMap.get(id)
      if (!n) continue
      const hay = `${n.label} ${n.summary} ${n.ref_id}`.toLowerCase()
      if (hay.includes(q)) matched.add(id)
    }
    for (const id of [...matched]) {
      for (const e of graph.edges) {
        if (e.source === id) matched.add(e.target)
        if (e.target === id) matched.add(e.source)
      }
    }
    for (const id of keep) {
      if (!matched.has(id)) keep.delete(id)
    }
  }

  const nodes = graph.nodes.filter((n) => keep.has(n.id))
  const ids = new Set(nodes.map((n) => n.id))
  const edges = graph.edges.filter((e) => ids.has(e.source) && ids.has(e.target))

  return { ...graph, nodes, edges }
}

export function neighborsOf(nodeId: string, edges: BrainGraphEdge[]): Set<string> {
  const out = new Set<string>([nodeId])
  for (const e of edges) {
    if (e.source === nodeId) out.add(e.target)
    if (e.target === nodeId) out.add(e.source)
  }
  return out
}

export function findEpisodeMeta(
  node: BrainGraphNode | null,
  episodes: Array<{
    id: number
    content: string
    tags: string[]
    quality_score: number
    style_score: number
    approved: boolean
    created_at: string
    post_id: string
  }>,
) {
  if (!node || node.kind !== 'episode') return null
  const id = Number(node.ref_id)
  if (!Number.isFinite(id)) return null
  return episodes.find((e) => e.id === id) ?? null
}
