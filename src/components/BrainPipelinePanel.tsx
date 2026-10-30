import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminTag } from './AdminTag'
import type { MoeBrainPipelineData, MoeGenAttemptItem, MoePipelineStepItem } from '../api/adminClient'
import { useAdminAuth } from '../context/AdminAuthContext'
import { DeployApiError } from '../api/deployClient'
import type { TagTone } from '../lib/adminLabels'
import {
  genAttemptsForDisplay,
  groupPipelinePhases,
  normStepStatus,
  phaseLabel,
  pickDefaultPhase,
  PIPELINE_PHASE_ORDER,
  type PhaseId,
  type PhaseStatus,
  type PipelinePhase,
} from '../lib/brainPipelinePhases'
import { openMoeBrainPipelineWs } from '../lib/moePipelineWs'
import { normalizePipelineData } from '../lib/pipelineData'

type Props = {
  agentKey: string
  refreshKey?: number
  /** 本页试跑进行中（仅本地状态，不用跨页 session） */
  running?: boolean
  stabilityScore?: number
}

function phaseTone(status: PhaseStatus): TagTone {
  if (status === 'ok') return 'ok'
  if (status === 'fail' || status === 'error') return 'fail'
  if (status === 'running') return 'warn'
  return 'neutral'
}

function phaseStatusLabel(status: PhaseStatus): string {
  if (status === 'ok') return '完成'
  if (status === 'fail' || status === 'error') return '失败'
  if (status === 'running') return '进行中'
  return '待执行'
}

function genOutcomeLabel(outcome: string): string {
  switch (outcome) {
    case 'ok':
      return '通过'
    case 'duplicate':
      return '与近期帖重复'
    case 'theme':
      return '主题/开头过像'
    case 'forbidden':
      return '命中禁止标签'
    case 'novel':
      return '偏剧本/诗意腔'
    case 'llm_error':
      return 'LLM 调用失败'
    default:
      return outcome || '—'
  }
}

function formatMs(ms?: number): string {
  if (ms === undefined || ms <= 0) return '—'
  // 防止旧日志把纳秒/Unix 时间戳误当成毫秒，污染流水线状态展示。
  if (!Number.isFinite(ms) || ms > 7 * 24 * 60 * 60 * 1000) return '未采集'
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

function CompactSubstep({ step, showKey = false }: { step: MoePipelineStepItem; showKey?: boolean }) {
  const st = normStepStatus(step.status)
  return (
    <li className={`brain-pulse-substep brain-pulse-substep--${st}`}>
      <span className="brain-pulse-substep-dot" aria-hidden />
      <div className="brain-pulse-substep-main">
        <span className="brain-pulse-substep-label">{step.label || step.key}</span>
        {showKey ? <code className="brain-pulse-substep-key">{step.key}</code> : null}
      </div>
      <span className="brain-pulse-substep-meta">
        <AdminTag label={phaseStatusLabel(st)} tone={phaseTone(st)} />
        <span className="brain-pulse-substep-ms">{formatMs(step.duration_ms)}</span>
      </span>
      {step.detail ? <p className="muted brain-pulse-substep-detail">{step.detail}</p> : null}
    </li>
  )
}

function GenAttemptRows({ items }: { items: MoeGenAttemptItem[] }) {
  return (
    <ol className="brain-pulse-gen-list">
      {items.map((item) => (
        <li
          key={`${item.attempt}-${item.outcome}-${item.snippet ?? ''}`}
          className={`brain-pulse-gen-row brain-pulse-gen-row--${item.outcome === 'ok' ? 'ok' : 'fail'}`}
        >
          <span className="brain-pulse-gen-idx">#{item.attempt}</span>
          <span className="brain-pulse-gen-outcome">{genOutcomeLabel(item.outcome)}</span>
          {item.snippet ? <span className="muted brain-pulse-gen-snippet">「{item.snippet}」</span> : null}
          {item.note ? <span className="muted brain-pulse-gen-note">{item.note}</span> : null}
        </li>
      ))}
    </ol>
  )
}

function PhaseDetail({
  phase,
  allSteps,
  genAttempts,
  showTechnical,
}: {
  phase: PipelinePhase
  allSteps: MoePipelineStepItem[]
  genAttempts: MoeGenAttemptItem[]
  showTechnical: boolean
}) {
  if (phase.id === 'generate') {
    const rows = genAttemptsForDisplay(genAttempts, allSteps)
    return (
      <div className="brain-pulse-detail">
        {rows.length > 0 ? <GenAttemptRows items={rows} /> : (
          <p className="muted">暂无生成明细，等待模型返回结果。</p>
        )}
      </div>
    )
  }

  if (phase.steps.length === 0) {
    return <p className="muted brain-pulse-detail-empty">本阶段暂无明细</p>
  }

  return (
    <ul className="brain-pulse-substeps">
      {phase.steps.map((s) => (
        <CompactSubstep key={s.key} step={s} showKey={showTechnical} />
      ))}
    </ul>
  )
}

/** Bot 试跑流水线：阶段脉冲时间线 + 折叠重试明细 */
export function BrainPipelinePanel({ agentKey, refreshKey = 0, running = false, stabilityScore }: Props) {
  const { client } = useAdminAuth()
  const cacheKey = `moe-brain-pipeline:${agentKey}`
  const [data, setData] = useState<MoeBrainPipelineData | null>(() => {
    try {
      const raw = sessionStorage.getItem(cacheKey)
      return raw ? normalizePipelineData(JSON.parse(raw) as MoeBrainPipelineData) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<PhaseId>('load')
  const [showTechnical, setShowTechnical] = useState(false)
  const [liveTick, setLiveTick] = useState(0)

  const load = useCallback(async () => {
    if (!agentKey.trim()) {
      setData(null)
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await client.getMoeBrainPipeline(agentKey)
      if (res.success && res.data) {
        const next = normalizePipelineData(res.data)
        setData(next)
        if (next.run_at || next.running) sessionStorage.setItem(cacheKey, JSON.stringify(next))
      } else {
        setData(null)
        setError(res.message || '加载流水线失败')
      }
    } catch (e) {
      setData(null)
      setError(e instanceof DeployApiError ? e.message : '加载流水线失败')
    } finally {
      setLoading(false)
    }
  }, [agentKey, cacheKey, client])

  useEffect(() => {
    if (data?.run_at || data?.running) {
      try { sessionStorage.setItem(cacheKey, JSON.stringify(data)) } catch { /* storage unavailable */ }
    }
  }, [cacheKey, data])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  const serverRunning = Boolean(data?.running)
  const showRunning = running || serverRunning

  // A new run owns the panel from its first frame; never keep the previous
  // completed run visible while the WebSocket is reconnecting.
  useEffect(() => {
    if (running) {
      setData(null)
      setError('')
      setSelectedId('load')
    }
  }, [running])

  useEffect(() => {
    if (!showRunning) return
    const t = window.setInterval(() => setLiveTick((n) => n + 1), 500)
    return () => window.clearInterval(t)
  }, [showRunning])

  useEffect(() => {
    if (!showRunning || !agentKey.trim()) return
    const url = client.brainPipelineWsUrl(agentKey)
    const handle = openMoeBrainPipelineWs(url, (next) => {
      setData(next)
      setError('')
    })
    return () => handle.close()
  }, [showRunning, agentKey, client])

  const steps = useMemo(() => data?.steps ?? [], [data?.steps])
  const hasRun = Boolean(data?.run_at?.trim()) && !serverRunning
  const phases = useMemo(
    () => groupPipelinePhases(steps, data?.generate_attempts),
    [steps, data?.generate_attempts],
  )

  useEffect(() => {
    if (serverRunning && data?.current_phase) {
      const phase = data.current_phase as PhaseId
      if (PIPELINE_PHASE_ORDER.includes(phase)) {
        setSelectedId(phase)
      }
      return
    }
    if (!data?.run_at) return
    const next = pickDefaultPhase(phases, hasRun, data.ok)
    setSelectedId((prev) => (prev === next ? prev : next))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.run_at, data?.ok, data?.current_phase, serverRunning])

  const empty = !showRunning && !hasRun
  const selected = phases.find((p) => p.id === selectedId) ?? phases[0]
  const hm = data?.host_metrics
  const genAttempts = data?.generate_attempts ?? []
  const effectiveStability = data?.stability_score && data.stability_score > 0 ? data.stability_score : stabilityScore
  const policyText = effectiveStability
    ? effectiveStability < 50
      ? '低稳定度：仅使用质量 80+ 的自传，最多试 3 次，严格质检后才会发布。'
      : effectiveStability < 65
        ? '观察期：仅使用质量 70+ 的自传，最多试 4 次，严格质检后才会发布。'
        : '稳定：使用质量 60+ 的自传，最多试 5 次；仅在非重复时允许放宽质检。'
    : ''
  const generateMs = steps
    .filter((s) => s.key.startsWith('gen_attempt') || s.key === 'generate')
    .reduce((sum, s) => sum + (s.duration_ms ?? 0), 0)
  const liveDraft = showRunning
    ? steps
        .filter((s) => s.key.startsWith('gen_attempt') && s.detail)
        .map((s) => s.detail || '')
        .join('\n')
        .trim()
    : ''

  const liveTotalMs = (() => {
    void liveTick
    if (showRunning) {
      if (data?.total_duration_ms && data.total_duration_ms > 0) return data.total_duration_ms
      if (data?.run_started_at) {
        const start = Date.parse(data.run_started_at.replace(' ', 'T'))
        if (!Number.isNaN(start)) return Date.now() - start
      }
    }
    return data?.total_duration_ms ?? 0
  })()

  const runPhaseLabel =
    serverRunning && data?.current_phase
      ? phaseLabel(data.current_phase as PhaseId)
      : ''

  const pulseClass = showRunning
    ? 'brain-pulse--running'
    : !hasRun && !data?.run_at
      ? 'brain-pulse--idle'
      : data?.ok
        ? 'brain-pulse--ok'
        : 'brain-pulse--fail'

  return (
    <section className={`panel brain-pipeline-panel brain-pulse-panel ${pulseClass}`}>
      <header className="platform-section-head brain-pipeline-head">
        <div>
          <h3>发帖流水线</h3>
          <p className="muted">实时展示阶段、耗时、重试和结果；生成阶段会随推理进度更新。</p>
        </div>
        {data && hasRun ? (
          <label className="brain-pulse-tech-toggle">
            <input
              type="checkbox"
              checked={showTechnical}
              onChange={(e) => setShowTechnical(e.target.checked)}
            />
            显示技术 key
          </label>
        ) : null}
      </header>

      {error ? <p className="text-danger">{error}</p> : null}
      {loading && !data ? <p className="muted">加载流水线…</p> : null}

      {(data && !loading) || showRunning ? (
        <>
          <div className="brain-pulse-summary">
            <div className={`brain-pipeline-status-marker brain-pipeline-status-marker--${pulseClass.replace('brain-pulse--', '')}`} aria-hidden>
              <span />
            </div>
            <div className="brain-pulse-summary-main">
              {showRunning ? (
                <div className="brain-pulse-run-banner">
                  <span className="brain-pulse-run-dot" aria-hidden />
                  <span>
                    正在执行
                    {runPhaseLabel ? ` · ${runPhaseLabel}` : ''}
                    …
                  </span>
                </div>
              ) : null}
              <div className="brain-pulse-summary-row">
                <AdminTag
                  label={
                    showRunning
                      ? '进行中'
                      : hasRun || data?.run_at
                        ? data?.ok
                          ? '试跑成功'
                          : '试跑失败'
                        : '无记录'
                  }
                  tone={showRunning ? 'warn' : !hasRun && !data?.run_at ? 'neutral' : data?.ok ? 'ok' : 'fail'}
                />
                {data ? (
                  <>
                    <span className="brain-pulse-stat">
                      总耗时{' '}
                      <span className={showRunning ? 'brain-pulse-live-ms' : undefined}>
                        {formatMs(showRunning ? liveTotalMs : data.total_duration_ms)}
                      </span>
                    </span>
                    <span className="brain-pulse-stat">生成 {formatMs(generateMs || undefined)}</span>
                    {data.run_at ? <span className="muted brain-pulse-run-at">{data.run_at}</span> : null}
                  </>
                ) : null}
              </div>
                {!showRunning && data?.run_feedback ? (
                  <p className="brain-pipeline-feedback">{data.run_feedback}</p>
                ) : null}
                {!showRunning && data?.detail ? (
                  <p className="brain-pipeline-detail">{data.detail}</p>
                ) : null}
                {policyText ? <p className="brain-pipeline-policy">{policyText}</p> : null}
              {!showRunning && data?.post_id ? (
                <p className="muted brain-pulse-post-id">
                  帖子 <code>{data.post_id}</code>
                </p>
              ) : null}
            </div>
          </div>

          {showRunning ? (
            <div className="brain-live-output" aria-live="polite">
              <div className="brain-live-output-head">
                <span className="brain-live-output-dot" aria-hidden />
                <strong>{runPhaseLabel === '生成' ? '模型正在写' : '正在准备生成'}</strong>
                <span className="muted">实时内容会逐字出现</span>
              </div>
              <div className="brain-live-output-body">
                {liveDraft || '模型正在读取记忆和近期动态，马上开始生成…'}
                {liveDraft ? <span className="brain-live-caret" aria-hidden /> : null}
              </div>
            </div>
          ) : null}

          {empty && !showRunning ? (
            <div className="brain-pipeline-empty">
              <p>当前 Bot 尚无试跑记录。</p>
              {policyText ? <p className="brain-pipeline-policy">{policyText}</p> : null}
              <p className="muted">点击“试跑发帖”后，这里才会出现真实阶段与结果。</p>
            </div>
          ) : (
            <>
              <div className="brain-pulse-rail" role="tablist" aria-label="流水线阶段">
                {phases.map((phase, i) => {
                  const active = phase.id === selectedId
                  const st = phase.status
                  return (
                    <div key={phase.id} className="brain-pulse-rail-item-wrap">
                      {i > 0 ? (
                        <span
                          className={`brain-pulse-rail-link brain-pulse-rail-link--${st}`}
                          aria-hidden
                        />
                      ) : null}
                      <button
                        type="button"
                        role="tab"
                        aria-selected={active}
                        className={`brain-pulse-node brain-pulse-node--${st} ${active ? 'brain-pulse-node--active' : ''}`}
                        onClick={() => setSelectedId(phase.id)}
                      >
                        <span className="brain-pulse-node-label">{phase.label}</span>
                        <span className={`brain-pulse-node-dot brain-pulse-node-dot--${st}`} />
                        <span className="brain-pulse-node-summary">{phase.summary}</span>
                        {phase.durationMs > 0 || (showRunning && st === 'running') ? (
                          <span className="brain-pulse-node-ms brain-pulse-live-ms">
                            {formatMs(
                              showRunning && st === 'running' && phase.durationMs <= 0
                                ? liveTotalMs
                                : phase.durationMs,
                            )}
                          </span>
                        ) : null}
                      </button>
                    </div>
                  )
                })}
              </div>

              {selected ? (
                <div className="brain-pulse-detail-panel" role="tabpanel">
                  <header className="brain-pulse-detail-head">
                    <strong>{selected.label}</strong>
                    <AdminTag label={phaseStatusLabel(selected.status)} tone={phaseTone(selected.status)} />
                    <span className="brain-pulse-detail-ms">
                      {formatMs(
                        showRunning && selected.status === 'running' && selected.durationMs <= 0
                          ? liveTotalMs
                          : selected.durationMs,
                      )}
                    </span>
                  </header>
                  <PhaseDetail
                    phase={selected}
                    allSteps={steps}
                    genAttempts={genAttempts}
                    showTechnical={showTechnical}
                  />
                </div>
              ) : null}
            </>
          )}

          {hm ? (
            <details className="brain-pipeline-host">
              <summary>运行环境快照（RPC · 推理）</summary>
              <div className="admin-metrics page-insight-strip">
                <div className="metric">
                  <div className="label">RPC 内存</div>
                  <div className="value">
                    {hm.proc_alloc_mb ?? 0} MB
                    <span className="summary-note">堆 · 系统 {hm.proc_sys_mb ?? 0} MB</span>
                  </div>
                </div>
                <div className="metric">
                  <div className="label">CPU / 协程</div>
                  <div className="value" style={{ fontSize: 14 }}>
                    {hm.num_cpu ?? '—'} 核 · {hm.num_goroutine ?? '—'} goroutine
                  </div>
                </div>
                <div className="metric">
                  <div className="label">推理服务</div>
                  <div className="value">
                    <AdminTag
                      label={hm.inference_online ? '在线' : '离线'}
                      tone={hm.inference_online ? 'ok' : 'fail'}
                      dot
                    />
                    <span className="summary-note">{hm.inference_models ?? 0} 个模型</span>
                  </div>
                </div>
              </div>
              {hm.inference_base_url ? (
                <code className="data-env-url">{hm.inference_base_url}</code>
              ) : null}
              {hm.gpu_note ? <p className="muted brain-pipeline-gpu-note">{hm.gpu_note}</p> : null}
            </details>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
