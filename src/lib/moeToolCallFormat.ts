export type MoeToolCallRow = {
  id: string
  tool: string
  actor_user_id: string
  agent_key?: string
  ok: boolean
  error_msg?: string
  latency_ms: number
  source: string
  arguments_preview?: string
  created_at: string
}

export type ParsedToolArgs = {
  summary: string
  fields: Array<{ key: string; value: string }>
  formattedJson: string
}

export function sourceLabel(source: string): string {
  const s = (source || 'api').toLowerCase()
  if (s === 'runtime') return 'Bot 调度'
  if (s === 'api') return 'App / API'
  return source || '—'
}

export function parseToolArguments(tool: string, raw?: string): ParsedToolArgs {
  const empty: ParsedToolArgs = { summary: '—', fields: [], formattedJson: '' }
  const text = (raw || '').trim()
  if (!text) return empty

  try {
    const obj = JSON.parse(text) as Record<string, unknown>
    const formattedJson = JSON.stringify(obj, null, 2)
    const fields: Array<{ key: string; value: string }> = []

    const push = (key: string, value: unknown) => {
      if (value == null || value === '') return
      fields.push({ key, value: String(value) })
    }

    switch (tool) {
      case 'post_create':
        push('content', obj.content)
        push('mood_tag', obj.mood_tag)
        break
      case 'post_search':
        push('query', obj.query)
        push('limit', obj.limit)
        push('mood_tag', obj.mood_tag)
        break
      case 'post_get':
        push('post_id', obj.post_id)
        break
      case 'memory_search':
        push('query', obj.query)
        push('limit', obj.limit)
        break
      case 'memory_get':
        push('key', obj.key)
        break
      case 'memory_save':
        push('key', obj.key)
        push('value', obj.value)
        push('memory_type', obj.memory_type)
        break
      default:
        for (const [k, v] of Object.entries(obj)) {
          push(k, v)
        }
    }

    let summary = fields.map((f) => `${f.key}: ${truncate(f.value, 48)}`).join(' · ')
    if (!summary && tool === 'post_create' && obj.content) {
      summary = truncate(String(obj.content), 80)
    }
    if (!summary) summary = truncate(text.replace(/\s+/g, ' '), 80)

    return { summary, fields, formattedJson }
  } catch {
    return {
      summary: truncate(text.replace(/\s+/g, ' '), 80),
      fields: [],
      formattedJson: text,
    }
  }
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return `${s.slice(0, max)}…`
}

export async function copyText(text: string): Promise<boolean> {
  if (!text) return false
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
