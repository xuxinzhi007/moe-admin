import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AdminTag } from '../components/AdminTag'
import { FormField } from '../components/FormField'
import { InferenceStatusBar } from '../components/InferenceStatusBar'
import type { PageTabItem } from '../components/PageTabs'
import { useAdminAuth } from '../context/AdminAuthContext'
import { useDeploy } from '../context/DeployContext'
import { DeployApiError } from '../api/deployClient'
import type { MoeInferenceModelInfoData, MoeInferenceStatusData } from '../api/aiClient'
import { AdminPanel, TabbedPageLayout } from '../ui'
import { AiPlaygroundWorkbench } from './AiPlaygroundPage'

const MODELFILE_KEY = 'Modelfile'

const BASE_MODEL_PREFIXES = ['llama', 'qwen', 'gemma', 'mistral', 'phi', 'deepseek', 'codellama', 'nomic']

const RECOMMENDED_MODELS = [
  { name: 'qwen2.5:7b', label: 'qwen2.5:7b · 中文对话' },
  { name: 'qwen2.5:14b', label: 'qwen2.5:14b · 中文进阶' },
  { name: 'gemma3:1b', label: 'gemma3:1b · 轻量快速' },
  { name: 'llama3.1:8b', label: 'llama3.1:8b · 通用底座' },
  { name: 'deepseek-coder:6.7b', label: 'deepseek-coder:6.7b · 代码' },
]

const PROMPT_TEMPLATES = [
  {
    key: 'assistant',
    label: '专业助手模板',
    content: `你是一个专业的 AI 助手。\n\n性格特点：\n- 专业、客观\n- 乐于助人\n\n请用简洁清晰的中文回答问题。`,
  },
  {
    key: 'roleplay',
    label: '角色扮演模板',
    content: `你是一个富有感染力的二次元陪伴角色。\n\n说话风格：\n- 自然亲切、贴合人设\n- 注重情绪共鸣与细节互动\n- 回复控制在 2~4 句，不机械说教`,
  },
  {
    key: 'community',
    label: '社区发帖 Bot 模板',
    content: `你是 Moe 社区的常驻创作者，擅长分享日常灵感、ACGN 话题与治愈瞬间。\n正文自然鲜活，不带生硬标题或 AI 套话。`,
  },
]

type ModelTab = 'overview' | 'builder' | 'remote' | 'playground'

type BuilderParams = {
  temperature: number
  top_p: number
  top_k: number
  repeat_penalty: number
  num_ctx: number
  seed: number
}

const DEFAULT_PARAMS: BuilderParams = {
  temperature: 0.7,
  top_p: 0.9,
  top_k: 40,
  repeat_penalty: 1.1,
  num_ctx: 4096,
  seed: -1,
}

function isBaseModelName(name: string): boolean {
  const lower = name.toLowerCase().trim()
  if (lower.startsWith('moe-user-')) return false
  return BASE_MODEL_PREFIXES.some((prefix) => lower.startsWith(prefix))
}

function parseFromBaseModel(modelfile?: string): string {
  if (!modelfile) return ''
  const match = modelfile.match(/^\s*FROM\s+([^\s#]+)/im)
  return match?.[1]?.trim() || ''
}

function buildModelfileText(baseModel: string, systemPrompt: string, params: BuilderParams): string {
  const fromLine = `FROM ${baseModel.trim() || 'qwen2.5:7b'}`
  const paramLines = [
    `PARAMETER temperature ${params.temperature}`,
    `PARAMETER top_p ${params.top_p}`,
    `PARAMETER top_k ${params.top_k}`,
    `PARAMETER repeat_penalty ${params.repeat_penalty}`,
    `PARAMETER num_ctx ${params.num_ctx}`,
    `PARAMETER seed ${params.seed}`,
  ]
  const cleanSystem = systemPrompt.trim() || '你是一个友好的 AI 助手。'
  return `${fromLine}\n${paramLines.join('\n')}\nSYSTEM """\n${cleanSystem}\n"""\n`
}

export function AiModelsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { client: adminClient } = useAdminAuth()
  const { client: deployClient, showToast } = useDeploy()

  const tabFromUrl = searchParams.get('tab') as ModelTab | null
  const [activeTab, setActiveTab] = useState<ModelTab>(
    tabFromUrl && ['overview', 'builder', 'remote', 'playground'].includes(tabFromUrl)
      ? tabFromUrl
      : 'overview',
  )
  const [playgroundModel, setPlaygroundModel] = useState(searchParams.get('model') || '')
  const [status, setStatus] = useState<MoeInferenceStatusData | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // 模型详情与删除/拉取状态
  const [inspectModelName, setInspectModelName] = useState('')
  const [inspectInfo, setInspectInfo] = useState<MoeInferenceModelInfoData | null>(null)
  const [inspectLoading, setInspectLoading] = useState(false)
  const [deletingModel, setDeletingModel] = useState('')

  const [pullName, setPullName] = useState('')
  const [pullMethod, setPullMethod] = useState<'api' | 'cli'>('api')
  const [pullLoading, setPullLoading] = useState(false)
  const [pullHintCmd, setPullHintCmd] = useState('')

  // 在线创建/定制模型状态
  const [builderName, setBuilderName] = useState('')
  const [builderBase, setBuilderBase] = useState('')
  const [builderSystem, setBuilderSystem] = useState('')
  const [builderParams, setBuilderParams] = useState<BuilderParams>(DEFAULT_PARAMS)
  const [replaceExisting, setReplaceExisting] = useState(false)
  const [creatingModel, setCreatingModel] = useState(false)

  // Modelfile 源码读写状态（默认走 Ollama HTTP API，免 SSH）
  const [modelfileSource, setModelfileSource] = useState<'ollama' | 'local' | 'cloud'>('ollama')
  const [modelfileTargetModel, setModelfileTargetModel] = useState('')
  const [editor, setEditor] = useState('')
  const [modelfileLoading, setModelfileLoading] = useState(false)

  const loadInference = useCallback(async () => {
    setStatusLoading(true)
    try {
      const res = await adminClient.getMoeInferenceStatus()
      const data = res.success && res.data ? res.data : null
      setStatus(data)
      if (data?.models?.length) {
        const defaultTarget = data.effective_model || data.models[0]
        if (!builderBase) {
          setBuilderBase(defaultTarget)
        }
        if (!modelfileTargetModel) {
          setModelfileTargetModel(defaultTarget)
        }
      }
    } catch (e) {
      setStatus({
        online: false,
        base_url: '',
        models: [],
        default_post_model: '',
        model_loaded: false,
        message: e instanceof DeployApiError ? e.message : '读取失败',
      })
    } finally {
      setStatusLoading(false)
    }
  }, [adminClient, builderBase, modelfileTargetModel])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadInference()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadInference])

  const models = useMemo(() => status?.models ?? [], [status])
  const effectiveModel = status?.effective_model || status?.default_post_model || ''

  const { baseModels, customModels } = useMemo(() => {
    const base: string[] = []
    const custom: string[] = []
    for (const m of models) {
      if (isBaseModelName(m)) {
        base.push(m)
      } else {
        custom.push(m)
      }
    }
    return { baseModels: base, customModels: custom }
  }, [models])

  const generatedModelfile = useMemo(
    () => buildModelfileText(builderBase, builderSystem, builderParams),
    [builderBase, builderSystem, builderParams],
  )

  async function inspectModel(name: string) {
    setInspectModelName(name)
    setInspectLoading(true)
    setInspectInfo(null)
    try {
      const res = await adminClient.showMoeInferenceModel(name)
      if (res.success && res.data) {
        setInspectInfo(res.data)
      } else {
        showToast(res.message || '读取模型详情失败')
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : '读取模型详情失败')
    } finally {
      setInspectLoading(false)
    }
  }

  async function openInBuilder(name: string) {
    setInspectLoading(true)
    try {
      const res = await adminClient.showMoeInferenceModel(name)
      const info = res.success ? res.data : undefined
      const inferredFrom = parseFromBaseModel(info?.modelfile)
      const p = info?.parameters || {}
      setBuilderName(name)
      setBuilderBase(
        inferredFrom && inferredFrom !== name
          ? inferredFrom
          : baseModels[0] || models[0] || name,
      )
      setBuilderSystem(info?.system || '')
      setBuilderParams({
        temperature: typeof p.temperature === 'number' ? p.temperature : DEFAULT_PARAMS.temperature,
        top_p: typeof p.top_p === 'number' ? p.top_p : DEFAULT_PARAMS.top_p,
        top_k: typeof p.top_k === 'number' ? p.top_k : DEFAULT_PARAMS.top_k,
        repeat_penalty:
          typeof p.repeat_penalty === 'number' ? p.repeat_penalty : DEFAULT_PARAMS.repeat_penalty,
        num_ctx: typeof p.num_ctx === 'number' ? p.num_ctx : DEFAULT_PARAMS.num_ctx,
        seed: typeof p.seed === 'number' ? p.seed : DEFAULT_PARAMS.seed,
      })
      setReplaceExisting(true)
      setActiveTab('builder')
      showToast(`已载入 ${name} 的配置`)
    } catch {
      setBuilderName(name)
      setBuilderBase(baseModels[0] || models[0] || name)
      setReplaceExisting(true)
      setActiveTab('builder')
    } finally {
      setInspectLoading(false)
    }
  }

  async function handleDeleteModel(name: string) {
    const warn =
      name === effectiveModel
        ? `「${name}」是当前生效模型，删除后可能影响在线推理。\n确定要从 Ollama 删除该模型吗？`
        : `确定要从 Ollama 删除模型「${name}」吗？`
    if (!window.confirm(warn)) return
    setDeletingModel(name)
    try {
      const res = await adminClient.deleteMoeInferenceModel(name)
      if (!res.success) {
        showToast(res.message || '删除模型失败')
        return
      }
      showToast(`已删除模型 ${name}`)
      if (inspectModelName === name) {
        setInspectModelName('')
        setInspectInfo(null)
      }
      setRefreshKey((v) => v + 1)
      await loadInference()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '删除模型失败')
    } finally {
      setDeletingModel('')
    }
  }

  async function handlePullModel() {
    const target = pullName.trim()
    if (!target) {
      showToast('请输入要拉取的模型名称')
      return
    }
    if (pullMethod === 'cli') {
      setPullHintCmd(`ollama pull ${target}`)
      showToast('已生成 CLI 拉取命令')
      return
    }
    setPullLoading(true)
    setPullHintCmd('')
    try {
      const res = await adminClient.pullMoeInferenceModel(target)
      if (!res.success) {
        showToast(res.message || '拉取模型失败')
        return
      }
      showToast(`模型 ${target} 拉取完成`)
      setPullName('')
      setRefreshKey((v) => v + 1)
      await loadInference()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '拉取模型失败')
      setPullHintCmd(`ollama pull ${target}`)
    } finally {
      setPullLoading(false)
    }
  }

  async function handleCreateModel() {
    const cleanName = builderName.trim().toLowerCase()
    const cleanBase = builderBase.trim()
    if (!cleanName || !cleanBase) {
      showToast('请填写新模型名称并选择底座模型')
      return
    }
    if (/[\u4e00-\u9fa5]/.test(cleanName)) {
      showToast('Ollama 模型名称不支持中文，请使用英文、数字、横杠或 :tag')
      return
    }
    if (!/^[a-zA-Z0-9._/-]+(:[a-zA-Z0-9._-]+)?$/.test(cleanName)) {
      showToast('模型名仅支持英文、数字、点(.)、下划线(_)、横杠(-)、斜杠(/)与可选 :tag')
      return
    }
    setCreatingModel(true)
    try {
      const res = await adminClient.createMoeInferenceModel({
        name: cleanName,
        base_model: cleanBase,
        system_prompt: builderSystem.trim() || '你是一个友好的 AI 助手。',
        modelfile: generatedModelfile,
        parameters: { ...builderParams },
        replace_existing: replaceExisting,
      })
      if (!res.success) {
        showToast(res.message || '创建模型失败')
        return
      }
      showToast(`模型 ${cleanName} 创建成功`)
      setRefreshKey((v) => v + 1)
      await loadInference()
      setActiveTab('overview')
    } catch (e) {
      showToast(e instanceof Error ? e.message : '创建模型失败')
    } finally {
      setCreatingModel(false)
    }
  }

  function handleDownloadModelfile() {
    const cleanName = (builderName.trim() || 'custom-model').replace(/[^a-zA-Z0-9._-]/g, '-')
    const blob = new Blob([generatedModelfile], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${cleanName}.Modelfile`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Modelfile 已下载')
  }

  async function loadModelfileFromOllama(modelName: string) {
    const target = modelName.trim() || effectiveModel || models[0] || ''
    if (!target) {
      showToast('当前未检测到在线 Ollama 模型，请先确认推理服务在线')
      return
    }
    setModelfileLoading(true)
    try {
      const res = await adminClient.showMoeInferenceModel(target)
      if (!res.success || !res.data) {
        showToast(res.message || '从 Ollama 读取 Modelfile 失败')
        return
      }
      const info = res.data
      const content =
        info.modelfile?.trim() ||
        buildModelfileText(
          target,
          info.system || '',
          {
            temperature: info.parameters?.temperature ?? DEFAULT_PARAMS.temperature,
            top_p: info.parameters?.top_p ?? DEFAULT_PARAMS.top_p,
            top_k: info.parameters?.top_k ?? DEFAULT_PARAMS.top_k,
            repeat_penalty: info.parameters?.repeat_penalty ?? DEFAULT_PARAMS.repeat_penalty,
            num_ctx: info.parameters?.num_ctx ?? DEFAULT_PARAMS.num_ctx,
            seed: info.parameters?.seed ?? DEFAULT_PARAMS.seed,
          },
        )
      setEditor(content)
      showToast(`已从 Ollama 读取模型 ${target} 的 Modelfile`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : '读取失败')
    } finally {
      setModelfileLoading(false)
    }
  }

  async function loadModelfile() {
    if (modelfileSource === 'ollama') {
      await loadModelfileFromOllama(modelfileTargetModel)
      return
    }
    setModelfileLoading(true)
    try {
      const data = await deployClient.remoteConfigGet(modelfileSource, MODELFILE_KEY)
      setEditor(data.content || '')
      showToast(
        modelfileSource === 'local' ? '已读取本机 Modelfile 文件' : '已通过 SSH 读取远程 Modelfile 文件',
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : '读取失败'
      if (modelfileSource === 'local' && msg.includes('不存在') && (modelfileTargetModel || effectiveModel)) {
        await loadModelfileFromOllama(modelfileTargetModel || effectiveModel)
        return
      }
      showToast(msg)
    } finally {
      setModelfileLoading(false)
    }
  }

  async function saveModelfile() {
    if (!editor.trim()) {
      showToast('Modelfile 内容为空')
      return
    }
    if (modelfileSource === 'ollama') {
      const target = (modelfileTargetModel || effectiveModel || '').trim()
      if (!target) {
        showToast('请先选择或输入目标模型名称')
        return
      }
      if (!window.confirm(`确认将当前 Modelfile 应用到 Ollama 模型「${target}」？`)) {
        return
      }
      setModelfileLoading(true)
      try {
        const fromBase = parseFromBaseModel(editor) || target
        const res = await adminClient.createMoeInferenceModel({
          name: target,
          base_model: fromBase,
          modelfile: editor,
          replace_existing: false,
        })
        if (!res.success) {
          showToast(res.message || '应用 Modelfile 失败')
          return
        }
        showToast(`Modelfile 已应用到模型 ${target}`)
        setRefreshKey((v) => v + 1)
        await loadInference()
      } catch (e) {
        showToast(e instanceof Error ? e.message : '应用失败')
      } finally {
        setModelfileLoading(false)
      }
      return
    }

    const label = modelfileSource === 'local' ? '本机 backend/Modelfile' : '云端 SSH Modelfile'
    if (!window.confirm(`确认写入 ${label}？\n将自动生成 .bak 时间戳备份。`)) {
      return
    }
    setModelfileLoading(true)
    try {
      await deployClient.remoteConfigPut(modelfileSource, MODELFILE_KEY, editor)
      showToast(`已保存到 ${label}`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : '保存失败')
    } finally {
      setModelfileLoading(false)
    }
  }

  const tabs: PageTabItem<ModelTab>[] = [
    { key: 'overview', label: '模型管理与拉取', hint: `${models.length} 个` },
    { key: 'builder', label: '在线创建 / 定制', hint: 'Modelfile 参数' },
    { key: 'remote', label: 'Modelfile 源码', hint: 'HTTP / 本地' },
    { key: 'playground', label: '流式试聊台', hint: '模型 · 角色调试' },
  ]

  function switchTab(next: ModelTab, modelForPlay?: string) {
    setActiveTab(next)
    if (modelForPlay) {
      setPlaygroundModel(modelForPlay)
      setSearchParams({ tab: next, model: modelForPlay })
    } else {
      setSearchParams({ tab: next })
    }
  }

  function renderModelCard(name: string, isBase: boolean) {
    const isEffective = name === effectiveModel
    const isInspecting = inspectModelName === name
    return (
      <div
        key={name}
        className={`ai-model-card${isEffective ? ' is-effective' : ''}`}
      >
        <div className="ai-model-card-head">
          <div className="ai-model-card-title">{name}</div>
          <div className="btn-row" style={{ gap: 4 }}>
            <AdminTag
              label={isBase ? '底座模型' : '派生/自定义'}
              tone={isBase ? 'neutral' : 'info'}
            />
            {isEffective ? <AdminTag label="当前生效" tone="ok" /> : null}
          </div>
        </div>
        <div className="ai-model-card-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => switchTab('playground', name)}
          >
            试聊
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={inspectLoading && isInspecting}
            onClick={() => void inspectModel(name)}
          >
            详情
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={inspectLoading}
            onClick={() => void openInBuilder(name)}
          >
            定制/克隆
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm text-danger"
            disabled={deletingModel === name}
            onClick={() => void handleDeleteModel(name)}
          >
            {deletingModel === name ? '删除中…' : '删除'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <TabbedPageLayout
      title="模型与推理工作台"
      description="统一管理小主机 Ollama 模型库、在线拉取、Modelfile 定制与流式试聊；LoRA 离线微调保持在外部 ollama_web/finetune"
      envNote="llm_inference · 统一经管理台鉴权操作 Ollama 模型；角色人设统一由「AI 角色酒馆」维护"
      metrics={[
        { label: '在线模型总数', value: statusLoading ? '…' : models.length },
        { label: '底座模型', value: baseModels.length },
        { label: '自定义/派生模型', value: customModels.length },
        { label: '当前生效模型', value: effectiveModel || '未挂载' },
      ]}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(next) => switchTab(next)}
      headActions={
        <div className="btn-row">
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
            disabled={statusLoading}
            onClick={() => {
              setRefreshKey((v) => v + 1)
              void loadInference()
            }}
          >
            刷新模型
          </button>
        </div>
      }
    >
      <InferenceStatusBar agentKey="" refreshKey={refreshKey} />

      {activeTab === 'overview' ? (
        <>
          <AdminPanel title="拉取新模型（ollama pull）">
            <div className="ai-config-stack" style={{ gap: 12 }}>
              <FormField label="模型名称（如 qwen2.5:7b、gemma3:1b、llama3.1:8b）">
                <div className="btn-row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <input
                    style={{ flex: 1, minWidth: 240 }}
                    value={pullName}
                    onChange={(e) => setPullName(e.target.value)}
                    placeholder="输入 Ollama 官方模型名，例如 qwen2.5:7b"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void handlePullModel()
                      }
                    }}
                  />
                  <select
                    value={pullMethod}
                    onChange={(e) => setPullMethod(e.target.value as 'api' | 'cli')}
                    style={{ width: 150 }}
                  >
                    <option value="api">API 直接拉取</option>
                    <option value="cli">生成 CLI 命令</option>
                  </select>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={pullLoading}
                    onClick={() => void handlePullModel()}
                  >
                    {pullLoading
                      ? '正在拉取模型（可能需数分钟）…'
                      : pullMethod === 'cli'
                        ? '生成命令'
                        : '拉取模型'}
                  </button>
                </div>
              </FormField>

              <div className="btn-row" style={{ flexWrap: 'wrap', gap: 6 }}>
                <span className="muted" style={{ fontSize: 12 }}>
                  常用推荐：
                </span>
                {RECOMMENDED_MODELS.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setPullName(item.name)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {pullHintCmd ? (
                <div className="ai-param-item">
                  <div className="ai-param-item-head">
                    <span>小主机终端执行命令</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        void navigator.clipboard?.writeText(pullHintCmd)
                        showToast('已复制命令')
                      }}
                    >
                      复制
                    </button>
                  </div>
                  <code>{pullHintCmd}</code>
                </div>
              ) : null}
            </div>
          </AdminPanel>

          <AdminPanel title={`底座模型（${baseModels.length}）`}>
            {baseModels.length === 0 ? (
              <p className="muted">
                {statusLoading ? '正在读取推理端点…' : '暂无识别到的底座模型。'}
              </p>
            ) : (
              <div className="ai-model-grid">
                {baseModels.map((name) => renderModelCard(name, true))}
              </div>
            )}
          </AdminPanel>

          <AdminPanel
            title={`自定义与派生模型（${customModels.length}）`}
            actions={
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setBuilderName('')
                  setBuilderBase(baseModels[0] || models[0] || 'qwen2.5:7b')
                  setBuilderSystem('')
                  setBuilderParams(DEFAULT_PARAMS)
                  setReplaceExisting(false)
                  setActiveTab('builder')
                }}
              >
                新建自定义模型
              </button>
            }
          >
            {customModels.length === 0 ? (
              <p className="muted">
                暂无自定义模型，可点击右上角「新建自定义模型」基于底座模型与参数创建。
              </p>
            ) : (
              <div className="ai-model-grid">
                {customModels.map((name) => renderModelCard(name, false))}
              </div>
            )}
          </AdminPanel>

          {inspectModelName ? (
            <AdminPanel
              title={`模型详情：${inspectModelName}`}
              actions={
                <div className="btn-row">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => void openInBuilder(inspectModelName)}
                  >
                    在定制器中打开
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setInspectModelName('')
                      setInspectInfo(null)
                    }}
                  >
                    关闭
                  </button>
                </div>
              }
            >
              {inspectLoading ? (
                <p className="muted">正在从 Ollama 读取 /api/show 元数据…</p>
              ) : inspectInfo ? (
                <div className="ai-config-stack" style={{ gap: 12 }}>
                  <FormField label="System Prompt（系统提示词）">
                    <textarea
                      rows={4}
                      readOnly
                      value={inspectInfo.system || '（未设置独立 System Prompt）'}
                    />
                  </FormField>
                  <FormField label="采样参数（Parameters）">
                    <textarea
                      rows={3}
                      readOnly
                      value={inspectInfo.parameters_text || '（使用底座默认参数）'}
                    />
                  </FormField>
                  <FormField label="完整 Modelfile">
                    <textarea
                      className="config-editor"
                      rows={10}
                      readOnly
                      value={inspectInfo.modelfile || ''}
                    />
                  </FormField>
                </div>
              ) : (
                <p className="muted">未能读取该模型的详情（请确认推理端为原生 Ollama 服务）。</p>
              )}
            </AdminPanel>
          ) : null}
        </>
      ) : null}

      {activeTab === 'builder' ? (
        <AdminPanel
          title="在线创建 / 定制 Ollama 模型"
          actions={
            <div className="btn-row">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setBuilderParams(DEFAULT_PARAMS)}
              >
                重置参数默认值
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleDownloadModelfile}
              >
                下载 Modelfile
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={creatingModel}
                onClick={() => void handleCreateModel()}
              >
                {creatingModel ? '正在创建模型…' : '在 Ollama 中创建/更新模型'}
              </button>
            </div>
          }
        >
          <div className="ai-config-stack" style={{ gap: 14 }}>
            <div className="ai-param-grid">
              <FormField label="新模型名称（英文/数字/:tag）">
                <input
                  value={builderName}
                  onChange={(e) => setBuilderName(e.target.value)}
                  placeholder="例如 moe-helper:latest"
                />
              </FormField>
              <FormField label="底座模型（FROM）">
                <input
                  list="ai-models-base-datalist"
                  value={builderBase}
                  onChange={(e) => setBuilderBase(e.target.value)}
                  placeholder="选择或输入底座模型，如 qwen2.5:7b"
                />
                <datalist id="ai-models-base-datalist">
                  {models.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </FormField>
            </div>

            <label className="checkbox-inline" style={{ fontSize: 13 }}>
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
              />
              <span>若同名模型已存在，先删除旧模型再重建</span>
            </label>

            <FormField label="系统提示词（SYSTEM）">
              <div className="btn-row" style={{ marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                <span className="muted" style={{ fontSize: 12 }}>
                  插入模板：
                </span>
                {PROMPT_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.key}
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setBuilderSystem(tpl.content)
                      showToast(`已填入「${tpl.label}」`)
                    }}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
              <textarea
                rows={6}
                value={builderSystem}
                onChange={(e) => setBuilderSystem(e.target.value)}
                placeholder="定义模型的系统提示词与说话风格（留空则使用默认友好助手提示词）"
              />
            </FormField>

            <div className="ai-param-grid">
              <div className="ai-param-item">
                <div className="ai-param-item-head">
                  <span>Temperature（创造性）</span>
                  <code>{builderParams.temperature}</code>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.05}
                  value={builderParams.temperature}
                  onChange={(e) =>
                    setBuilderParams({ ...builderParams, temperature: Number(e.target.value) })
                  }
                />
                <span className="ai-param-item-hint">0 更严谨确定，0.8~1.2 更适合角色扮演</span>
              </div>

              <div className="ai-param-item">
                <div className="ai-param-item-head">
                  <span>Top P（核采样）</span>
                  <code>{builderParams.top_p}</code>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={builderParams.top_p}
                  onChange={(e) =>
                    setBuilderParams({ ...builderParams, top_p: Number(e.target.value) })
                  }
                />
                <span className="ai-param-item-hint">控制候选词累计概率范围，默认 0.9</span>
              </div>

              <div className="ai-param-item">
                <div className="ai-param-item-head">
                  <span>Top K（候选词数）</span>
                  <code>{builderParams.top_k}</code>
                </div>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={builderParams.top_k}
                  onChange={(e) =>
                    setBuilderParams({
                      ...builderParams,
                      top_k: Math.max(1, Number(e.target.value) || 40),
                    })
                  }
                />
                <span className="ai-param-item-hint">每步保留概率最高的 K 个词，默认 40</span>
              </div>

              <div className="ai-param-item">
                <div className="ai-param-item-head">
                  <span>Repeat Penalty（重复惩罚）</span>
                  <code>{builderParams.repeat_penalty}</code>
                </div>
                <input
                  type="range"
                  min={0.8}
                  max={1.8}
                  step={0.05}
                  value={builderParams.repeat_penalty}
                  onChange={(e) =>
                    setBuilderParams({
                      ...builderParams,
                      repeat_penalty: Number(e.target.value),
                    })
                  }
                />
                <span className="ai-param-item-hint">抑制复读机现象，推荐 1.05~1.15</span>
              </div>

              <div className="ai-param-item">
                <div className="ai-param-item-head">
                  <span>Num Ctx（上下文窗口）</span>
                  <code>{builderParams.num_ctx}</code>
                </div>
                <select
                  value={builderParams.num_ctx}
                  onChange={(e) =>
                    setBuilderParams({ ...builderParams, num_ctx: Number(e.target.value) })
                  }
                >
                  <option value={2048}>2048（省显存）</option>
                  <option value={4096}>4096（标准）</option>
                  <option value={8192}>8192（长对话）</option>
                  <option value={16384}>16384（超长上下文）</option>
                </select>
                <span className="ai-param-item-hint">决定单次对话最大上下文 Token 容量</span>
              </div>

              <div className="ai-param-item">
                <div className="ai-param-item-head">
                  <span>Seed（随机种子）</span>
                  <code>{builderParams.seed}</code>
                </div>
                <input
                  type="number"
                  value={builderParams.seed}
                  onChange={(e) =>
                    setBuilderParams({ ...builderParams, seed: Number(e.target.value) })
                  }
                />
                <span className="ai-param-item-hint">-1 为每次随机，固定正整数可复现输出</span>
              </div>
            </div>

            <FormField label="生成的 Modelfile 预览">
              <textarea
                className="config-editor"
                rows={11}
                readOnly
                value={generatedModelfile}
              />
            </FormField>
          </div>
        </AdminPanel>
      ) : null}

      {activeTab === 'remote' ? (
        <div className="panel remote-config-panel remote-modelfile-panel">
          <div className="panel-head">
            <h3>Modelfile 源码编辑</h3>
            <div className="remote-config-toolbar">
              <div className="btn-row" style={{ flexWrap: 'wrap', gap: 8 }}>
                <select
                  value={modelfileSource}
                  onChange={(e) =>
                    setModelfileSource(e.target.value as 'ollama' | 'local' | 'cloud')
                  }
                  style={{ width: 205 }}
                  title="选择读取与保存通道"
                >
                  <option value="ollama">Ollama 在线模型（HTTP 免 SSH）</option>
                  <option value="local">本机文件（backend/Modelfile）</option>
                  <option value="cloud">云端文件（SSH 白名单）</option>
                </select>
                {modelfileSource === 'ollama' ? (
                  <select
                    value={modelfileTargetModel || effectiveModel}
                    onChange={(e) => setModelfileTargetModel(e.target.value)}
                    style={{ minWidth: 180 }}
                    title="选择要读取/更新的 Ollama 模型"
                  >
                    {models.length === 0 ? (
                      <option value={modelfileTargetModel}>
                        {modelfileTargetModel || '暂无在线模型'}
                      </option>
                    ) : (
                      models.map((m) => (
                        <option key={m} value={m}>
                          {m === effectiveModel ? `${m} · 当前生效` : m}
                        </option>
                      ))
                    )}
                  </select>
                ) : null}
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={modelfileLoading}
                  onClick={() => void loadModelfile()}
                >
                  {modelfileSource === 'ollama' ? '从 Ollama 读取' : '读取文件'}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={modelfileLoading}
                  onClick={() => void saveModelfile()}
                >
                  {modelfileSource === 'ollama' ? '应用到 Ollama 模型' : '保存文件'}
                </button>
              </div>
            </div>
          </div>
          <div className="panel-body remote-config-body">
            <textarea
              className="config-editor"
              value={editor}
              onChange={(e) => setEditor(e.target.value)}
              spellCheck={false}
              rows={22}
              wrap="off"
              placeholder={
                modelfileSource === 'ollama'
                  ? '点击「从 Ollama 读取」通过 HTTP 直接查看当前模型的 Modelfile（无需配置 SSH）。'
                  : '点击「读取文件」查看磁盘 Modelfile；编辑后保存会自动生成 .bak 备份。'
              }
            />
            <p className="config-editor-meta">
              当前目标：
              {modelfileSource === 'ollama'
                ? `Ollama 模型 ${modelfileTargetModel || effectiveModel || '—'}`
                : `${modelfileSource === 'local' ? '本机' : '云端 SSH'} ${MODELFILE_KEY}`}
              {editor.length > 0
                ? ` · ${editor.split(/\r?\n/).length} 行 · ${editor.length} 字符`
                : ''}
            </p>
            <p className="config-editor-help">
              默认走 <strong>Ollama 在线模型（HTTP）</strong> 直接读取与重建小主机模型，无需配置 SSH 密钥。若需读写云端 VPS 上的{' '}
              <code>Modelfile</code> 磁盘备份，可切换至「云端文件」并在 <code>backend/deploy/config.yaml</code> 配置 SSH 凭据。
            </p>
          </div>
        </div>
      ) : null}

      {activeTab === 'playground' ? (
        <AiPlaygroundWorkbench
          key={`play-${playgroundModel || effectiveModel}-${refreshKey}`}
          initialModel={playgroundModel || effectiveModel}
        />
      ) : null}
    </TabbedPageLayout>
  )
}
