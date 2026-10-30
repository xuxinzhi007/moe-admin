import { asArray } from './apiRecord'

export type AnalyticsOverview = {
  user_total: number
  users_new_7d: number
  users_by_day: Array<{ date: string; count: number }>
  memory_total: number
  memory_users: number
  memories_by_day: Array<{ date: string; count: number }>
  memory_by_type: Array<{ memory_type: string; count: number }>
  moe_tool_calls_7d: number
  moe_tool_success_rate: number
  moe_tools_by_day: Array<{ date: string; count: number }>
  chat_sessions_total: number
  chat_messages_7d: number
  chat_messages_by_day: Array<{ date: string; count: number }>
}

/** 数据分析看板：趋势序列在 proto 空时可能缺失。 */
export function normalizeAnalyticsOverview(raw: unknown): AnalyticsOverview {
  const row =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  const base = raw as AnalyticsOverview
  return {
    ...base,
    users_by_day: asArray(base.users_by_day ?? row.users_by_day ?? row.usersByDay),
    memories_by_day: asArray(
      base.memories_by_day ?? row.memories_by_day ?? row.memoriesByDay,
    ),
    memory_by_type: asArray(
      base.memory_by_type ?? row.memory_by_type ?? row.memoryByType,
    ),
    moe_tools_by_day: asArray(
      base.moe_tools_by_day ?? row.moe_tools_by_day ?? row.moeToolsByDay,
    ),
    chat_messages_by_day: asArray(
      base.chat_messages_by_day ?? row.chat_messages_by_day ?? row.chatMessagesByDay,
    ),
  }
}

export type MoeToolStats = {
  total_calls: number
  success_calls: number
  failed_calls: number
  by_tool: Array<{
    tool: string
    total_calls: number
    success_calls: number
    failed_calls: number
  }>
  by_day: Array<{ date: string; total_calls: number; success_calls: number }>
}

export function normalizeMoeToolStats(raw: unknown): MoeToolStats {
  const row =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  const base = raw as MoeToolStats
  return {
    ...base,
    by_tool: asArray(base.by_tool ?? row.by_tool ?? row.byTool),
    by_day: asArray(base.by_day ?? row.by_day ?? row.byDay),
  }
}
