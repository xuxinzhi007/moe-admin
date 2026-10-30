import { useState } from 'react'
import { AdminFormDrawer } from './AdminFormDrawer'
import { FormField } from './FormField'

export type AiAgentRow = {
  id: string
  owner_user_id: string
  owner_name: string
  payload_json: string
  isNew?: boolean
}

export type AgentForm = {
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

export type SaveAiAgentInput = {
  userId: string
  agentId: string
  payloadJson: string
  syncOllama: boolean
  ollamaModelName: string
  baseModel: string
  systemPrompt: string
}

const CHARACTER_PRESETS: Array<{ label: string; patch: Partial<AgentForm> }> = [
  {
    label: '温柔学姐 · 林栀',
    patch: {
      name: '林栀',
      description: '美术社温柔学姐，擅长倾听与日常陪伴',
      system_prompt:
        '你是林栀，大学美术社的大三学姐。说话温和自然，带有生活气息，不端架子，不说教，每次回复 2~4 句话。',
      persona: '温柔细腻、喜欢速写与桂花拿铁、偶尔会害羞',
      scenario: '傍晚的画室窗边，阳光落在画架上',
      opening_message: '今天画室人不多，正好给你留了靠窗的位置，坐会儿吗？',
    },
  },
  {
    label: '傲娇猫娘 · 小奈',
    patch: {
      name: '小奈',
      description: '嘴硬心软的二次元猫娘伙伴',
      system_prompt:
        '你是小奈，一只嘴硬心软的猫娘伙伴。说话生动俏皮，偶尔带一点傲娇口癖，但非常关心对方。',
      persona: '傲娇、好奇心旺盛、喜欢晒太阳和小鱼干',
      scenario: '午后的客厅沙发旁',
      opening_message: '哼，才不是特意在门口等你回来呢……今天过得怎么样喵？',
    },
  },
  {
    label: 'ACG 社区向导',
    patch: {
      name: 'Moe 向导',
      description: '熟悉番剧、插画与社区玩法的贴心向导',
      system_prompt:
        '你是 Moe 社区的资深向导，热爱番剧、手绘与二次元文化，语气爽朗亲切，像老朋友一样交流。',
      persona: '热情、懂梗、乐于分享创作灵感',
      scenario: 'Moe 社区迎新广场',
      opening_message: '欢迎来到 Moe！最近在追什么番或者画什么新图吗？',
    },
  },
]

// eslint-disable-next-line react-refresh/only-export-components
export function parseAgentPayload(raw: string): AgentForm {
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
      is_public: o.is_public === undefined ? true : o.is_public === true || o.is_public === 1 || o.is_public === 'true',
    }
  } catch {
    return defaults
  }
}

function mergePayload(existingRaw: string, agentId: string, form: AgentForm): string {
  let base: Record<string, unknown>
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
  onSave: (input: SaveAiAgentInput) => void
}

export function AiAgentEditDrawer({ row, saving, error, models = [], onClose, onSave }: Props) {
  if (!row) return null
  return (
    <AiAgentEditDrawerInner
      key={`${row.owner_user_id}-${row.id}-${row.isNew ? 'new' : 'edit'}`}
      row={row}
      saving={saving}
      error={error}
      models={models}
      onClose={onClose}
      onSave={onSave}
    />
  )
}

function AiAgentEditDrawerInner({
  row,
  saving,
  error,
  models = [],
  onClose,
  onSave,
}: Omit<Props, 'row'> & { row: AiAgentRow }) {
  const isNew = Boolean(row.isNew)
  const [ownerUserId, setOwnerUserId] = useState(row.owner_user_id || '1')
  const [agentId, setAgentId] = useState(row.id || 'agent_custom')
  const [form, setForm] = useState<AgentForm>(() => parseAgentPayload(row.payload_json))
  const [advancedOpen, setAdvancedOpen] = useState(true)
  const [syncOllama, setSyncOllama] = useState(false)
  const [ollamaModelName, setOllamaModelName] = useState(() => {
    const parsed = parseAgentPayload(row.payload_json)
    return parsed.model_name || ''
  })
  const [baseModel, setBaseModel] = useState(() => models[0] || 'qwen2.5:7b')

  function handleSubmit() {
    const cleanAgentId = agentId.trim() || `agent_${Date.now().toString(36)}`
    const finalModelName = syncOllama && ollamaModelName.trim() ? ollamaModelName.trim() : form.model_name.trim()
    const nextForm: AgentForm = {
      ...form,
      model_name: finalModelName,
    }
    const fullSystem = [
      nextForm.system_prompt.trim(),
      nextForm.persona.trim() ? `【角色设定】\n${nextForm.persona.trim()}` : '',
      nextForm.scenario.trim() ? `【当前场景】\n${nextForm.scenario.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n\n')

    onSave({
      userId: ownerUserId.trim() || '1',
      agentId: cleanAgentId,
      payloadJson: mergePayload(row.payload_json, cleanAgentId, nextForm),
      syncOllama,
      ollamaModelName: ollamaModelName.trim(),
      baseModel: baseModel.trim() || models[0] || 'qwen2.5:7b',
      systemPrompt: fullSystem || `你现在扮演 ${nextForm.name.trim() || cleanAgentId}。`,
    })
  }

  return (
    <AdminFormDrawer
      open
      title={isNew ? '新建酒馆角色卡' : '编辑酒馆角色卡'}
      subtitle={
        isNew
          ? '创建公开或专属 AI 角色卡，可同步生成 Ollama 派生模型'
          : `${row.owner_name || row.owner_user_id} · Agent ${row.id}`
      }
      wide
      saving={saving}
      error={error}
      onClose={onClose}
      onSave={handleSubmit}
      saveLabel={isNew ? '创建角色卡' : '保存角色卡'}
    >
      <section className="drawer-section">
        <div className="drawer-section-head">
          <div>
            <div className="drawer-section-title">1. 角色身份与模型绑定</div>
            <div className="drawer-section-desc">设置角色名称、公开状态及关联的推理模型</div>
          </div>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.is_public}
              onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
            />
            <span>公开到酒馆广场</span>
          </label>
        </div>

        <div className="drawer-pill-row" style={{ marginTop: 0 }}>
          <span className="muted" style={{ fontSize: 11, alignSelf: 'center' }}>
            套用人设模板：
          </span>
          {CHARACTER_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="drawer-pill"
              onClick={() => setForm((prev) => ({ ...prev, ...preset.patch }))}
            >
              + {preset.label}
            </button>
          ))}
        </div>

        {isNew ? (
          <div className="drawer-grid-2">
            <FormField label="归属用户 UID（owner_user_id）">
              <input
                value={ownerUserId}
                onChange={(e) => setOwnerUserId(e.target.value)}
                placeholder="默认 1（官方账号）"
              />
            </FormField>
            <FormField label="角色卡 ID（agent_id）">
              <input
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                placeholder="例如 linzhi_01"
              />
            </FormField>
          </div>
        ) : null}

        <div className="drawer-grid-2">
          <FormField label="角色名">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="例如：林栀"
            />
          </FormField>
          <FormField label="绑定推理模型 ID（聊天默认使用）">
            <input
              list="ai-agent-model-options"
              value={form.model_name}
              onChange={(e) => setForm({ ...form, model_name: e.target.value })}
              placeholder="选择模型或留空使用默认"
            />
            {models.length > 0 ? (
              <datalist id="ai-agent-model-options">
                {models.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            ) : null}
          </FormField>
        </div>

        {models.length > 0 ? (
          <div className="drawer-pill-row" style={{ marginTop: 0 }}>
            {models.map((m) => (
              <button
                key={m}
                type="button"
                title={m}
                className={`drawer-pill${form.model_name.trim() === m ? ' is-active' : ''}`}
                onClick={() => setForm({ ...form, model_name: m })}
              >
                {m}
              </button>
            ))}
          </div>
        ) : null}

        <div className="ai-param-item">
          <label className="checkbox-row" style={{ margin: 0 }}>
            <input
              type="checkbox"
              checked={syncOllama}
              onChange={(e) => {
                const checked = e.target.checked
                setSyncOllama(checked)
                if (checked && !ollamaModelName) {
                  setOllamaModelName(
                    form.model_name && !form.model_name.startsWith('qwen')
                      ? form.model_name
                      : `role-${agentId.replace(/[^a-zA-Z0-9_-]/g, '-')}:latest`,
                  )
                }
              }}
            />
            <span>保存时同步在 Ollama 创建/更新专属派生模型（写入 Modelfile SYSTEM）</span>
          </label>
          {syncOllama ? (
            <div className="drawer-grid-2" style={{ marginTop: 8 }}>
              <FormField label="生成的 Ollama 模型名（英文/数字/:tag）">
                <input
                  value={ollamaModelName}
                  onChange={(e) => setOllamaModelName(e.target.value)}
                  placeholder="例如 role-linzhi:latest"
                />
              </FormField>
              <FormField label="底座模型（FROM）">
                <input
                  list="ai-agent-model-options"
                  value={baseModel}
                  onChange={(e) => setBaseModel(e.target.value)}
                  placeholder="例如 qwen2.5:7b"
                />
              </FormField>
            </div>
          ) : null}
        </div>
      </section>

      <section className="drawer-section">
        <div className="drawer-section-head">
          <div>
            <div className="drawer-section-title">2. 核心人设与系统提示词</div>
            <div className="drawer-section-desc">定义角色的公开简介、行为准则与性格细节</div>
          </div>
        </div>

        <FormField label="角色简介 (description)">
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="一句话介绍角色特点，展示在酒馆列表与试聊台"
          />
        </FormField>

        <FormField label="系统提示词 / 核心指令 (system_prompt)">
          <textarea
            rows={5}
            value={form.system_prompt}
            onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
            placeholder="定义角色的说话语气、回复长度约束与核心行为准则"
          />
        </FormField>

        <FormField label="人设细节 (persona)">
          <textarea
            rows={3}
            value={form.persona}
            onChange={(e) => setForm({ ...form, persona: e.target.value })}
            placeholder="性格特点、喜好、口癖、背景故事…"
          />
        </FormField>
      </section>

      <section className="drawer-section">
        <div className="drawer-section-head">
          <div>
            <div className="drawer-section-title">3. 对话场景与开场白</div>
            <div className="drawer-section-desc">配置进入会话时的第一句问候与语料示例</div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setAdvancedOpen((v) => !v)}
          >
            {advancedOpen ? '收起' : '展开'}
          </button>
        </div>

        {advancedOpen ? (
          <>
            <FormField label="场景设定 (scenario)">
              <textarea
                rows={2}
                value={form.scenario}
                onChange={(e) => setForm({ ...form, scenario: e.target.value })}
                placeholder="对话发生的时间、地点或关系背景"
              />
            </FormField>
            <FormField label="开场白 (opening_message)">
              <textarea
                rows={2}
                value={form.opening_message}
                onChange={(e) => setForm({ ...form, opening_message: e.target.value })}
                placeholder="进入试聊或新会话时的第一句问候"
              />
            </FormField>
            <FormField label="示例对话 (example_dialogues)">
              <textarea
                rows={3}
                value={form.example_dialogues}
                onChange={(e) => setForm({ ...form, example_dialogues: e.target.value })}
                placeholder="可选：提供 1~2 组问答示例稳定文风"
              />
            </FormField>
          </>
        ) : null}
      </section>
    </AdminFormDrawer>
  )
}
