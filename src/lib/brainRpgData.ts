import { asArray } from './apiRecord'

export type BrainRpgSkill = {
  tag: string
  label: string
  level: number
  locked: boolean
  usage_count: number
}

export type BrainRpgFragment = {
  id: number
  kind: string
  title: string
  status: string
  quality_score: number
  approved: boolean
  created_at: string
  memory_key: string
}

export type BrainRpgDreamLog = {
  id: number
  ran_at: string
  summary: string
  refined: number
  merged: number
  archived: number
  xp_gained: number
}

export type BrainRpgStats = {
  total_fragments: number
  solid_memories: number
  pending_tidy: number
  locked_skills: number
  graph_nodes: number
}

export type BrainRpgData = {
  agent_key: string
  level: number
  xp: number
  xp_to_next: number
  stability_score: number
  skills: BrainRpgSkill[]
  fragments: BrainRpgFragment[]
  recent_dreams: BrainRpgDreamLog[]
  stats: BrainRpgStats
  last_dream_at: string
  dream_enabled: boolean
  dream_cron: string
  next_dream_at: string
  autonomous_mind_enabled: boolean
  pending_delete_count: number
}

function normalizeSkill(raw: unknown): BrainRpgSkill {
  const row =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  return {
    tag: String(row.tag ?? ''),
    label: String(row.label ?? row.tag ?? ''),
    level: Number(row.level ?? 1) || 1,
    locked: Boolean(row.locked),
    usage_count: Number(row.usage_count ?? 0) || 0,
  }
}

function normalizeFragment(raw: unknown): BrainRpgFragment {
  const row =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  return {
    id: Number(row.id ?? 0) || 0,
    kind: String(row.kind ?? 'episode'),
    title: String(row.title ?? ''),
    status: String(row.status ?? 'fragment'),
    quality_score: Number(row.quality_score ?? 0) || 0,
    approved: Boolean(row.approved),
    created_at: String(row.created_at ?? ''),
    memory_key: String(row.memory_key ?? ''),
  }
}

function normalizeDream(raw: unknown): BrainRpgDreamLog {
  const row =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  return {
    id: Number(row.id ?? 0) || 0,
    ran_at: String(row.ran_at ?? ''),
    summary: String(row.summary ?? ''),
    refined: Number(row.refined ?? 0) || 0,
    merged: Number(row.merged ?? 0) || 0,
    archived: Number(row.archived ?? 0) || 0,
    xp_gained: Number(row.xp_gained ?? 0) || 0,
  }
}

function normalizeStats(raw: unknown): BrainRpgStats {
  const row =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  return {
    total_fragments: Number(row.total_fragments ?? 0) || 0,
    solid_memories: Number(row.solid_memories ?? 0) || 0,
    pending_tidy: Number(row.pending_tidy ?? 0) || 0,
    locked_skills: Number(row.locked_skills ?? 0) || 0,
    graph_nodes: Number(row.graph_nodes ?? 0) || 0,
  }
}

export function normalizeBrainRpgData(raw: unknown): BrainRpgData {
  const row =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  return {
    agent_key: String(row.agent_key ?? ''),
    level: Number(row.level ?? 1) || 1,
    xp: Number(row.xp ?? 0) || 0,
    xp_to_next: Number(row.xp_to_next ?? 100) || 100,
    stability_score: Number(row.stability_score ?? 70) || 70,
    skills: asArray(row.skills).map(normalizeSkill),
    fragments: asArray(row.fragments).map(normalizeFragment),
    recent_dreams: asArray(row.recent_dreams).map(normalizeDream),
    stats: normalizeStats(row.stats),
    last_dream_at: String(row.last_dream_at ?? ''),
    dream_enabled: Boolean(row.dream_enabled),
    dream_cron: String(row.dream_cron ?? '0 4 * * *'),
    next_dream_at: String(row.next_dream_at ?? ''),
    autonomous_mind_enabled: Boolean(row.autonomous_mind_enabled),
    pending_delete_count: Number(row.pending_delete_count ?? 0) || 0,
  }
}

export const FRAGMENT_STATUS_LABEL: Record<string, string> = {
  solid: '稳固',
  fragment: '碎片',
  cracked: '裂纹',
  archived: '归档',
}

export const FRAGMENT_STATUS_TONE: Record<string, 'ok' | 'warn' | 'fail' | 'neutral'> = {
  solid: 'ok',
  fragment: 'warn',
  cracked: 'fail',
  archived: 'neutral',
}
