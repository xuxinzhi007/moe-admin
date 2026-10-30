import { useEffect, useState } from 'react'
import { AdminFormDrawer } from './AdminFormDrawer'
import { FormField } from './FormField'

export type AiAgentRow = {
  id: string
  owner_user_id: string
  owner_name: string
  payload_json: string
}

type AgentForm = {
  name: string
  description: string
  system_prompt: string
  model_name: string
  persona: string
  scenario: string
  opening_message: string
  example_dialogues: string
  is_public: boolean
}

function parsePayload(raw: string): AgentForm {
  const defaults: AgentForm = {
    name: '',
    description: '',
    system_prompt: '',
    model_name: '',
    persona: '',
    scenario: '',
    opening_message: '',
    example_dialogues: '',
    is_public: true,
  }
  try {
    const o = JSON.parse(raw) as Record<string, unknown>
    return {
      name: String(o.name ?? ''),
      description: String(o.description ?? ''),
      system_prompt: String(o.system_prompt ?? ''),
      model_name: String(o.model_name ?? ''),
      persona: String(o.persona ?? ''),
      scenario: String(o.scenario ?? ''),
      opening_message: String(o.opening_message ?? ''),
      example_dialogues: String(o.example_dialogues ?? ''),
      is_public: o.is_public === true || o.is_public === 1 || o.is_public === 'true',
    }
  } catch {
    return defaults
  }
}

function mergePayload(existingRaw: string, agentId: string, form: AgentForm): string {
  let base: Record<string, unknown> = {}
  try {
    base = JSON.parse(existingRaw) as Record<string, unknown>
  } catch {
    base = {}
  }
  base.id = agentId
  base.name = form.name.trim()
  base.description = form.description.trim()
  base.system_prompt = form.system_prompt.trim()
  base.model_name = form.model_name.trim()
  base.persona = form.persona.trim()
  base.scenario = form.scenario.trim()
  base.opening_message = form.opening_message.trim()
  base.example_dialogues = form.example_dialogues.trim()
  base.is_public = form.is_public
  base.updated_at = Date.now()
  return JSON.stringify(base, null, 2)
}

type Props = {
  row: AiAgentRow | null
  saving: boolean
  error: string
  models?: string[]
  onClose: () => void
  onSave: (payloadJson: string) => void
}

export function AiAgentEditDrawer({ row, saving, error, models = [], onClose, onSave }: Props) {
  const [form, setForm] = useState<AgentForm>(() =>
    row ? parsePayload(row.payload_json) : parsePayload('{}'),
  )
  const [advancedOpen, setAdvancedOpen] = useState(false)

  useEffect(() => {
    if (row) {
      setForm(parsePayload(row.payload_json))
    }
  }, [row])

  if (!row) return null

  return (
    <AdminFormDrawer
      open={Boolean(row)}
      title="编辑酒馆角色卡"
      subtitle={`${row.owner_name || row.owner_user_id} · Agent ${row.id}`}
      saving={saving}
      error={error}
      onClose={onClose}
      onSave={() => onSave(mergePayload(row.payload_json, row.id, form))}
      saveLabel="保存角色卡"
    >
      <FormField label="角色名">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </FormField>
      <FormField label="简介">
        <textarea
          rows={2}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </FormField>
      <FormField label="绑定模型 ID（聊天用）">
        <input
          list="ai-agent-model-options"
          value={form.model_name}
          onChange={(e) => setForm({ ...form, model_name: e.target.value })}
          placeholder="从小主机模型列表选择，或留空使用默认"
        />
        {models.length > 0 ? (
          <datalist id="ai-agent-model-options">
            {models.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        ) : null}
      </FormField>
      <FormField label="系统提示 / 角色设定">
        <textarea
          rows={8}
          value={form.system_prompt}
          onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
        />
      </FormField>
      <FormField label="人设 (persona)">
        <textarea
          rows={3}
          value={form.persona}
          onChange={(e) => setForm({ ...form, persona: e.target.value })}
        />
      </FormField>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={form.is_public}
          onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
        />
        公开到酒馆广场
      </label>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => setAdvancedOpen((v) => !v)}
      >
        {advancedOpen ? '收起高级字段' : '展开高级字段'}
      </button>
      {advancedOpen ? (
        <>
          <FormField label="场景 (scenario)">
            <textarea
              rows={3}
              value={form.scenario}
              onChange={(e) => setForm({ ...form, scenario: e.target.value })}
            />
          </FormField>
          <FormField label="开场白">
            <textarea
              rows={3}
              value={form.opening_message}
              onChange={(e) => setForm({ ...form, opening_message: e.target.value })}
            />
          </FormField>
          <FormField label="示例对话">
            <textarea
              rows={4}
              value={form.example_dialogues}
              onChange={(e) => setForm({ ...form, example_dialogues: e.target.value })}
            />
          </FormField>
        </>
      ) : null}
      <p className="muted" style={{ fontSize: 12 }}>
        保存后写回用户账号下的 agents_json；未改动的 JSON 字段会保留。
      </p>
    </AdminFormDrawer>
  )
}
