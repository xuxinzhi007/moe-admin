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

function nowTimeLabel(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function AiPlaygroundPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { client: adminClient } = useAdminAuth()
  const { showToast } = useDeploy()

  const initialModelParam = searchParams.get('model') || ''
  const initialAgentParam = searchParams.get('agent') || ''

  const [mode, setMode] = useState<PlaygroundMode>(initialAgentParam ? 'agent' : 'model')
  const [status, setStatus] = useState<MoeInferenceStatusData | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [agents, setAgents] = useState<ParsedAgentMeta[]>([])

  const [selectedModel, setSelectedModel] = useState(initialModelParam)
  const [selectedAgentId, setSelectedAgentId] = useState(initialAgentParam)
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
        setSelectedModel((prev) => prev || st.effective_model || st.default_post_model || st.models?.[0] || '')
      }
      if (agentsRes.success && agentsRes.data?.items) {
        const parsed = agentsRes.data.items.map(parseAgentRow)
        setAgents(parsed)
        if (initialAgentParam) {
          const hit = parsed.find((a) => a.id === initialAgentParam)
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
  }, [adminClient, applyAgentDefaults, initialAgentParam, mode, selectedAgentId])

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
          id: `opening-${activeAgent.id}-${Date.now()}`,
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

  async function handleSend() {
    const text = inputText.trim()
    if (!text || streaming) return
    if (!selectedModel.trim()) {
      showToast('请先选择推理模型')
      return
    }

    const userTurn: ChatTurn = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      time: nowTimeLabel(),
    }
    const assistantTurnId = `a-${Date.now()}`
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
              ? { ...item, content: item.content ? `${item.content} [已中断]` : '（已停止生成）' }
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
    <MonitorPageLayout
      title="模型与角色试聊"
      description="统一调试小主机 Ollama 模型与「AI 角色酒馆」角色卡 · 支持流式输出与采样参数对比"
      envNote="llm_inference · 试聊直接复用管理台鉴权与后端推理配置，无需单独开启 8080 面板"
      headActions={
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate('/ai/models')}
          >
            模型与 Modelfile
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
            onClick={() => {
              setRefreshKey((v) => v + 1)
              void loadContext()
            }}
          >
            刷新列表
          </button>
        </div>
      }
    >
      <InferenceStatusBar agentKey="" refreshKey={refreshKey} />

      <div className="ai-playground-layout">
        <AdminPanel title="试聊配置">
          <div className="form-grid" style={{ gap: 12 }}>
            <FormField label="调试模式">
              <div className="btn-row" style={{ gap: 6 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${mode === 'model' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setMode('model')}
                >
                  直接对话模型
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${mode === 'agent' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => {
                    setMode('agent')
                    applyAgentDefaults(activeAgent)
                  }}
                >
                  酒馆角色试聊（{agents.length}）
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
                    <option value="">暂无酒馆角色</option>
                  ) : (
                    agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}（{a.ownerName || a.ownerUserId}）
                      </option>
                    ))
                  )}
                </select>
                {activeAgent?.description ? (
                  <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
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
                  ? '合成角色 System Prompt（只读预览，修改请前往酒馆）'
                  : '临时 System Prompt（可选）'
              }
            >
              <textarea
                rows={5}
                readOnly={mode === 'agent'}
                value={mode === 'agent' ? effectiveSystemPrompt : customSystemPrompt}
                onChange={(e) => {
                  if (mode === 'model') setCustomSystemPrompt(e.target.value)
                }}
                placeholder="输入本次试聊的系统提示词…"
              />
            </FormField>

            <label className="checkbox-inline" style={{ fontSize: 13 }}>
              <input
                type="checkbox"
                checked={keepHistory}
                onChange={(e) => setKeepHistory(e.target.checked)}
              />
              <span>保留多轮上下文历史</span>
            </label>

            <div className="ai-param-item">
              <div className="ai-param-item-head">
                <span>Temperature</span>
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
                <span>Top P</span>
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
                <span>Repeat Penalty</span>
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

            <FormField label="最大生成 Token（max_tokens）">
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
            <div className="btn-row" style={{ gap: 8, alignItems: 'center' }}>
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
            {turns.length === 0 ? (
              <p className="muted" style={{ margin: 'auto', textAlign: 'center' }}>
                选择模型或酒馆角色后，在下方输入消息开始流式试聊（Enter 发送，Shift+Enter 换行）。
              </p>
            ) : (
              turns.map((turn) => (
                <div
                  key={turn.id}
                  className={`ai-chat-bubble ${turn.role === 'user' ? 'is-user' : 'is-assistant'}`}
                >
                  <div className={turn.error ? 'text-danger' : undefined}>
                    {turn.content || (streaming ? '思考中…' : '')}
                  </div>
                  <div className="ai-chat-meta">
                    {turn.time}
                    {turn.durationMs !== undefined ? ` · ${(turn.durationMs / 1000).toFixed(2)}s` : ''}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="ai-chat-composer">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="输入测试消息…（Enter 发送，Shift+Enter 换行）"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void handleSend()
                }
              }}
            />
            <div className="btn-row" style={{ justifyContent: 'space-between' }}>
              <span className="muted" style={{ fontSize: 12 }}>
                {streaming ? '正在从推理端流式接收回复…' : '试聊内容仅保存在当前浏览器会话'}
              </span>
              <button
                type="button"
                className="btn btn-primary"
                disabled={streaming || !inputText.trim()}
                onClick={() => void handleSend()}
              >
                {streaming ? '生成中…' : '发送消息'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </MonitorPageLayout>
  )
}
