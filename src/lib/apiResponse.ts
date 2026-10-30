import { normalizeApiRecords } from './apiRecord'

const ENVELOPE_KEYS = new Set(['code', 'message', 'success', 'reason'])

/**
 * Proto 列表字段名（与 Flutter `api_response.dart` listOf keys 对齐）。
 * 管理台页面统一读 `data.items`；此处把 proto 域名字段别名到 items。
 */
const LIST_ARRAY_KEYS = [
  'items',
  'users',
  'posts',
  'comments',
  'orders',
  'plans',
  'gifts',
  'groups',
  'reports',
  'memories',
  'messages',
  'sessions',
  'conversations',
  'records',
  'logs',
  'devices',
  'images',
  'transactions',
  'followings',
  'followers',
  'friends',
  'badges',
  'packs',
  'outfits',
  'models',
  'providers',
  'agents',
  'lorebooks',
  'tools',
  'notifications',
  'members',
  'history',
  'data',
] as const

/** 与 Flutter `api_response.dart` 对齐：兼容嵌套 data 与 proto/compat 压平信封。 */
export function isApiSuccess(json: Record<string, unknown>): boolean {
  if (json.success === false) return false
  const code = json.code
  if (typeof code === 'number' && code !== 0 && code !== 200) return false
  return true
}

/** 去掉 code/message/success/reason，得到业务字段。 */
export function apiPayload(json: Record<string, unknown>): Record<string, unknown> {
  const nested = json.data
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return { ...(nested as Record<string, unknown>) }
  }

  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(json)) {
    if (!ENVELOPE_KEYS.has(key) && key !== 'data') {
      out[key] = value
    }
  }
  return out
}

/** protojson camelCase → 管理台习惯的 snake_case 别名（不覆盖已有键）。 */
export function withSnakeAliases(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...payload }
  for (const [key, value] of Object.entries(payload)) {
    const snake = key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)
    if (snake !== key && out[snake] === undefined) {
      out[snake] = value
    }
  }
  return out
}

/** 将 proto 列表字段（users/posts/orders…）统一别名到 items，供管理台页面读取。 */
export function normalizeListPayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  if (Array.isArray(payload.items)) {
    return { ...payload, items: normalizeApiRecords(payload.items) }
  }
  for (const key of LIST_ARRAY_KEYS) {
    const value = payload[key]
    if (Array.isArray(value)) {
      return { ...payload, items: normalizeApiRecords(value) }
    }
  }
  return payload
}

function normalizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  return normalizeListPayload(withSnakeAliases(payload))
}

export type NormalizedResp<T> = {
  success: boolean
  code?: number
  message?: string
  data?: T
}

export function normalizeAdminResponse<T>(
  raw: Record<string, unknown>,
): NormalizedResp<T> {
  const success = isApiSuccess(raw)
  const nested = raw.data

  if (nested !== undefined && (Array.isArray(nested) || typeof nested !== 'object')) {
    return {
      success,
      code: raw.code as number | undefined,
      message: raw.message as string | undefined,
      data: nested as T,
    }
  }

  if (nested !== undefined && typeof nested === 'object' && nested !== null) {
    return {
      success,
      code: raw.code as number | undefined,
      message: raw.message as string | undefined,
      data: normalizePayload(nested as Record<string, unknown>) as T,
    }
  }

  const payload = normalizePayload(apiPayload(raw))
  const hasPayload = Object.keys(payload).length > 0
  return {
    success,
    code: raw.code as number | undefined,
    message: raw.message as string | undefined,
    data: (hasPayload ? payload : undefined) as T | undefined,
  }
}

/** 列表接口：兼容 `data: T[]`、proto `data: { items }` 与域名字段 `users/posts/…`。 */
export function unwrapListItems<T extends Record<string, unknown>>(
  data: T[] | Record<string, unknown> | null | undefined,
): T[] {
  if (Array.isArray(data)) {
    return normalizeApiRecords(data) as T[]
  }
  if (data && typeof data === 'object') {
    if (Array.isArray(data.items)) {
      return normalizeApiRecords(data.items) as T[]
    }
    for (const key of LIST_ARRAY_KEYS) {
      const value = data[key]
      if (Array.isArray(value)) {
        return normalizeApiRecords(value) as T[]
      }
    }
  }
  return []
}
