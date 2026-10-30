import type { CodeGraphEdge, CodeGraphNode } from './types'

export type LayoutPoint = { x: number; y: number }

const H_GAP = 240
const V_GAP = 72
const SUB_COL_GAP = 168
const PAD = 48
/** 同一 rank 超过此数则向右折成多列，避免一条超长竖条。 */
const WRAP_AFTER = 10

/**
 * 按有向边分层（左→右），纵向固定间距；同层过长则折列。
 * 交给 fitView 缩放，不把节点硬挤进视口高度。
 */
export function layoutCodeGraphNodes(
  nodes: CodeGraphNode[],
  edges: CodeGraphEdge[],
  _width?: number,
  _height?: number,
): Map<string, LayoutPoint> {
  const out = new Map<string, LayoutPoint>()
  if (nodes.length === 0) return out

  const ids = new Set(nodes.map((n) => n.id))
  const rank = new Map<string, number>()
  const incoming = new Map<string, string[]>()
  const outgoing = new Map<string, string[]>()

  for (const n of nodes) {
    incoming.set(n.id, [])
    outgoing.set(n.id, [])
  }
  for (const e of edges) {
    if (!ids.has(e.source) || !ids.has(e.target)) continue
    outgoing.get(e.source)!.push(e.target)
    incoming.get(e.target)!.push(e.source)
  }

  const roots = nodes.filter(
    (n) => n.kind === 'root' || (incoming.get(n.id)?.length ?? 0) === 0,
  )
  const seed = roots.length > 0 ? roots : [nodes[0]]

  const queue = seed.map((n) => n.id)
  for (const id of queue) rank.set(id, 0)

  while (queue.length) {
    const id = queue.shift()!
    const base = rank.get(id) ?? 0
    for (const next of outgoing.get(id) ?? []) {
      const prev = rank.get(next)
      const candidate = base + 1
      if (prev === undefined || candidate > prev) {
        rank.set(next, candidate)
        queue.push(next)
      }
    }
  }

  for (const n of nodes) {
    if (!rank.has(n.id)) rank.set(n.id, columnForKind(n.kind))
  }

  const columns = new Map<number, CodeGraphNode[]>()
  for (const n of nodes) {
    const r = rank.get(n.id) ?? 0
    const list = columns.get(r) ?? []
    list.push(n)
    columns.set(r, list)
  }

  // 各 rank 占用的子列宽度，避免后一层叠在前一层折列上
  let xCursor = PAD
  const colKeys = [...columns.keys()].sort((a, b) => a - b)
  for (const col of colKeys) {
    const list = (columns.get(col) ?? []).sort(
      (a, b) =>
        (b.weight ?? 1) - (a.weight ?? 1) || a.label.localeCompare(b.label),
    )
    const subCols = Math.max(1, Math.ceil(list.length / WRAP_AFTER))
    list.forEach((node, i) => {
      const sub = Math.floor(i / WRAP_AFTER)
      const row = i % WRAP_AFTER
      out.set(node.id, {
        x: xCursor + sub * SUB_COL_GAP,
        y: PAD + row * V_GAP,
      })
    })
    xCursor += Math.max(H_GAP, subCols * SUB_COL_GAP + 40)
  }

  return out
}

const KIND_COLUMN: Record<string, number> = {
  root: 0,
  layer: 1,
  workspace: 1,
  pack: 1,
  flags: 1,
  nav_group: 2,
  section: 2,
  domain: 2,
  http_domain: 2,
  service: 2,
  manifest: 2,
  nav_item: 3,
  route: 3,
  slot: 3,
  biz: 3,
  page: 4,
  consumer: 4,
  feature: 4,
  item: 4,
  object: 4,
  http_op: 4,
  asset: 5,
  missing_asset: 5,
}

export function columnForKind(kind: string): number {
  return KIND_COLUMN[kind] ?? 3
}

export function nodeVisualSize(kind: string): { w: number; h: number } {
  switch (kind) {
    case 'root':
      return { w: 168, h: 58 }
    case 'http_op':
      return { w: 240, h: 44 }
    case 'route':
    case 'nav_item':
      return { w: 180, h: 48 }
    case 'missing_asset':
      return { w: 150, h: 44 }
    default:
      return { w: 150, h: 48 }
  }
}

export function kindTone(kind: string): string {
  if (kind === 'missing_asset') return 'danger'
  if (kind === 'root' || kind === 'layer') return 'root'
  if (kind === 'http_op' || kind === 'route' || kind === 'nav_item') return 'route'
  if (kind === 'service' || kind === 'biz' || kind === 'page') return 'impl'
  if (kind === 'asset' || kind === 'object' || kind === 'item') return 'asset'
  return 'default'
}

export function relationLabel(relation: string): string {
  const map: Record<string, string> = {
    contains: '包含',
    registers: '注册',
    opens: '打开',
    implements: '实现',
    uses_service: '调用',
    uses_feature: '使用',
    nav_to: '导航',
    http_to_service: '落到',
    exposes: '暴露',
    calls: '调用',
    loads: '加载',
    edits: '编辑',
    layer: '图层',
    asset: '资源',
    binds: '绑定',
    gates: '开关',
    missing: '缺失',
  }
  return map[relation] || relation
}
