import type { MoeBrainPipelineData, MoeGenAttemptItem, MoePipelineStepItem, MoePipelineToolInvokeItem } from '../api/adminClient'
import { asArray } from './apiRecord'

/** proto 省略空 repeated 时兜底 steps / generate_attempts / tools_invoked。 */
export function normalizePipelineData(raw: unknown): MoeBrainPipelineData {
  const row =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  const base = raw as MoeBrainPipelineData
  return {
    ...base,
    steps: asArray<MoePipelineStepItem>(base.steps ?? row.steps),
    generate_attempts: asArray<MoeGenAttemptItem>(
      base.generate_attempts ?? row.generate_attempts ?? row.generateAttempts,
    ),
    tools_invoked: asArray<MoePipelineToolInvokeItem>(
      base.tools_invoked ?? row.tools_invoked ?? row.toolsInvoked,
    ),
  }
}
