import type { CodeGraphDocument, CodeGraphEdge, CodeGraphNode } from './types'

/** 骨架：极少节点，几乎不展示业务连线。 */
export const OVERVIEW_KINDS: Record<string, string[]> = {
  pet: ['root', 'pack', 'consumer', 'section', 'missing_asset'],
  admin: ['root', 'workspace', 'nav_group', 'feature'],
  backend: ['root', 'layer', 'http_domain', 'service'],
  flutter: ['root', 'layer', 'flags'],
}

/**
 * 连线全览：一次看清主干关系（含 route/page/domain 等），默认不含最碎叶子。
 * includeDense=true 时再挂上 service / http_op / asset 等密连线层。
 */
export const WIRE_KINDS: Record<string, string[]> = {
  pet: ['root', 'pack', 'consumer', 'manifest', 'section', 'slot', 'object'],
  admin: [
    'root',
    'workspace',
    'nav_group',
    'nav_item',
    'route',
    'page',
    'feature',
  ],
  backend: [
    'root',
    'layer',
    'domain',
    'http_domain',
    'service',
    'biz',
  ],
  flutter: ['root', 'layer', 'flags', 'route', 'page'],
}

export const WIRE_DENSE_KINDS: Record<string, string[]> = {
  pet: ['item', 'asset', 'missing_asset', 'layer'],
  admin: [],
  backend: ['http_op'],
  flutter: ['service'],
}

/** 全览时优先保留的关系（避免 uses_service 把图糊死；密模式再放开）。 */
export const WIRE_CORE_RELATIONS = new Set([
  'contains',
  'registers',
  'opens',
  'implements',
  'nav_to',
  'exposes',
  'http_to_service',
  'calls',
  'loads',
  'edits',
  'gates',
  'uses_feature',
  'layer',
  'binds',
  'missing',
])

/** 左侧目录的可点入口（探索起点）。 */
export const CATALOG_KINDS: Record<string, string[]> = {
  pet: ['pack', 'section', 'consumer'],
  admin: ['nav_item', 'page', 'route'],
  backend: ['http_domain', 'service', 'biz'],
  flutter: ['route', 'page', 'service'],
}

export type ViewMode = 'overview' | 'wire' | 'explore'

export type Subgraph = {
  nodes: CodeGraphNode[]
  edges: CodeGraphEdge[]
}

function filterByKinds(
  doc: CodeGraphDocument,
  kinds: Set<string>,
  relations?: Set<string> | null,
): Subgraph {
  const nodes = doc.nodes.filter((n) => kinds.has(n.kind))
  const ids = new Set(nodes.map((n) => n.id))
  const edges = doc.edges.filter((e) => {
    if (!ids.has(e.source) || !ids.has(e.target)) return false
    if (relations && !relations.has(e.relation)) return false
    return true
  })
  return { nodes, edges }
}

export function overviewSubgraph(doc: CodeGraphDocument): Subgraph {
  const kinds = new Set(OVERVIEW_KINDS[doc.domain] || ['root', 'layer'])
  return filterByKinds(doc, kinds)
}

/** 连线全览：主干节点 + 核心连线；可选密层。 */
export function wireSubgraph(
  doc: CodeGraphDocument,
  options?: { dense?: boolean },
): Subgraph {
  const dense = Boolean(options?.dense)
  const kinds = new Set(WIRE_KINDS[doc.domain] || ['root', 'layer'])
  if (dense) {
    for (const k of WIRE_DENSE_KINDS[doc.domain] || []) kinds.add(k)
  }

  const relations = dense ? null : WIRE_CORE_RELATIONS
  let { nodes, edges } = filterByKinds(doc, kinds, relations)

  // 密模式：flutter 的 uses_service 只保留「被 ≥2 个 page 使用」的 service，避免 80+ 服务全铺
  if (dense && doc.domain === 'flutter') {
    const pageIds = new Set(
      nodes.filter((n) => n.kind === 'page').map((n) => n.id),
    )
    const svcUse = new Map<string, number>()
    for (const e of doc.edges) {
      if (e.relation !== 'uses_service') continue
      if (!pageIds.has(e.source)) continue
      svcUse.set(e.target, (svcUse.get(e.target) || 0) + 1)
    }
    const keepSvc = new Set(
      [...svcUse.entries()]
        .filter(([, c]) => c >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 40)
        .map(([id]) => id),
    )
    nodes = nodes.filter((n) => n.kind !== 'service' || keepSvc.has(n.id))
    const ids = new Set(nodes.map((n) => n.id))
    edges = doc.edges.filter(
      (e) =>
        ids.has(e.source) &&
        ids.has(e.target) &&
        (WIRE_CORE_RELATIONS.has(e.relation) || e.relation === 'uses_service'),
    )
  }

  // backend 密模式：每个 http_domain 最多挂 8 个 http_op，避免 296 条糊屏
  if (dense && doc.domain === 'backend') {
    const byDomain = new Map<string, string[]>()
    for (const e of edges) {
      if (e.relation !== 'exposes') continue
      const list = byDomain.get(e.source) ?? []
      list.push(e.target)
      byDomain.set(e.source, list)
    }
    const keepOp = new Set<string>()
    for (const [, ops] of byDomain) {
      for (const id of ops.slice(0, 8)) keepOp.add(id)
    }
    nodes = nodes.filter((n) => n.kind !== 'http_op' || keepOp.has(n.id))
    const ids = new Set(nodes.map((n) => n.id))
    edges = edges.filter((e) => ids.has(e.source) && ids.has(e.target))
  }

  return { nodes, edges }
}

/** 以 focus 为中心取邻域；含通向 root 的祖先链，便于看「从哪来」。 */
export function focusSubgraph(
  doc: CodeGraphDocument,
  focusId: string,
  hops = 1,
): Subgraph {
  const byId = new Map(doc.nodes.map((n) => [n.id, n]))
  if (!byId.has(focusId)) return { nodes: [], edges: [] }

  const keep = new Set<string>([focusId])

  let frontier = [focusId]
  for (let h = 0; h < hops; h++) {
    const next: string[] = []
    for (const id of frontier) {
      for (const e of doc.edges) {
        if (e.source === id && !keep.has(e.target)) {
          keep.add(e.target)
          next.push(e.target)
        }
        if (e.target === id && !keep.has(e.source)) {
          keep.add(e.source)
          next.push(e.source)
        }
      }
    }
    frontier = next
  }

  const queue = [focusId]
  const seen = new Set(queue)
  while (queue.length) {
    const id = queue.shift()!
    for (const e of doc.edges) {
      if (e.target !== id) continue
      if (seen.has(e.source)) continue
      seen.add(e.source)
      keep.add(e.source)
      queue.push(e.source)
      if (byId.get(e.source)?.kind === 'root') break
    }
  }

  const MAX = 36
  if (keep.size > MAX) {
    const focus = byId.get(focusId)!
    const ancestors = [...keep].filter((id) => {
      const k = byId.get(id)?.kind
      return (
        id === focusId ||
        k === 'root' ||
        k === 'layer' ||
        k === 'workspace' ||
        k === 'pack' ||
        k === 'http_domain' ||
        k === 'nav_group' ||
        k === 'flags' ||
        k === 'section'
      )
    })
    const outs = doc.edges
      .filter((e) => e.source === focusId || e.target === focusId)
      .map((e) => (e.source === focusId ? e.target : e.source))
      .map((id) => byId.get(id)!)
      .filter(Boolean)
      .sort(
        (a, b) =>
          (b.weight ?? 1) - (a.weight ?? 1) || a.label.localeCompare(b.label),
      )
    const picked = new Set<string>([...ancestors, focus.id])
    for (const n of outs) {
      if (picked.size >= MAX) break
      picked.add(n.id)
    }
    keep.clear()
    for (const id of picked) keep.add(id)
  }

  const nodes = [...keep]
    .map((id) => byId.get(id)!)
    .filter(Boolean)
    .sort(
      (a, b) =>
        (b.weight ?? 1) - (a.weight ?? 1) || a.label.localeCompare(b.label),
    )
  const edges = doc.edges.filter((e) => keep.has(e.source) && keep.has(e.target))
  return { nodes, edges }
}

export type CatalogEntry = {
  id: string
  label: string
  kind: string
  summary?: string
  group: string
}

export function buildCatalog(
  doc: CodeGraphDocument,
  query: string,
): CatalogEntry[] {
  const kinds = new Set(CATALOG_KINDS[doc.domain] || ['route', 'service'])
  const q = query.trim().toLowerCase()
  return doc.nodes
    .filter((n) => kinds.has(n.kind))
    .filter((n) => {
      if (!q) return true
      return (
        n.label.toLowerCase().includes(q) ||
        n.id.toLowerCase().includes(q) ||
        (n.summary || '').toLowerCase().includes(q) ||
        (n.ref_id || '').toLowerCase().includes(q)
      )
    })
    .map((n) => ({
      id: n.id,
      label: n.label,
      kind: n.kind,
      summary: n.summary || n.ref_id,
      group: n.kind,
    }))
    .sort(
      (a, b) =>
        a.group.localeCompare(b.group) || a.label.localeCompare(b.label),
    )
}

export function neighborLinks(
  doc: CodeGraphDocument,
  nodeId: string,
): Array<{ edge: CodeGraphEdge; other: CodeGraphNode; direction: 'in' | 'out' }> {
  const byId = new Map(doc.nodes.map((n) => [n.id, n]))
  const out: Array<{
    edge: CodeGraphEdge
    other: CodeGraphNode
    direction: 'in' | 'out'
  }> = []
  for (const e of doc.edges) {
    if (e.source === nodeId) {
      const other = byId.get(e.target)
      if (other) out.push({ edge: e, other, direction: 'out' })
    } else if (e.target === nodeId) {
      const other = byId.get(e.source)
      if (other) out.push({ edge: e, other, direction: 'in' })
    }
  }
  return out.sort(
    (a, b) =>
      a.edge.relation.localeCompare(b.edge.relation) ||
      a.other.label.localeCompare(b.other.label),
  )
}
