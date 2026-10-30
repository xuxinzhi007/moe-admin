/** Moe 工具：中文展示名（保留英文 tool_name 作技术 ID） */

export const MOE_TOOL_TITLE_ZH: Record<string, string> = {
  memory_search: '检索记忆',
  memory_get: '读取记忆',
  memory_save: '保存记忆',
  post_search: '搜索动态',
  post_get: '获取动态',
  post_create: '发布动态',
  brain_refine_episode: '润色自传',
  brain_curate_memories: '整理记忆',
}

export function toolTitleZh(name: string): string {
  const key = name.trim()
  return MOE_TOOL_TITLE_ZH[key] ?? key
}

export function toolIdFromNodeId(nodeId: string): string {
  return nodeId.startsWith('tool-') ? nodeId.slice(5) : nodeId
}
