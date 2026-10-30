import { useCallback, useEffect, useState } from 'react'
import { AdminTag } from './AdminTag'
import { BrainRpgCharacter } from './BrainRpgCharacter'
import { PageMessage } from './PageMessage'
import type { AdminClient } from '../api/adminClient'
import { DeployApiError } from '../api/deployClient'
import {
  FRAGMENT_STATUS_LABEL,
  FRAGMENT_STATUS_TONE,
  normalizeBrainRpgData,
  type BrainRpgData,
} from '../lib/brainRpgData'
import { normalizeBrainPresence, type BrainPresenceData } from '../lib/brainRpgPresence'

type Props = {
  agentKey: string
  client: AdminClient
  refreshKey?: number
  onRefreshBrain?: () => void
  showToast: (msg: string) => void
}

export function BrainRpgPanel({
  agentKey,
  client,
  refreshKey = 0,
  onRefreshBrain,
  showToast,
}: Props) {
  const [rpg, setRpg] = useState<BrainRpgData | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState<'ok' | 'warn' | 'err'>('ok')
  const [presence, setPresence] = useState<BrainPresenceData | null>(null)
  const [dreamCron, setDreamCron] = useState('0 4 * * *')
  const [dreamEnabled, setDreamEnabled] = useState(false)
  const [autonomousMind, setAutonomousMind] = useState(false)
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [savingMind, setSavingMind] = useState(false)
  const [zoneHint, setZoneHint] = useState('')

  const loadRpg = useCallback(async () => {
    if (!agentKey) return
    setLoading(true)
    try {
      const res = await client.getMoeBrainRpg(agentKey)
      if (!res.success || !res.data) {
        setRpg(null)
        showToast(res.message || 'RPG 数据加载失败')
        return
      }
      setRpg(normalizeBrainRpgData(res.data))
      setDreamCron(res.data.dream_cron || '0 4 * * *')
      setDreamEnabled(Boolean(res.data.dream_enabled))
      setAutonomousMind(Boolean(res.data.autonomous_mind_enabled))
    } catch (e) {
      setRpg(null)
      showToast(e instanceof DeployApiError ? e.message : 'RPG 数据加载失败')
    } finally {
      setLoading(false)
    }
  }, [agentKey, client, showToast])

  useEffect(() => {
    void loadRpg()
  }, [loadRpg, refreshKey])

  const loadPresence = useCallback(async () => {
    if (!agentKey) return
    try {
      const res = await client.getMoeBrainPresence(agentKey)
      if (res.success && res.data) {
        setPresence(normalizeBrainPresence(res.data))
      }
    } catch {
      /* ignore polling errors */
    }
  }, [agentKey, client])

  useEffect(() => {
    void loadPresence()
    const id = window.setInterval(() => void loadPresence(), 2500)
    return () => window.clearInterval(id)
  }, [loadPresence, refreshKey])

  const triggerThought = useCallback(async () => {
    if (!agentKey || !autonomousMind) return
    try {
      await client.generateMoeBrainThought(agentKey)
      await loadPresence()
    } catch {
      /* ignore background think errors */
    }
  }, [agentKey, autonomousMind, client, loadPresence])

  useEffect(() => {
    if (!autonomousMind) return
    void triggerThought()
    const id = window.setInterval(() => void triggerThought(), 25000)
    return () => window.clearInterval(id)
  }, [autonomousMind, triggerThought, refreshKey])

  async function saveAutonomousMind(enabled: boolean) {
    setSavingMind(true)
    try {
      const res = await client.updateMoeBrainAutonomousMind(agentKey, {
        autonomous_mind_enabled: enabled,
      })
      if (!res.success || !res.data) {
        showToast(res.message || '保存自主思考失败')
        return
      }
      setAutonomousMind(Boolean(res.data.autonomous_mind_enabled))
      showToast(enabled ? 'Bot 开始自主思考' : '已关闭自主思考')
      await loadRpg()
      await loadPresence()
      if (enabled) {
        await triggerThought()
      }
    } catch (e) {
      showToast(e instanceof DeployApiError ? e.message : '保存自主思考失败')
    } finally {
      setSavingMind(false)
    }
  }

  async function saveDreamSchedule() {
    setSavingSchedule(true)
    try {
      const res = await client.updateMoeBrainDreamSchedule(agentKey, {
        dream_enabled: dreamEnabled,
        dream_cron: dreamCron,
      })
      if (!res.success || !res.data) {
        showToast(res.message || '保存入梦计划失败')
        return
      }
      showToast(dreamEnabled ? '已启用定时入梦' : '已关闭定时入梦')
      await loadRpg()
      await loadPresence()
    } catch (e) {
      showToast(e instanceof DeployApiError ? e.message : '保存入梦计划失败')
    } finally {
      setSavingSchedule(false)
    }
  }

  async function runAction(
    key: string,
    fn: () => Promise<void>,
    confirmText?: string,
  ) {
    if (confirmText && !confirm(confirmText)) return
    setBusy(key)
    setMessage('')
    try {
      await fn()
    } finally {
      setBusy('')
    }
  }

  async function dream(skipCurate = false) {
    await runAction(
      'dream',
      async () => {
        const res = await client.runMoeBrainDream(agentKey, { skip_curate: skipCurate })
        if (!res.success || !res.data) {
          showToast(res.message || '入梦失败')
          return
        }
        const d = res.data
        setMessage(d.summary || '入梦完成')
        setMessageTone('ok')
        showToast(`入梦 +${d.xp_gained} XP · Lv.${d.level}`)
        await loadRpg()
        onRefreshBrain?.()
        await loadPresence()
      },
      skipCurate
        ? '仅统计并入梦（不调用 LLM 润色）？'
        : '入梦整理：将尝试润色低分自传并写入梦境日志，可能需要数分钟。',
    )
  }

  async function compress() {
    await runAction(
      'compress',
      async () => {
        const res = await client.compressMoeBrainMemories(agentKey, { days: 7 })
        if (!res.success || !res.data) {
          showToast(res.message || '压缩失败')
          return
        }
        const d = res.data
        const detail = [
          d.swept_count ? `清扫 ${d.swept_count} 条` : '',
          d.merged_clusters ? `合并 ${d.merged_clusters} 簇` : '',
          d.marked_count ? `标记 ${d.marked_count} 条待删` : '',
          `队列剩 ${d.pending_remaining ?? 0}`,
        ]
          .filter(Boolean)
          .join(' · ')
        setMessage(d.summary || detail || `已压缩 ${d.source_count} 条 → ${d.memory_key}`)
        setMessageTone('ok')
        showToast(`${detail || '压缩完成'} +${d.xp_gained} XP`)
        await loadRpg()
        onRefreshBrain?.()
        await loadPresence()
      },
      '标记-清扫式压缩：合并重复/零散记忆，上轮标记的条目会被删除。继续？',
    )
  }

  async function tidy() {
    await runAction(
      'tidy',
      async () => {
        const res = await client.tidyMoeBrainFragments(agentKey, { max_episodes: 10 })
        if (!res.success || !res.data) {
          showToast(res.message || '整理失败')
          return
        }
        const d = res.data
        setMessage(`整理 ${d.approved}/${d.total} 条认可 · +${d.xp_gained} XP`)
        setMessageTone('ok')
        showToast(`整理完成 +${d.xp_gained} XP`)
        await loadRpg()
        onRefreshBrain?.()
        await loadPresence()
      },
      '整理碎片：批量润色低分自传，可能需要数分钟。',
    )
  }

  async function toggleSkill(tag: string, lock: boolean) {
    setBusy(`skill-${tag}`)
    try {
      const res = await client.lockMoeBrainSkill(agentKey, { tag, lock })
      if (!res.success) {
        showToast(res.message || '技能操作失败')
        return
      }
      await loadRpg()
    } catch (e) {
      showToast(e instanceof DeployApiError ? e.message : '技能操作失败')
    } finally {
      setBusy('')
    }
  }

  async function forgetMemory(memoryKey: string) {
    if (!memoryKey) return
    await runAction(
      `forget-${memoryKey}`,
      async () => {
        const res = await client.forgetMoeBrainMemory(agentKey, { memory_key: memoryKey })
        if (!res.success || !res.data?.deleted) {
          showToast(res.message || '遗忘失败')
          return
        }
        showToast('已遗忘记忆')
        await loadRpg()
        onRefreshBrain?.()
        await loadPresence()
      },
      `确定遗忘记忆「${memoryKey}」？此操作不可撤销。`,
    )
  }

  const xpPct =
    rpg && rpg.xp_to_next > 0 ? Math.min(100, Math.round((rpg.xp / rpg.xp_to_next) * 100)) : 0
  const skills = rpg?.skills ?? []
  const fragments = rpg?.fragments ?? []
  const dreams = rpg?.recent_dreams ?? []
  const stats = rpg?.stats

  return (
    <section className="brain-rpg panel content-panel-table">
      <div className="content-toolbar">
        <div className="content-toolbar-head">
          <strong>记忆 RPG</strong>
          <span>把 Bot 的经历整理成可复用的记忆，帮助它下次发动态更像自己，而不是直接发布动态。</span>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={loading || Boolean(busy)}
          onClick={() => void loadRpg()}
        >
          {loading ? '加载中…' : '刷新 RPG'}
        </button>
      </div>

      <PageMessage message={message} tone={messageTone} onClose={() => setMessage('')} />

      {loading && !rpg ? <p className="muted">加载 RPG 数据…</p> : null}

      {rpg ? (
        <>
          <div className="brain-rpg-purpose">
            <div>
              <span className="brain-rpg-purpose-kicker">这一区域的作用</span>
              <strong>让 Bot 记住经历，慢慢形成自己的偏好</strong>
              <p>入梦负责整理和压缩历史，自主思考负责观察和产生想法；真正发动态仍由“工作台 → 试跑发帖”完成。</p>
            </div>
            <AdminTag label={autonomousMind ? '正在观察' : '等待开启'} tone={autonomousMind ? 'ok' : 'neutral'} />
          </div>
          <div className="brain-rpg-game-shell">
            <div className="brain-rpg-scene-col">
              <BrainRpgCharacter
                presence={presence}
                displayName={presence?.display_name}
                lockedSkillCount={stats?.locked_skills ?? 0}
                onZoneClick={(zone) => {
                  setZoneHint(`${zone.label}：${zone.hint} · ${zone.actionHint}`)
                }}
              />
              {zoneHint ? <p className="brain-rpg-zone-hint muted">{zoneHint}</p> : null}
            </div>
            <div className="brain-rpg-side-panel">
              <div className="brain-rpg-hero-card">
                <span className="summary-label">等级</span>
                <strong>Lv.{rpg.level}</strong>
                <div className="brain-rpg-xp-bar" aria-hidden>
                  <span style={{ width: `${xpPct}%` }} />
                </div>
                <span className="summary-note">
                  {rpg.xp} / {rpg.xp_to_next} XP
                </span>
              </div>
              <div className="brain-rpg-hero-card">
                <span className="summary-label">主动观察（不发帖）</span>
                <label className="brain-rpg-schedule-row">
                  <input
                    type="checkbox"
                    checked={autonomousMind}
                    disabled={savingMind}
                    onChange={(e) => void saveAutonomousMind(e.target.checked)}
                  />
                  开启后 Bot 会定期观察并产生想法
                </label>
                <span className="summary-note">
                  {autonomousMind
                    ? '观察模式：每 ~25s 刷新想法，气泡显示「模型」'
                    : '关闭时仅规则气泡（背包/技能提示）'}
                </span>
              </div>
              <div className="brain-rpg-hero-card">
                <span className="summary-label">定时整理记忆</span>
                <label className="brain-rpg-schedule-row">
                  <input
                    type="checkbox"
                    checked={dreamEnabled}
                    onChange={(e) => setDreamEnabled(e.target.checked)}
                  />
                  启用定时整理
                </label>
                <input
                  type="text"
                  value={dreamCron}
                  placeholder="0 4 * * *"
                  onChange={(e) => setDreamCron(e.target.value)}
                />
                <span className="summary-note">
                  下次 {rpg.next_dream_at || '—'} · 上次 {rpg.last_dream_at || '—'}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={savingSchedule}
                  onClick={() => void saveDreamSchedule()}
                >
                  {savingSchedule ? '保存中…' : '保存入梦计划'}
                </button>
              </div>
            </div>
          </div>

          <div className="brain-rpg-hero">
            <div className="brain-rpg-hero-card">
              <span className="summary-label">稳定度</span>
              <strong>{rpg.stability_score}</strong>
              <span className="summary-note">试跑奖惩（独立 XP）</span>
            </div>
            <div className="brain-rpg-hero-card">
              <span className="summary-label">碎片背包</span>
              <strong>{stats?.total_fragments ?? 0}</strong>
              <span className="summary-note">
                稳固 {stats?.solid_memories ?? 0} · 待整理 {stats?.pending_tidy ?? 0}
              </span>
            </div>
            <div className="brain-rpg-hero-card">
              <span className="summary-label">待删队列</span>
              <strong>{rpg.pending_delete_count}</strong>
              <span className="summary-note">压缩标记 · 下轮清扫</span>
            </div>
            <div className="brain-rpg-hero-card">
              <span className="summary-label">技能槽</span>
              <strong>{stats?.locked_skills ?? 0} / 8</strong>
              <span className="summary-note">锁定 tag 会注入发帖 prompt</span>
            </div>
          </div>

          <div className="brain-rpg-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={Boolean(busy)}
              onClick={() => void dream(false)}
            >
              {busy === 'dream' ? '入梦中…' : '入梦整理'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={Boolean(busy)}
              onClick={() => void dream(true)}
            >
              轻量入梦
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={Boolean(busy)}
              onClick={() => void compress()}
            >
              {busy === 'compress' ? '压缩中…' : '压缩记忆'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={Boolean(busy)}
              onClick={() => void tidy()}
            >
              {busy === 'tidy' ? '整理中…' : '整理碎片'}
            </button>
          </div>

          <div className="brain-rpg-grid">
            <div className="panel content-panel-table">
              <div className="content-toolbar">
                <div className="content-toolbar-head">
                  <strong>技能（标签）</strong>
                  <span>锁定后最多 8 个，将注入生成偏好</span>
                </div>
              </div>
              {skills.length === 0 ? (
                <div className="brain-rpg-empty">暂无标签技能，试跑发帖后会积累</div>
              ) : (
                skills.slice(0, 16).map((sk) => (
                  <div key={sk.tag} className="brain-rpg-skill-row">
                    <div className="brain-rpg-skill-meta">
                      <strong>{sk.label}</strong>
                      <span>
                        {sk.tag} · Lv.{sk.level} · 使用 {sk.usage_count} 次
                      </span>
                    </div>
                    <button
                      type="button"
                      className={`btn btn-sm ${sk.locked ? 'btn-primary' : 'btn-ghost'}`}
                      disabled={busy === `skill-${sk.tag}`}
                      onClick={() => void toggleSkill(sk.tag, !sk.locked)}
                    >
                      {sk.locked ? '已锁定' : '锁定'}
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="panel content-panel-table">
              <div className="content-toolbar">
                <div className="content-toolbar-head">
                  <strong>入梦记录</strong>
                  <span>consolidation 会话摘要</span>
                </div>
              </div>
              {dreams.length === 0 ? (
                <div className="brain-rpg-empty">尚未入梦，点击「入梦整理」开始</div>
              ) : (
                dreams.map((d) => (
                  <div key={d.id || d.ran_at} className="brain-rpg-dream-item">
                    <strong>{d.summary}</strong>
                    <div className="brain-rpg-dream-meta">
                      <span>{d.ran_at}</span>
                      <span>润色 {d.refined}</span>
                      <span>合并 {d.merged}</span>
                      <span>裂纹 {d.archived}</span>
                      <AdminTag label={`+${d.xp_gained} XP`} tone="ok" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="panel content-panel-table" style={{ marginTop: 16 }}>
            <div className="content-toolbar">
              <div className="content-toolbar-head">
                <strong>碎片背包</strong>
                <span>episode 与 memory 条目 · 记忆类可遗忘</span>
              </div>
            </div>
            {fragments.length === 0 ? (
              <div className="brain-rpg-empty">背包为空</div>
            ) : (
              <div className="table-scroll">
                <table className="brain-rpg-fragment-table">
                  <thead>
                    <tr>
                      <th>标题</th>
                      <th>类型</th>
                      <th>状态</th>
                      <th>质量</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fragments.slice(0, 40).map((f, idx) => (
                      <tr key={`${f.kind}-${f.id}-${f.memory_key}-${idx}`}>
                        <td>{f.title}</td>
                        <td>{f.kind === 'memory' ? '记忆' : '自传'}</td>
                        <td>
                          <AdminTag
                            label={FRAGMENT_STATUS_LABEL[f.status] ?? f.status}
                            tone={FRAGMENT_STATUS_TONE[f.status] ?? 'neutral'}
                          />
                        </td>
                        <td>{f.kind === 'episode' ? f.quality_score : '—'}</td>
                        <td>
                          {f.kind === 'memory' && f.memory_key ? (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              disabled={Boolean(busy)}
                              onClick={() => void forgetMemory(f.memory_key)}
                            >
                              遗忘
                            </button>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </section>
  )
}
