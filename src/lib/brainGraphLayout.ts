import type { BrainGraphNode } from './brainGraphData'

export type LayoutPoint = { x: number; y: number }

const RING = {
  episode: 0.34,
  memory: 0.46,
  tag: 0.58,
} as const

function isTagKind(kind: string): boolean {
  return kind === 'tag' || kind === 'topic'
}

/** 分层径向布局：自传 / 记忆 / 标签分圈，间距加大减少重叠。 */
export function layoutBrainGraphNodes(
  nodes: BrainGraphNode[],
  width: number,
  height: number,
): Map<string, LayoutPoint> {
  const out = new Map<string, LayoutPoint>()
  if (nodes.length === 0) return out

  const cx = width / 2
  const cy = height / 2
  const base = Math.min(width, height)

  const agent = nodes.find((n) => n.kind === 'agent')
  if (agent) out.set(agent.id, { x: cx, y: cy })

  const placeRing = (list: BrainGraphNode[], radiusRatio: number, phase = 0) => {
    if (list.length === 0) return
    const r = base * radiusRatio
    const step = (Math.PI * 2) / list.length
    list.forEach((node, i) => {
      const angle = step * i - Math.PI / 2 + phase
      out.set(node.id, {
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
      })
    })
  }

  const episodes = nodes
    .filter((n) => n.kind === 'episode')
    .sort((a, b) => b.weight - a.weight || a.label.localeCompare(b.label))
  const memories = nodes
    .filter((n) => n.kind === 'memory')
    .sort((a, b) => a.label.localeCompare(b.label))
  const tags = nodes
    .filter((n) => isTagKind(n.kind))
    .sort((a, b) => b.weight - a.weight || a.label.localeCompare(b.label))

  placeRing(episodes, RING.episode, 0)
  placeRing(memories, RING.memory, 0.15)
  placeRing(tags, RING.tag, 0.3)

  return out
}

export function nodeVisualSize(kind: string): { w: number; h: number } {
  switch (kind) {
    case 'agent':
      return { w: 132, h: 72 }
    case 'episode':
      return { w: 168, h: 72 }
    case 'memory':
      return { w: 120, h: 56 }
    default:
      return { w: 96, h: 36 }
  }
}

export function kindTone(kind: string): string {
  switch (kind) {
    case 'agent':
      return 'agent'
    case 'episode':
      return 'episode'
    case 'memory':
      return 'memory'
    case 'topic':
      return 'topic'
    default:
      return 'tag'
  }
}

export const KIND_LABEL: Record<string, string> = {
  agent: 'Bot 核心',
  episode: '自传',
  memory: '记忆块',
  tag: '标签',
  topic: '话题',
}

export const RELATION_LABEL: Record<string, string> = {
  authored: '生成',
  stored_as: '写入记忆',
  has_tag: '打标',
  mood: '情绪',
  remembers: '长期记忆',
  related: '关联',
  same_type: '同类',
}
