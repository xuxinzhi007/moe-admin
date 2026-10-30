import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AdminTag } from '../components/AdminTag'
import type { AiAgentRow } from '../components/AiAgentEditDrawer'
import { FormField } from '../components/FormField'
import { InferenceStatusBar } from '../components/InferenceStatusBar'
import { useAdminAuth } from '../context/AdminAuthContext'
import { useDeploy } from '../context/DeployContext'
import type { MoeInferenceChatMessage, MoeInferenceStatusData } from '../api/aiClient'
import { AdminPanel, MonitorPageLayout } from '../ui'

type PlaygroundMode = 'model' | 'agent'

type ChatTurn = {
  id: string
  role: 'user' | 'assistant'
  content: string
  time: string
  durationMs?: number
  error?: boolean
}

type ParsedAgentMeta = {
  id: string
  ownerUserId: string
  ownerName: string
  name: string
  description: string
  systemPrompt: string
  modelName: string
  persona: string
  scenario: string
  openingMessage: string
  exampleDialogues: string
}

const SYSTEM_PROMPT_PRESETS = [
  {
    label: '通用中文助手',
    text: '你是一个专业、亲切的中文 AI 助手，回答清晰简洁、有条理。',
  },
  {
    label: '二次元陪伴',
    text: '你是一个温柔鲜活的二次元陪伴伙伴，说话自然有温度，每次回复控制在 2~4 句。',
  },
  {
    label: 'JSON 结构化',
    text: '请始终以合法、紧凑的 JSON 对象格式输出回复，不要附带多余解释。',
  },
]

const QUICK_STARTERS = [
  {
    tag: '人设与状态',
    text: '先做个简短的自我介绍，说说你现在在做什么吧',
  },
  {
    tag: '日常话题',
    text: '分享一件你今天遇到的有趣小事',
  },
  {
    tag: '共情陪伴',
    text: '如果朋友今天工作很累，你会怎么安慰他？',
  },
  {
    tag: '逻辑与总结',
    text: '请用 3 条要点总结一下你的专长与说话风格',
  },
]

function parseAgentRow(row: AiAgentRow): ParsedAgentMeta {
  try {
    const o = JSON.parse(row.payload_json) as Record<string, unknown>
    return {
      id: row.id,
      ownerUserId: row.owner_user_id,
      ownerName: row.owner_name,
      name: String(o.name ?? row.id),
      description: String(o.description ?? ''),
      systemPrompt: String(o.system_prompt ?? ''),
      modelName: String(o.model_name ?? ''),
      persona: String(o.persona ?? ''),
      scenario: String(o.scenario ?? ''),
      openingMessage: String(o.opening_message ?? ''),
      exampleDialogues: String(o.example_dialogues ?? ''),
    }
  } catch {
    return {
      id: row.id,
      ownerUserId: row.owner_user_id,
      ownerName: row.owner_name,
      name: row.id,
      description: '',
      systemPrompt: '',
      modelName: '',
      persona: '',
      scenario: '',
      openingMessage: '',
      exampleDialogues: '',
    }
  }
}

function composeAgentSystemPrompt(meta: ParsedAgentMeta): string {
  const parts: string[] = []
  if (meta.systemPrompt.trim()) {
    parts.push(meta.systemPrompt.trim())
  } else if (meta.name.trim()) {
    parts.push(`你现在扮演「${meta.name.trim()}」。`)
  }
  if (meta.persona.trim()) {
    parts.push(`【角色设定】\n${meta.persona.trim()}`)
  }
  if (meta.scenario.trim()) {
    parts.push(`【当前场景】\n${meta.scenario.trim()}`)
  }
  if (meta.exampleDialogues.trim()) {
    parts.push(`【对话示例】\n${meta.exampleDialogues.trim()}`)
  }
  return parts.join('\n\n')
}

let turnSeq = 0
function nextTurnId(prefix: string): string {
  turnSeq += 1
  return `${prefix}-${turnSeq}`
}

function nowTimeLabel(): string {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

type WorkbenchProps = {
  initialModel?: string
  initialAgent?: string
  initialMode?: PlaygroundMode
}

export function AiPlaygroundWorkbench({
  initialModel = '',
  initialAgent = '',
  initialMode,
}: WorkbenchProps) {
  const navigate = useNavigate()
  const { client: adminClient } = useAdminAuth()
  const { showToast } = useDeploy()

  const [mode, setMode] = useState<PlaygroundMode>(
    initialMode || (initialAgent ? 'agent' : 'model'),
  )
  const [status, setStatus] = useState<MoeInferenceStatusData | null>(null)
  const [agents, setAgents] = useState<ParsedAgentMeta[]>([])

  const [selectedModel, setSelectedModel] = useState(initialModel)
  const [selectedAgentId, setSelectedAgentId] = useState(initialAgent)
  const [customSystemPrompt, setCustomSystemPrompt] = useState('')
  const [keepHistory, setKeepHistory] = useState(true)

  const [temperature, setTemperature] = useState(0.7)
  const [topP, setTopP] = useState(0.9)
  const [repeatPenalty, setRepeatPenalty] = useState(1.1)
  const [maxTokens, setMaxTokens] = useState(1024)

  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [inputText, setInputText] = useState('')
  const [streaming, setStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  const applyAgentDefaults = useCallback((agent: ParsedAgentMeta | null) => {
    if (!agent) return
    if (agent.modelName) {
      setSelectedModel(agent.modelName)
    }
    if (agent.openingMessage.trim()) {
      setTurns([
        {
          id: `opening-${agent.id}`,
          role: 'assistant',
          content: agent.openingMessage.trim(),
          time: nowTimeLabel(),
        },
      ])
    } else {
      setTurns([])
    }
  }, [])

  const loadContext = useCallback(async () => {
    try {
      const [statusRes, agentsRes] = await Promise.all([
        adminClient.getMoeInferenceStatus(),
        adminClient.listAiAgents({ page: 1, page_size: 100 }),
      ])
      if (statusRes.success && statusRes.data) {
        const st = statusRes.data
        setStatus(st)
        setSelectedModel(
          (prev) => prev || st.effective_model || st.default_post_model || st.models?.[0] || '',
        )
      }
      if (agentsRes.success && agentsRes.data?.items) {
        const parsed = agentsRes.data.items.map(parseAgentRow)
        setAgents(parsed)
        if (initialAgent) {
          const hit = parsed.find((a) => a.id === initialAgent)
          if (hit) {
            setSelectedAgentId(hit.id)
            applyAgentDefaults(hit)
          }
        } else if (parsed.length > 0 && !selectedAgentId) {
          setSelectedAgentId(parsed[0].id)
          if (mode === 'agent') {
            applyAgentDefaults(parsed[0])
          }
        }
      }
    } catch {
      // ignore initial probe error; InferenceStatusBar displays details
    }
  }, [adminClient, applyAgentDefaults, initialAgent, mode, selectedAgentId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadContext()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadContext])

  const activeAgent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId) || null,
    [agents, selectedAgentId],
  )

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [turns])

  const effectiveSystemPrompt = useMemo(() => {
    if (mode === 'agent' && activeAgent) {
      return composeAgentSystemPrompt(activeAgent)
    }
    return customSystemPrompt.trim()
  }, [mode, activeAgent, customSystemPrompt])

  const models = status?.models ?? []

  function handleClearChat() {
    abortRef.current?.abort()
    setStreaming(false)
    if (mode === 'agent' && activeAgent?.openingMessage.trim()) {
      setTurns([
        {
          id: nextTurnId(`opening-${activeAgent.id}`),
          role: 'assistant',
          content: activeAgent.openingMessage.trim(),
          time: nowTimeLabel(),
        },
      ])
    } else {
      setTurns([])
    }
    showToast('当前对话已清空')
  }

  async function sendPromptText(rawText: string) {
    const text = rawText.trim()
    if (!text || streaming) return
    if (!selectedModel.trim()) {
      showToast('请先选择推理模型')
      return
    }

    const userTurn: ChatTurn = {
      id: nextTurnId('u'),
      role: 'user',
      content: text,
      time: nowTimeLabel(),
    }
    const assistantTurnId = nextTurnId('a')
    const placeholderTurn: ChatTurn = {
      id: assistantTurnId,
      role: 'assistant',
      content: '',
      time: nowTimeLabel(),
    }

    const historyTurns = keepHistory ? turns.filter((t) => !t.error && t.content.trim()) : []
    setInputText('')
    setTurns((prev) => [...prev, userTurn, placeholderTurn])
    setStreaming(true)

    const messages: MoeInferenceChatMessage[] = []
    if (effectiveSystemPrompt) {
      messages.push({ role: 'system', content: effectiveSystemPrompt })
    }
    for (const t of historyTurns) {
      messages.push({ role: t.role, content: t.content })
    }
    messages.push({ role: 'user', content: text })

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const result = await adminClient.streamMoeInferenceChat(
        {
          model: selectedModel,
          messages,
          temperature,
          top_p: topP,
          repeat_penalty: repeatPenalty,
          max_tokens: maxTokens,
        },
        (delta) => {
          setTurns((prev) =>
            prev.map((item) =>
              item.id === assistantTurnId
                ? { ...item, content: item.content + delta }
                : item,
            ),
          )
        },
        controller.signal,
      )

      setTurns((prev) =>
        prev.map((item) =>
          item.id === assistantTurnId
            ? {
                ...item,
                content: item.content || result.content || '（空回复）',
                durationMs: result.duration_ms,
              }
            : item,
        ),
      )
    } catch (e) {
      if (controller.signal.aborted) {
        setTurns((prev) =>
          prev.map((item) =>
            item.id === assistantTurnId
              ? {
                  ...item,
                  content: item.content ? `${item.content} [已中断]` : '（已停止生成）',
                }
              : item,
          ),
        )
      } else {
        const errMsg = e instanceof Error ? e.message : '推理请求失败'
        setTurns((prev) =>
          prev.map((item) =>
            item.id === assistantTurnId
              ? { ...item, content: `错误：${errMsg}`, error: true }
              : item,
          ),
        )
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  return (
    <div className="ai-playground-layout">
      <AdminPanel
        title="试聊配置"
        actions={
          mode === 'agent' ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/ai/agents')}
            >
              管理酒馆 →
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setTemperature(0.7)
                setTopP(0.9)
                setRepeatPenalty(1.1)
                setMaxTokens(1024)
              }}
            >
              重置参数
            </button>
          )
        }
      >
        <div className="ai-config-stack">
          <FormField label="调试对象">
            <div className="ai-mode-segmented">
              <button
                type="button"
                className={mode === 'model' ? 'is-active' : ''}
                onClick={() => setMode('model')}
              >
                直接对话模型
              </button>
              <button
                type="button"
                className={mode === 'agent' ? 'is-active' : ''}
                onClick={() => {
                  setMode('agent')
                  applyAgentDefaults(activeAgent)
                }}
              >
                酒馆角色（{agents.length}）
              </button>
            </div>
          </FormField>

          {mode === 'agent' ? (
            <FormField label="选择酒馆角色卡">
              <select
                value={selectedAgentId}
                onChange={(e) => {
                  const nextId = e.target.value
                  setSelectedAgentId(nextId)
                  const nextAgent = agents.find((a) => a.id === nextId) || null
                  applyAgentDefaults(nextAgent)
                }}
              >
                {agents.length === 0 ? (
                  <option value="">暂无酒馆角色（可前往 AI 角色酒馆新建）</option>
                ) : (
                  agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}（{a.ownerName || a.ownerUserId}）
                    </option>
                  ))
                )}
              </select>
              {activeAgent?.description ? (
                <p className="muted" style={{ fontSize: 12, margin: '6px 0 0' }}>
                  {activeAgent.description}
                </p>
              ) : null}
            </FormField>
          ) : null}

          <FormField label="使用推理模型">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              {models.length === 0 ? (
                <option value={selectedModel}>{selectedModel || '未检测到在线模型'}</option>
              ) : (
                models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))
              )}
            </select>
          </FormField>

          <FormField
            label={
              mode === 'agent'
                ? '角色合成 System Prompt（预览）'
                : '临时 System Prompt（可选）'
            }
          >
            <div className="ai-prompt-box">
              {mode === 'model' ? (
                <div className="ai-prompt-box-pills">
                  {SYSTEM_PROMPT_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      className="ai-prompt-pill"
                      onClick={() => setCustomSystemPrompt(p.text)}
                    >
                      + {p.label}
                    </button>
                  ))}
                  {customSystemPrompt ? (
                    <button
                      type="button"
                      className="ai-prompt-pill"
                      onClick={() => setCustomSystemPrompt('')}
                    >
                      清空
                    </button>
                  ) : null}
                </div>
              ) : null}
              <textarea
                rows={3}
                readOnly={mode === 'agent'}
                value={mode === 'agent' ? effectiveSystemPrompt : customSystemPrompt}
                onChange={(e) => {
                  if (mode === 'model') setCustomSystemPrompt(e.target.value)
                }}
                placeholder="定义本次对话的角色语气或输出格式要求（留空则使用模型默认设定）…"
              />
            </div>
          </FormField>

          <label className="ai-switch-row">
            <span>保留多轮上下文历史</span>
            <input
              type="checkbox"
              checked={keepHistory}
              onChange={(e) => setKeepHistory(e.target.checked)}
            />
          </label>

          <div className="ai-param-item">
            <div className="ai-param-item-head">
              <span>Temperature（创造性）</span>
              <code>{temperature}</code>
            </div>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
            />
          </div>

          <div className="ai-param-item">
            <div className="ai-param-item-head">
              <span>Top P（核采样）</span>
              <code>{topP}</code>
            </div>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={topP}
              onChange={(e) => setTopP(Number(e.target.value))}
            />
          </div>

          <div className="ai-param-item">
            <div className="ai-param-item-head">
              <span>Repeat Penalty（防复读）</span>
              <code>{repeatPenalty}</code>
            </div>
            <input
              type="range"
              min={0.8}
              max={1.8}
              step={0.05}
              value={repeatPenalty}
              onChange={(e) => setRepeatPenalty(Number(e.target.value))}
            />
          </div>

          <FormField label="最大生成长度（max_tokens）">
            <input
              type="number"
              min={64}
              max={8192}
              step={64}
              value={maxTokens}
              onChange={(e) => setMaxTokens(Math.max(64, Number(e.target.value) || 1024))}
            />
          </FormField>
        </div>
      </AdminPanel>

      <div className="ai-chat-shell">
        <div className="ai-chat-head">
          <div className="btn-row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <strong>
              {mode === 'agent' && activeAgent
                ? `角色：${activeAgent.name}`
                : `模型：${selectedModel || '未选择'}`}
            </strong>
            {selectedModel ? <AdminTag label={selectedModel} tone="info" /> : null}
            <AdminTag
              label={keepHistory ? '多轮上下文' : '单轮无历史'}
              tone={keepHistory ? 'ok' : 'neutral'}
            />
          </div>
          <div className="btn-row" style={{ gap: 6 }}>
            {streaming ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm text-danger"
                onClick={() => abortRef.current?.abort()}
              >
                停止生成
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleClearChat}
            >
              清空对话
            </button>
          </div>
        </div>

        <div className="ai-chat-messages" ref={listRef}>
          {turns.length <= 1 ? (
            <div className="ai-empty-stage">
              <div className="ai-empty-card">
                <div className="ai-empty-card-title">
                  {mode === 'agent' && activeAgent
                    ? `正在与「${activeAgent.name}」试聊`
                    : `已连接模型 ${selectedModel || '（未选择）'}`}
                </div>
                <div className="ai-empty-card-desc">
                  {mode === 'agent' && activeAgent
                    ? activeAgent.description || '已自动载入该角色卡的人设、场景与开场白设定。'
                    : '可直接输入测试消息，或点击下方快捷测试卡片验证模型的响应速度、人设语气与推理质量。'}
                </div>
              </div>

              {turns.map((turn) => (
                <div
                  key={turn.id}
                  className={`ai-chat-bubble ${turn.role === 'user' ? 'is-user' : 'is-assistant'}`}
                >
                  <div>{turn.content}</div>
                  <div className="ai-chat-meta">{turn.time} · 角色开场白</div>
                </div>
              ))}

              <div className="ai-starter-grid">
                {QUICK_STARTERS.map((starter) => (
                  <button
                    key={starter.text}
                    type="button"
                    className="ai-starter-card"
                    disabled={streaming}
                    onClick={() => void sendPromptText(starter.text)}
                  >
                    <span className="ai-starter-card-tag">{starter.tag}</span>
                    <span className="ai-starter-card-text">{starter.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            turns.map((turn) => (
              <div
                key={turn.id}
                className={`ai-chat-bubble ${turn.role === 'user' ? 'is-user' : 'is-assistant'}`}
              >
                <div className={turn.error ? 'text-danger' : undefined}>
                  {turn.content || (streaming ? '思考中…' : '')}
                </div>
                <div
                  className="ai-chat-meta"
                  style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <span>
                    {turn.time}
                    {turn.durationMs !== undefined
                      ? ` · ${(turn.durationMs / 1000).toFixed(2)}s`
                      : ''}
                  </span>
                  {turn.role === 'assistant' && turn.content ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '0 6px', fontSize: 11 }}
                      onClick={() => {
                        void navigator.clipboard?.writeText(turn.content)
                        showToast('已复制回复内容')
                      }}
                    >
                      复制
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="ai-chat-composer">
          <div className="ai-composer-box">
            <textarea
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="输入测试消息…（Enter 发送，Shift + Enter 换行）"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void sendPromptText(inputText)
                }
              }}
            />
            <div className="ai-composer-foot">
              <span className="ai-composer-hint">
                {streaming
                  ? '正在从推理端流式接收回复…'
                  : '试聊内容仅保存在当前浏览器会话，不写入线上用户聊天记录'}
              </span>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={streaming || !inputText.trim()}
                onClick={() => void sendPromptText(inputText)}
              >
                {streaming ? '生成中…' : '发送消息 ↵'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AiPlaygroundPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [refreshKey, setRefreshKey] = useState(0)

  const initialModelParam = searchParams.get('model') || ''
  const initialAgentParam = searchParams.get('agent') || ''
  const initialModeParam =
    searchParams.get('mode') === 'agent' || initialAgentParam ? 'agent' : 'model'

  return (
    <MonitorPageLayout
      title="模型与角色试聊"
      description="统一调试小主机 Ollama 模型与「AI 角色酒馆」角色卡 · 支持流式输出与采样参数对比"
      envNote="llm_inference · 试聊直接复用管理台鉴权与后端推理配置"
      headActions={
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate('/ai/models')}
          >
            模型与推理工作台
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate('/ai/agents')}
          >
            AI 角色酒馆
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setRefreshKey((v) => v + 1)}
          >
            刷新状态
          </button>
        </div>
      }
    >
      <InferenceStatusBar agentKey="" refreshKey={refreshKey} />
      <AiPlaygroundWorkbench
        key={`${initialModelParam}-${initialAgentParam}-${refreshKey}`}
        initialModel={initialModelParam}
        initialAgent={initialAgentParam}
        initialMode={initialModeParam}
      />
    </MonitorPageLayout>
  )
}
