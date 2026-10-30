/** 数据目录表项 → 快捷操作（与 admin_schema_catalog 对齐） */
export type SchemaQuickAction = {
  label: string
  to: string
  hint?: string
}

const KEY_ACTIONS: Record<string, SchemaQuickAction[]> = {
  users: [
    { label: '编辑用户头像', to: '/biz/users', hint: '在用户详情抽屉中修改 avatar URL' },
  ],
  gifts: [{ label: '礼物目录 CRUD', to: '/biz/gifts/catalog' }],
  vip_plans: [{ label: '会员套餐', to: '/biz/vip/plans' }],
  posts: [{ label: '动态审核', to: '/biz/content/posts' }],
  comments: [{ label: '评论管理', to: '/biz/content/comments' }],
  groups: [{ label: '兴趣社区', to: '/biz/content/community' }],
  post_reports: [{ label: '举报处理', to: '/biz/content/reports' }],
  achievement_definitions: [{ label: '成长体系 · 成就', to: '/biz/growth?tab=achievements' }],
  level_configs: [{ label: '成长体系 · 等级', to: '/biz/growth?tab=levels' }],
  check_in_rewards: [{ label: '成长体系 · 签到奖励', to: '/biz/growth?tab=rewards' }],
  cloud_media_files: [{ label: '平台治理 · 图库', to: '/infra/platform?tab=media' }],
  user_memories: [{ label: '平台治理 · 记忆', to: '/infra/platform?tab=memory' }],
  user_memory_feedbacks: [{ label: '平台治理 · 记忆', to: '/infra/platform?tab=memory' }],
  user_memory_embeddings: [{ label: '平台治理 · 记忆', to: '/infra/platform?tab=memory' }],
  admin_announcements: [{ label: '公告管理', to: '/biz/announcements' }],
  notifications: [{ label: '通知推送', to: '/biz/notify' }],
  ai_user_configs: [{ label: 'AI 角色', to: '/ai/agents' }],
  follows: [{ label: '好友与关注', to: '/biz/social' }],
  friend_requests: [{ label: '好友与关注', to: '/biz/social' }],
  admin_accounts: [{ label: '管理员账号', to: '/infra/admins' }],
  admin_audit_logs: [{ label: '操作日志', to: '/infra/audit' }],
}

const DOMAIN_CONFIG_HINTS: Record<string, string> = {
  '用户与会员': '用户头像 URL 可在「用户列表」编辑；API/图库地址见「应用配置」。',
  'AI 与形象': '用户 avatar 字段存图片路径；PublicBaseUrl 变更后 App 会自动重拼 URL。',
  '礼物与玩法': '礼物 icon 支持 URL 或 emoji，在礼物目录维护。',
}

export function schemaQuickActions(key: string): SchemaQuickAction[] {
  return KEY_ACTIONS[key] || []
}

export function schemaDomainHint(domain: string): string | undefined {
  return DOMAIN_CONFIG_HINTS[domain]
}

export const RUNTIME_CONFIG_ACTION: SchemaQuickAction = {
  label: '平台治理 · 连接配置',
  to: '/infra/platform?tab=config',
  hint: '编辑 API 根地址、Image.PublicBaseUrl、云空间配额',
}

export const PLATFORM_MEMORY_ACTION: SchemaQuickAction = {
  label: '平台治理 · 记忆',
  to: '/infra/platform?tab=memory',
  hint: '按用户浏览与删除记忆条目',
}
