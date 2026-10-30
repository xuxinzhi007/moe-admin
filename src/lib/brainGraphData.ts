import { asArray } from './apiRecord'

export type BrainGraphNode = {
  id: string
  kind: string
  label: string
  summary: string
  weight: number
  ref_id: string
}

export type BrainGraphEdge = {
  id: string
  source: string
  target: string
  relation: string
  weight: number
}

export type BrainGraphData = {
  agent_key: string
  nodes: BrainGraphNode[]
  edges: BrainGraphEdge[]
  episode_count: number
  memory_count: number
  tag_count: number
}

function normalizeNode(raw: unknown): BrainGraphNode {
  const row =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  return {
    id: String(row.id ?? ''),
    kind: String(row.kind ?? 'node'),
    label: String(row.label ?? row.id ?? ''),
    summary: String(row.summary ?? ''),
    weight: Number(row.weight ?? 1) || 1,
    ref_id: String(row.ref_id ?? row.refId ?? ''),
  }
}

function normalizeEdge(raw: unknown): BrainGraphEdge {
  const row =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  return {
    id: String(row.id ?? ''),
    source: String(row.source ?? ''),
    target: String(row.target ?? ''),
    relation: String(row.relation ?? 'related'),
    weight: Number(row.weight ?? 0.5) || 0.5,
  }
}

export function normalizeBrainGraphData(raw: unknown): BrainGraphData {
  const row =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  return {
    agent_key: String(row.agent_key ?? row.agentKey ?? ''),
    nodes: asArray(row.nodes).map(normalizeNode).filter((n) => n.id),
    edges: asArray(row.edges).map(normalizeEdge).filter((e) => e.source && e.target),
    episode_count: Number(row.episode_count ?? row.episodeCount ?? 0) || 0,
    memory_count: Number(row.memory_count ?? row.memoryCount ?? 0) || 0,
    tag_count: Number(row.tag_count ?? row.tagCount ?? 0) || 0,
  }
}
