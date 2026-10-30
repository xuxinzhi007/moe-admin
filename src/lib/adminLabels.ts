import { statusLabel } from './jobTarget'

export type TagTone =
  | 'ok'
  | 'fail'
  | 'run'
  | 'pending'
  | 'warn'
  | 'info'
  | 'vip'
  | 'admin'
  | 'purple'
  | 'mint'
  | 'neutral'
  | 'draft'
  | 'published'

export type TagSpec = { label: string; tone: TagTone }

const ROLE_MAP: Record<string, TagSpec> = {
  super_admin: { label: '超级管理员', tone: 'admin' },
  admin: { label: '管理员', tone: 'purple' },
  user: { label: '普通用户', tone: 'neutral' },
}

export function roleTag(role?: string): TagSpec {
  const key = (role || 'user').toLowerCase()
  return ROLE_MAP[key] ?? { label: role || 'user', tone: 'neutral' }
}

export function vipTag(isVip: boolean): TagSpec {
  return isVip ? { label: 'VIP', tone: 'vip' } : { label: '普通', tone: 'neutral' }
}

export function botTag(isBot: boolean, agentKey?: string): TagSpec | null {
  if (!isBot) return null
  const key = (agentKey || '').trim()
  if (key === 'moe_guide') return { label: 'AI 向导', tone: 'mint' }
  if (key) return { label: `AI · ${key}`, tone: 'mint' }
  return { label: 'AI Bot', tone: 'mint' }
}

export function boolTag(on: boolean, onLabel = '启用', offLabel = '禁用'): TagSpec {
  return on ? { label: onLabel, tone: 'ok' } : { label: offLabel, tone: 'pending' }
}

export function moderationTag(status?: string): TagSpec {
  const s = (status || 'ok').toLowerCase()
  if (s === 'ok' || s === 'approved') return { label: '已通过', tone: 'ok' }
  if (s === 'pending') return { label: '待审核', tone: 'warn' }
  if (s === 'rejected') return { label: '已拒绝', tone: 'fail' }
  return { label: status || 'ok', tone: 'neutral' }
}

export function announcementTag(status?: string): TagSpec {
  const s = (status || '').toLowerCase()
  if (s === 'published') return { label: '已发布', tone: 'published' }
  if (s === 'draft') return { label: '草稿', tone: 'draft' }
  return { label: status || '未知', tone: 'neutral' }
}

export function friendRequestTag(status?: string): TagSpec {
  const s = (status || '').toLowerCase()
  if (s === 'accepted') return { label: '已同意', tone: 'ok' }
  if (s === 'pending') return { label: '待处理', tone: 'warn' }
  if (s === 'rejected') return { label: '已拒绝', tone: 'fail' }
  return { label: status || '—', tone: 'neutral' }
}

export function rarityTag(rarity?: string): TagSpec {
  const s = (rarity || '').toLowerCase()
  if (s === 'legendary') return { label: '传说', tone: 'vip' }
  if (s === 'epic') return { label: '史诗', tone: 'purple' }
  if (s === 'rare') return { label: '稀有', tone: 'info' }
  if (s === 'common') return { label: '普通', tone: 'neutral' }
  return { label: rarity || '—', tone: 'neutral' }
}

export function achievementCategoryTag(category?: string): TagSpec {
  const map: Record<string, TagSpec> = {
    social: { label: '社交', tone: 'mint' },
    growth: { label: '成长', tone: 'ok' },
    commerce: { label: '商业', tone: 'vip' },
    activity: { label: '活动', tone: 'purple' },
  }
  const key = (category || '').toLowerCase()
  return map[key] ?? { label: category || '—', tone: 'neutral' }
}

export function auditActionTag(action?: string): TagSpec {
  const s = (action || '').toLowerCase()
  if (s.includes('delete') || s.includes('remove')) return { label: action || '—', tone: 'fail' }
  if (s.includes('create') || s.includes('add')) return { label: action || '—', tone: 'ok' }
  if (s.includes('update') || s.includes('edit') || s.includes('upsert')) return { label: action || '—', tone: 'info' }
  if (s.includes('publish') || s.includes('broadcast') || s.includes('send')) return { label: action || '—', tone: 'purple' }
  if (s.includes('bootstrap')) return { label: action || '—', tone: 'warn' }
  return { label: action || '—', tone: 'neutral' }
}

export function auditResourceTag(resource?: string): TagSpec {
  const s = (resource || '').toLowerCase()
  if (s.includes('user')) return { label: resource || '—', tone: 'mint' }
  if (s.includes('post') || s.includes('comment')) return { label: resource || '—', tone: 'info' }
  if (s.includes('vip') || s.includes('gift')) return { label: resource || '—', tone: 'vip' }
  return { label: resource || '—', tone: 'run' }
}

export function reportReasonTag(reason?: string): TagSpec {
  const s = (reason || '').toLowerCase()
  if (s.includes('spam')) return { label: reason || '—', tone: 'warn' }
  if (s.includes('abuse') || s.includes('违规')) return { label: reason || '—', tone: 'fail' }
  return { label: reason || '—', tone: 'neutral' }
}

export function genderLabel(gender?: string) {
  const s = (gender || '').toLowerCase()
  if (s === 'male' || s === 'm') return '男'
  if (s === 'female' || s === 'f') return '女'
  if (!s) return '未设置'
  return gender || '未设置'
}

export function schemaCoverageTag(coverage?: string): TagSpec {
  const s = (coverage || 'none').toLowerCase()
  if (s === 'full') return { label: '完整管理', tone: 'ok' }
  if (s === 'readonly') return { label: '只读列表', tone: 'info' }
  if (s === 'partial') return { label: '部分能力', tone: 'warn' }
  return { label: '待接入', tone: 'pending' }
}

const CAP_LABELS: Record<string, string> = {
  list: '列表',
  get: '详情',
  create: '新建',
  update: '编辑',
  delete: '删除',
  bootstrap: '导入默认',
  publish: '发布',
  broadcast: '广播',
  send: '推送',
  stats: '统计',
}

export function deployJobStatusTag(status?: string): TagSpec {
  const raw = status || ''
  const s = raw.toLowerCase()
  const label = statusLabel(raw)
  if (s === 'succeeded') return { label, tone: 'ok' }
  if (s === 'failed') return { label, tone: 'fail' }
  if (s === 'running') return { label, tone: 'run' }
  if (s === 'cancelled') return { label, tone: 'neutral' }
  return { label, tone: 'pending' }
}

export function capabilityTag(cap: string): TagSpec {
  const label = CAP_LABELS[cap] || cap
  if (cap === 'delete') return { label, tone: 'fail' }
  if (cap === 'bootstrap' || cap === 'publish') return { label, tone: 'purple' }
  if (cap === 'broadcast' || cap === 'send') return { label, tone: 'mint' }
  if (cap === 'stats') return { label, tone: 'run' }
  if (cap === 'create' || cap === 'update') return { label, tone: 'info' }
  return { label, tone: 'neutral' }
}
