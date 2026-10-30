/**
 * 管理台读取 API 记录字段的辅助函数（proto snake_case + 省略的 0 值）。
 */

/** protojson 常省略的 0 值计数字段（与 Flutter api_json 对齐）。 */
export const PROTO_ZERO_NUMERIC_KEYS = [
  'likes',
  'comments',
  'price',
  'sort_order',
  'member_count',
  'message_count',
  'owned_quantity',
  'gift_charm',
  'balance',
  'exp_reward',
  'required_count',
  'visit_count',
  'total_duration_ms',
  'total_events_7d',
  'total',
  'count',
  'level',
  'experience',
  'total_exp',
  'duration_days',
  'received_gift_value',
  'size',
  'page',
  'page_size',
] as const

function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)
}

function snakeToCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
}

/** 读取数值字段：兼容 snake/camel 与 proto 省略的 0。 */
export function fieldNum(
  row: Record<string, unknown>,
  snake: string,
  fallback = 0,
): number {
  const camel = snakeToCamel(snake)
  const v = row[snake] ?? row[camel]
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    return Number.isNaN(n) ? fallback : n
  }
  return fallback
}

/** 读取字符串字段：兼容 snake/camel。 */
export function fieldStr(
  row: Record<string, unknown>,
  snake: string,
  fallback = '',
): string {
  const camel = snakeToCamel(snake)
  const v = row[snake] ?? row[camel]
  if (v == null) return fallback
  const s = String(v)
  return s.length > 0 ? s : fallback
}

/** 单条 API 记录：补 snake 别名 + proto 省略的 0 值。 */
export function normalizeApiRecord(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...raw }

  for (const [key, value] of Object.entries(raw)) {
    const snake = camelToSnake(key)
    const camel = snakeToCamel(key)
    if (snake !== key && out[snake] === undefined) {
      out[snake] = value
    }
    if (camel !== key && out[camel] === undefined) {
      out[camel] = value
    }
  }

  if (out.file_name === undefined) {
    const bn = out.image_basename ?? out.imageBasename
    if (bn !== undefined) out.file_name = bn
  }

  for (const key of PROTO_ZERO_NUMERIC_KEYS) {
    if (out[key] !== undefined) continue
    const camel = snakeToCamel(key)
    if (out[camel] !== undefined) {
      out[key] = out[camel]
      continue
    }
    out[key] = 0
  }

  return out
}

export function normalizeApiRecords(items: unknown[]): Record<string, unknown>[] {
  return items.map((item) => {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      return normalizeApiRecord(item as Record<string, unknown>)
    }
    return {}
  })
}

/** API 省略空数组时兜底为 []，避免 `obj?.arr.length` 类渲染崩溃。 */
export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : []
}
