export type BrainPresenceData = {
  agent_key: string
  display_name: string
  activity: string
  mood: string
  thought: string
  thought_source: string
  pipeline_step: string
  pipeline_running: boolean
  dream_enabled: boolean
  dream_cron: string
  next_dream_at: string
  dreaming: boolean
  autonomous_mind_enabled: boolean
}

export function normalizeBrainPresence(raw: unknown): BrainPresenceData {
  const row =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  return {
    agent_key: String(row.agent_key ?? ''),
    display_name: String(row.display_name ?? ''),
    activity: String(row.activity ?? 'idle'),
    mood: String(row.mood ?? 'calm'),
    thought: String(row.thought ?? '…'),
    thought_source: String(row.thought_source ?? 'rule'),
    pipeline_step: String(row.pipeline_step ?? ''),
    pipeline_running: Boolean(row.pipeline_running),
    dream_enabled: Boolean(row.dream_enabled),
    dream_cron: String(row.dream_cron ?? '0 4 * * *'),
    next_dream_at: String(row.next_dream_at ?? ''),
    dreaming: Boolean(row.dreaming),
    autonomous_mind_enabled: Boolean(row.autonomous_mind_enabled),
  }
}

export const ACTIVITY_LABEL: Record<string, string> = {
  idle: '发呆',
  walking: '闲逛',
  exploring: '探索中',
  dreaming: '入梦中',
  posting: '试跑发帖',
  tidying: '整理记忆',
  compressing: '压缩记忆',
}

export const THOUGHT_SOURCE_LABEL: Record<string, string> = {
  rule: '规则',
  model: '模型',
}
