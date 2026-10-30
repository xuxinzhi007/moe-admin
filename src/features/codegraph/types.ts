export type CodeGraphDomain = 'pet' | 'admin' | 'backend' | 'flutter'

export type CodeGraphNode = {
  id: string
  kind: string
  label: string
  summary?: string
  weight?: number
  ref_id?: string
  meta?: Record<string, unknown>
}

export type CodeGraphEdge = {
  id: string
  source: string
  target: string
  relation: string
  weight?: number
}

export type CodeGraphDocument = {
  schemaVersion: number
  domain: CodeGraphDomain | string
  generatedAt: string
  nodes: CodeGraphNode[]
  edges: CodeGraphEdge[]
  stats?: Record<string, number>
}

export type CodeGraphIndex = {
  schemaVersion: number
  generatedAt: string
  domains: Array<{
    id: CodeGraphDomain | string
    label: string
    file: string
    description: string
  }>
}

export function normalizeCodeGraph(raw: unknown): CodeGraphDocument | null {
  if (!raw || typeof raw !== 'object') return null
  const d = raw as Partial<CodeGraphDocument>
  if (!Array.isArray(d.nodes) || !Array.isArray(d.edges)) return null
  return {
    schemaVersion: Number(d.schemaVersion ?? 1),
    domain: String(d.domain ?? 'unknown'),
    generatedAt: String(d.generatedAt ?? ''),
    nodes: d.nodes.map((n) => ({
      id: String(n.id),
      kind: String(n.kind || 'node'),
      label: String(n.label || n.id),
      summary: n.summary ? String(n.summary) : undefined,
      weight: Number(n.weight ?? 1),
      ref_id: n.ref_id ? String(n.ref_id) : undefined,
      meta: n.meta && typeof n.meta === 'object' ? n.meta : undefined,
    })),
    edges: d.edges.map((e) => ({
      id: String(e.id),
      source: String(e.source),
      target: String(e.target),
      relation: String(e.relation || 'related'),
      weight: Number(e.weight ?? 1),
    })),
    stats: d.stats && typeof d.stats === 'object' ? d.stats : undefined,
  }
}

export function neighborsOf(
  id: string,
  edges: CodeGraphEdge[],
): Set<string> {
  const set = new Set<string>([id])
  for (const e of edges) {
    if (e.source === id) set.add(e.target)
    if (e.target === id) set.add(e.source)
  }
  return set
}
