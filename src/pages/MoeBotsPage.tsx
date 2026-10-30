import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminFormDrawer } from '../components/AdminFormDrawer'
import { AdminTag } from '../components/AdminTag'
import { FormField } from '../components/FormField'
import { IdCell } from '../components/IdCell'
import { useAdminAuth } from '../context/AdminAuthContext'
import { useDeploy } from '../context/DeployContext'
import { boolTag } from '../lib/adminLabels'
import { formatDateTime } from '../lib/format'
import { DeployApiError } from '../api/deployClient'
import { AdminTable, ListPageLayout } from '../ui'
import type { AdminTableColumn } from '../ui'

export type MoeRuntimeRow = {
  agent_key: string
  display_name: string
  bot_user_id: string
  capability_tier: string
  model_name: string
  tools_enabled: boolean
  post_quota_daily: number
  posts_today: number
  enabled: boolean
  last_run_at?: string
  last_post_id?: string
  post_schedule_mode?: string
  schedule_cron?: string
  next_run_at?: string
  system_prompt?: string
  post_rules?: string
}

const DEFAULT_POST_RULES = `用第一人称「我」，像真人朋友圈，不要官方腔
正文至少 1 个具体细节（在做什么/地点/数字/小问题）
可带 0～2 个 emoji，允许口语、吐槽、结尾轻松提问
禁止「大家好」「今日也在」「深夜时分」等套路开场
禁止排比抒情、剧本旁白、空泛「灵魂/星辰/共鸣」`

const CRON_PRESETS: Array<{ label: string; value: string }> = [
  { label: '每 1 小时', value: '0 * * * *' },
  { label: '每 6 小时', value: '0 */6 * * *' },
  { label: '每天 9:00', value: '0 9 * * *' },
  { label: '每天 9:00 和 18:00', value: '0 9,18 * * *' },
]

function scheduleModeTag(mode?: string) {
  const m = (mode || 'manual').toLowerCase()
  if (m === 'cron') return { label: '定时', tone: 'ok' as const }
  if (m === 'smart') return { label: '智能', tone: 'purple' as const }
  return { label: '手动', tone: 'neutral' as const }
}

const emptyForm = {
  agent_key: 'moe_guide',
  display_name: 'Moe 向导',
  bot_user_id: '',
  capability_tier: 's2',
  model_name: 'qwen2',
  post_quota_daily: 0,
  enabled: true,
  tools_enabled: true,
  system_prompt: '',
  post_rules: DEFAULT_POST_RULES,
  post_schedule_mode: 'manual',
  schedule_cron: '',
}

export function MoeBotsPage() {
  const { client } = useAdminAuth()
  const { showToast } = useDeploy()
  const [items, setItems] = useState<MoeRuntimeRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState<'ok' | 'err'>('ok')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [runningKey, setRunningKey] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await client.listMoeRuntimes()
      if (!res.success || !res.data) {
        setError(res.message || '加载失败')
        setItems([])
        return
      }
      setItems(res.data.items || [])
    } catch (e) {
      setError(e instanceof DeployApiError ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => {
    void load()
  }, [load])

  function openEdit(row: MoeRuntimeRow) {
    const scheduleMode = row.post_schedule_mode || 'manual'
    setForm({
      agent_key: row.agent_key,
      display_name: row.display_name,
      bot_user_id: row.bot_user_id,
      capability_tier: row.capability_tier || 's2',
      model_name: row.model_name || '',
      post_quota_daily: row.post_quota_daily ?? 0,
      enabled: row.enabled,
      tools_enabled: row.tools_enabled,
      system_prompt: row.system_prompt || '',
      post_rules: row.post_rules || DEFAULT_POST_RULES,
      post_schedule_mode: scheduleMode,
      schedule_cron:
        scheduleMode === 'smart'
          ? row.schedule_cron || ''
          : row.schedule_cron || '0 */6 * * *',
    })
    setFormError('')
    setDrawerOpen(true)
  }

  function openCreate() {
    setForm({ ...emptyForm })
    setFormError('')
    setDrawerOpen(true)
  }

  async function save() {
    const agentKey = form.agent_key.trim()
    const botUserId = form.bot_user_id.trim()
    if (!agentKey || !botUserId) {
      setFormError('请填写 agent_key 与 bot_user_id')
      return
    }
    if (form.post_schedule_mode === 'cron' && !form.schedule_cron.trim()) {
      setFormError('定时模式需填写 cron 表达式')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const res = await client.upsertMoeRuntime({
        agent_key: agentKey,
        display_name: form.display_name.trim() || agentKey,
        bot_user_id: botUserId,
        capability_tier: form.capability_tier,
        model_name: form.model_name,
        tools_enabled: form.tools_enabled,
        post_quota_daily: form.post_quota_daily,
        enabled: form.enabled,
        system_prompt: form.system_prompt,
        post_rules: form.post_rules,
        post_schedule_mode: form.post_schedule_mode,
        schedule_cron:
          form.post_schedule_mode === 'cron' || form.post_schedule_mode === 'smart'
            ? form.schedule_cron.trim()
            : '',
      })
      if (!res.success) {
        setFormError(res.message || '保存失败')
        return
      }
      setMessageTone('ok')
      setMessage('Bot 配置已保存')
      showToast('Bot 配置已保存')
      setDrawerOpen(false)
      await load()
    } catch (e) {
      setFormError(e instanceof DeployApiError ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  async function runOnce(agentKey: string) {
    setRunningKey(agentKey)
    setMessage('')
    setError('')
    try {
      const res = await client.runMoeAgentOnce(agentKey)
      if (!res.success || !res.data) {
        const msg = res.message || '试跑请求失败，请检查 API 与 Admin Token'
        setMessageTone('err')
        setMessage(msg)
        showToast(msg)
        return
      }
      if (res.data.ok) {
        const postPart = res.data.post_id ? `帖子 ID ${res.data.post_id}` : '发帖成功'
        const msg = `试跑成功 · ${res.data.agent_key || agentKey} · ${postPart}（AI 大脑可查看流水线）`
        setMessageTone('ok')
        setMessage(msg)
        showToast(msg)
      } else {
        const msg = `试跑未成功 · ${res.data.detail || '未知原因'}`
        setMessageTone('err')
        setMessage(msg)
        showToast(msg)
      }
      await load()
    } catch (e) {
      const msg = e instanceof DeployApiError ? e.message : '试跑失败，网络或网关异常'
      setMessageTone('err')
      setMessage(msg)
      showToast(msg)
    } finally {
      setRunningKey('')
    }
  }

  const columns = useMemo(
    (): AdminTableColumn<MoeRuntimeRow>[] => [
      {
        key: 'agent',
        header: 'Agent',
        render: (row) => (
          <>
            <strong>{row.display_name || row.agent_key}</strong>
            <div className="muted">
              <IdCell id={row.agent_key} />
            </div>
          </>
        ),
      },
      {
        key: 'bot',
        header: 'Bot 用户',
        render: (row) => <IdCell id={row.bot_user_id} />,
      },
      {
        key: 'schedule',
        header: '调度',
        render: (row) => (
          <>
            <AdminTag spec={scheduleModeTag(row.post_schedule_mode)} />
            {row.post_schedule_mode === 'cron' && row.schedule_cron ? (
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                {row.schedule_cron}
              </div>
            ) : null}
          </>
        ),
      },
      {
        key: 'next',
        header: '下次执行',
        cellClassName: 'muted',
        render: (row) => formatDateTime(row.next_run_at) || '—',
      },
      {
        key: 'quota',
        header: '今日/配额',
        render: (row) =>
          `${row.posts_today} / ${row.post_quota_daily > 0 ? row.post_quota_daily : '不限'}`,
      },
      {
        key: 'status',
        header: '状态',
        render: (row) => <AdminTag spec={boolTag(row.enabled)} />,
      },
      {
        key: 'last',
        header: '上次发帖',
        cellClassName: 'muted',
        render: (row) => (
          <>
            {formatDateTime(row.last_run_at) || '—'}
            {row.last_post_id ? (
              <div>
                <IdCell id={row.last_post_id} />
              </div>
            ) : null}
          </>
        ),
      },
      {
        key: 'actions',
        header: '',
        render: (row) => (
          <div className="btn-row">
            <Link
              className="btn btn-ghost btn-sm"
              to={`/ai/moe-bots/${encodeURIComponent(row.agent_key)}/brain`}
            >
              AI 大脑
            </Link>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(row)}>
              编辑
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={runningKey === row.agent_key}
              onClick={() => void runOnce(row.agent_key)}
            >
              {runningKey === row.agent_key ? '执行中…' : '试跑'}
            </button>
          </div>
        ),
      },
    ],
    [runningKey],
  )

  return (
    <>
      <ListPageLayout
        title="社区 AI Bot"
        description="配置发帖 Bot：正文由服务端 llm_inference 配置的 Ollama 或 OpenAI 兼容模型生成，支持定时 cron 与智能发送。调度器默认每 60 秒扫描。"
        headActions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            新建 Bot
          </button>
        }
        banner={
          message
            ? {
                message,
                tone: messageTone === 'err' ? 'err' : 'ok',
                onClose: () => setMessage(''),
              }
            : undefined
        }
        error={error}
      >
        <AdminTable
          columns={columns}
          rows={items}
          rowKey={(row) => row.agent_key}
          loading={loading}
          emptyText="暂无 Bot，点击「新建 Bot」或 Apifox 创建 moe_guide"
        />
      </ListPageLayout>

      <AdminFormDrawer
        open={drawerOpen}
        title="Bot 运行时配置"
        subtitle="配置 Bot 身份、发帖调度与模型行为；保存后由后端调度器接管。"
        wide
        saving={saving}
        error={formError}
        onClose={() => setDrawerOpen(false)}
        onSave={() => void save()}
      >
        <FormField label="agent_key">
          <input
            value={form.agent_key}
            onChange={(e) => setForm({ ...form, agent_key: e.target.value })}
            placeholder="moe_guide"
          />
        </FormField>
        <FormField label="显示名称">
          <input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
        </FormField>
        <FormField label="bot_user_id（App 用户 ID）">
          <input
            value={form.bot_user_id}
            onChange={(e) => setForm({ ...form, bot_user_id: e.target.value })}
            placeholder="例如 2"
          />
        </FormField>
        <FormField label="发帖调度">
          <select
            value={form.post_schedule_mode}
            onChange={(e) => {
              const mode = e.target.value
              setForm({
                ...form,
                post_schedule_mode: mode,
                schedule_cron:
                  mode === 'smart'
                    ? ''
                    : form.schedule_cron || '0 */6 * * *',
              })
            }}
          >
            <option value="manual">手动（仅 run-once / 后台试跑）</option>
            <option value="cron">定时（cron 表达式）</option>
            <option value="smart">智能（LLM 判断是否发帖 + AI 生成正文）</option>
          </select>
        </FormField>
        {form.post_schedule_mode === 'cron' || form.post_schedule_mode === 'smart' ? (
          <>
            <FormField
              label={
                form.post_schedule_mode === 'smart'
                  ? '可选评估 cron（留空则按智能重试周期运行）'
                  : 'cron 表达式（分 时 日 月 周）'
              }
            >
              <input
                value={form.schedule_cron}
                onChange={(e) => setForm({ ...form, schedule_cron: e.target.value })}
                placeholder="0 */6 * * *"
              />
            </FormField>
            <FormField label="快捷预设">
              <div className="btn-row" style={{ flexWrap: 'wrap' }}>
                {CRON_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setForm({ ...form, schedule_cron: p.value })}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </FormField>
          </>
        ) : null}
        <FormField label="模型 ID（展示用；发帖实际优先使用服务端 moe.bot_post_model）">
          <input
            value={form.model_name}
            onChange={(e) => setForm({ ...form, model_name: e.target.value })}
            placeholder="例如 qwen2.5:3b-instruct；需与推理端模型名一致"
          />
        </FormField>
        <FormField label="每日发帖配额（0 表示不限）">
          <input
            type="number"
            min={0}
            value={form.post_quota_daily}
            onChange={(e) =>
              setForm({
                ...form,
                post_quota_daily: Number(e.target.value) || 0,
              })
            }
          />
        </FormField>
        <FormField label="人设 / 系统提示（性格与擅长领域，不是发帖正文）">
          <textarea
            rows={3}
            value={form.system_prompt}
            onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
            placeholder="例如：Moe 向导，爱手绘和 ACG，说话直爽、爱吐槽，偶尔晒练习进度"
          />
        </FormField>
        <FormField label="发帖硬性规则（每行一条，存数据库，每次生成必遵守）">
          <textarea
            rows={6}
            value={form.post_rules}
            onChange={(e) => setForm({ ...form, post_rules: e.target.value })}
            placeholder={DEFAULT_POST_RULES}
          />
          <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            留空则使用服务端内置默认规则。以 # 开头的行视为注释。
          </p>
        </FormField>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
          />
          启用 Bot
        </label>
      </AdminFormDrawer>
    </>
  )
}
