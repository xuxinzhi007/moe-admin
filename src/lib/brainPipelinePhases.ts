import type { MoeGenAttemptItem, MoePipelineStepItem } from '../api/adminClient'

export type PhaseId = 'load' | 'memory' | 'prep' | 'generate' | 'finalize' | 'publish'

export type PhaseStatus = 'ok' | 'fail' | 'error' | 'running' | 'skip'

export type PipelinePhase = {
  id: PhaseId
  label: string
  status: PhaseStatus
  durationMs: number
  summary: string
  steps: MoePipelineStepItem[]
}

export const PIPELINE_PHASE_ORDER: PhaseId[] = ['load', 'memory', 'prep', 'generate', 'finalize', 'publish']

const PHASE_ORDER = PIPELINE_PHASE_ORDER

export const PIPELINE_PHASE_LABELS: Record<PhaseId, string> = {
  load: '加载',
  memory: '记忆',
  prep: '编排',
  generate: '生成',
  finalize: '质检',
  publish: '发布',
}

const PHASE_LABELS = PIPELINE_PHASE_LABELS

export function phaseLabel(id: PhaseId): string {
  return PHASE_LABELS[id]
}

export function normStepStatus(raw: string): PhaseStatus {
  const s = raw.trim().toLowerCase()
  if (s === 'ok') return 'ok'
  if (s === 'fail' || s === 'error') return 'fail'
  if (s === 'running') return 'running'
  return 'skip'
}

function rollupStatus(statuses: PhaseStatus[]): PhaseStatus {
  if (statuses.some((s) => s === 'fail' || s === 'error')) return 'fail'
  if (statuses.some((s) => s === 'running')) return 'running'
  if (statuses.every((s) => s === 'skip')) return 'skip'
  if (statuses.some((s) => s === 'ok')) return 'ok'
  return 'skip'
}

function stepPhaseId(step: MoePipelineStepItem): PhaseId {
  const k = step.key.trim().toLowerCase()
  if (k === 'load_runtime') return 'load'
  if (k === 'gather_memory' || k === 'topic_profile' || k.startsWith('topic_')) return 'memory'
  if (k === 'resolve_model' || k === 'assemble_prompt') return 'prep'
  if (k.startsWith('gen_attempt') || k === 'generate') return 'generate'
  if (k === 'generate_finalize') return 'finalize'
  if (k === 'post_create' || k === 'record_episode') return 'publish'
  return 'prep'
}

function isGenAttemptKey(key: string): boolean {
  return /^gen_attempt_\d+$/i.test(key.trim())
}

function summarizePhase(id: PhaseId, steps: MoePipelineStepItem[], genAttempts?: MoeGenAttemptItem[]): string {
  const active = steps.filter((s) => normStepStatus(s.status) !== 'skip')
  if (active.length === 0) return '待执行'

  if (id === 'generate') {
    return buildGenerateSummary(steps, genAttempts)
  }

  const last = active[active.length - 1]
  const detail = last.detail?.trim()
  if (detail && detail.length <= 48) return detail
  if (detail) return `${detail.slice(0, 45)}…`
  return last.label || '完成'
}

function buildGenerateSummary(steps: MoePipelineStepItem[], genAttempts?: MoeGenAttemptItem[]): string {
  if (genAttempts && genAttempts.length > 0) {
    const n = genAttempts.length
    const okIdx = genAttempts.findIndex((a) => a.outcome === 'ok')
    if (okIdx >= 0) return `${n} 次 · 第 ${okIdx + 1} 次通过`
    const last = genAttempts[n - 1]
    const label =
      last.outcome === 'duplicate'
        ? '与近期重复'
        : last.outcome === 'theme'
          ? '主题过像'
          : last.outcome === 'llm_error'
            ? 'LLM 失败'
            : '未通过'
    return `${n} 次 · ${label}`
  }
  const genSteps = steps.filter((s) => isGenAttemptKey(s.key))
  if (genSteps.length === 0) return '—'
  const okN = genSteps.filter((s) => normStepStatus(s.status) === 'ok').length
  if (okN > 0) {
    const idx = genSteps.findIndex((s) => normStepStatus(s.status) === 'ok')
    return `${genSteps.length} 次 · 第 ${idx + 1} 次通过`
  }
  return `${genSteps.length} 次 · 全失败`
}

/** 将原始 steps 聚合为 6 个逻辑阶段（折叠 gen_attempt_*） */
export function groupPipelinePhases(
  steps: MoePipelineStepItem[],
  genAttempts?: MoeGenAttemptItem[],
): PipelinePhase[] {
  const buckets = new Map<PhaseId, MoePipelineStepItem[]>()
  for (const id of PHASE_ORDER) buckets.set(id, [])

  for (const step of steps) {
    const id = stepPhaseId(step)
    buckets.get(id)?.push(step)
  }

  return PHASE_ORDER.map((id) => {
    const phaseSteps = buckets.get(id) ?? []
    const statuses = phaseSteps.map((s) => normStepStatus(s.status))
    const status = rollupStatus(statuses)
    const durationMs = phaseSteps.reduce((sum, s) => sum + (s.duration_ms ?? 0), 0)
    const summary =
      id === 'generate' ? buildGenerateSummary(phaseSteps, genAttempts) : summarizePhase(id, phaseSteps, genAttempts)

    return {
      id,
      label: PHASE_LABELS[id],
      status,
      durationMs,
      summary,
      steps: id === 'generate' ? phaseSteps.filter((s) => !isGenAttemptKey(s.key)) : phaseSteps,
    }
  })
}

export function pickDefaultPhase(phases: PipelinePhase[], hasRun: boolean, ok: boolean): PhaseId {
  if (!hasRun) return 'load'
  if (!ok) {
    const fail = phases.find((p) => p.status === 'fail')
    if (fail) return fail.id
    const gen = phases.find((p) => p.id === 'generate')
    if (gen && gen.status === 'fail') return 'generate'
    return 'generate'
  }
  const pub = phases.find((p) => p.id === 'publish' && p.status === 'ok')
  if (pub) return 'publish'
  return 'finalize'
}

export function genAttemptsForDisplay(
  genAttempts: MoeGenAttemptItem[] | undefined,
  steps: MoePipelineStepItem[],
): MoeGenAttemptItem[] {
  if (genAttempts && genAttempts.length > 0) return genAttempts
  return steps
    .filter((s) => isGenAttemptKey(s.key))
    .map((s, i) => {
      const m = s.key.match(/gen_attempt_(\d+)/i)
      const attempt = m ? Number(m[1]) : i + 1
      const st = normStepStatus(s.status)
      let outcome = 'unknown'
      if (st === 'ok') outcome = 'ok'
      else if (s.detail?.includes('duplicate') || s.detail?.includes('重复')) outcome = 'duplicate'
      else if (s.detail?.includes('theme') || s.detail?.includes('太像')) outcome = 'theme'
      else if (st === 'fail') outcome = 'llm_error'
      return {
        attempt,
        outcome,
        snippet: s.detail?.split('·')[1]?.trim(),
        note: s.detail,
      }
    })
}
