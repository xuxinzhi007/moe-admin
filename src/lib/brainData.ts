import type { MoeBrainGenerationMeta } from '../api/adminClient'
import { asArray, fieldNum, fieldStr } from './apiRecord'

export type BrainEpisode = {
  id: number
  post_id: string
  content: string
  tags: string[]
  mood_tag: string
  style_score: number
  quality_score: number
  approved: boolean
  revision_count: number
  memory_key: string
  source: string
  created_at: string
}

export type BrainMemory = {
  key: string
  value: string
  memory_type: string
  updated_at: string
}

export type BrainData = {
  agent_key: string
  display_name: string
  bot_user_id: string
  forbidden_tags: string[]
  preferred_tags: string[]
  tag_stats: Array<{ tag: string; count: number }>
  episodes: BrainEpisode[]
  memories: BrainMemory[]
  generation_meta?: MoeBrainGenerationMeta
  stability_score?: number
  stability_delta?: number
  avg_episode_quality?: number
}

function normalizeEpisode(raw: unknown): BrainEpisode {
  const row =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  return {
    id: fieldNum(row, 'id'),
    post_id: fieldStr(row, 'post_id'),
    content: fieldStr(row, 'content'),
    tags: asArray<string>(row.tags),
    mood_tag: fieldStr(row, 'mood_tag'),
    style_score: fieldNum(row, 'style_score'),
    quality_score: fieldNum(row, 'quality_score'),
    approved: Boolean(row.approved),
    revision_count: fieldNum(row, 'revision_count'),
    memory_key: fieldStr(row, 'memory_key'),
    source: fieldStr(row, 'source'),
    created_at: fieldStr(row, 'created_at'),
  }
}

function normalizeMemory(raw: unknown): BrainMemory {
  const row =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  return {
    key: fieldStr(row, 'key'),
    value: fieldStr(row, 'value'),
    memory_type: fieldStr(row, 'memory_type'),
    updated_at: fieldStr(row, 'updated_at'),
  }
}

function normalizeTagStat(raw: unknown): { tag: string; count: number } {
  const row =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  return {
    tag: fieldStr(row, 'tag'),
    count: fieldNum(row, 'count'),
  }
}

/** 规范化 Brain API 载荷：proto 常省略空 repeated 字段，页面禁止直接 `.length`。 */
export function normalizeBrainData(raw: unknown): BrainData {
  const row =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  const generationMeta = row.generation_meta ?? row.generationMeta
  const stabilityScore = fieldNum(row, 'stability_score', Number.NaN)
  const stabilityDelta = fieldNum(row, 'stability_delta', Number.NaN)
  const avgEpisodeQuality = fieldNum(row, 'avg_episode_quality', Number.NaN)
  return {
    agent_key: fieldStr(row, 'agent_key'),
    display_name: fieldStr(row, 'display_name'),
    bot_user_id: fieldStr(row, 'bot_user_id'),
    forbidden_tags: asArray<string>(row.forbidden_tags ?? row.forbiddenTags),
    preferred_tags: asArray<string>(row.preferred_tags ?? row.preferredTags),
    tag_stats: asArray(row.tag_stats ?? row.tagStats).map(normalizeTagStat),
    episodes: asArray(row.episodes).map(normalizeEpisode),
    memories: asArray(row.memories).map(normalizeMemory),
    generation_meta:
      generationMeta && typeof generationMeta === 'object' && !Array.isArray(generationMeta)
        ? (generationMeta as MoeBrainGenerationMeta)
        : undefined,
    stability_score: Number.isNaN(stabilityScore) ? undefined : stabilityScore,
    stability_delta: Number.isNaN(stabilityDelta) ? undefined : stabilityDelta,
    avg_episode_quality: Number.isNaN(avgEpisodeQuality) ? undefined : avgEpisodeQuality,
  }
}
