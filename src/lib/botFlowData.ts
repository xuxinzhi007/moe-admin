import type { MoeBotFlowData, MoeFlowEdgeItem, MoeFlowNodeItem } from '../api/adminClient'
import { asArray } from './apiRecord'

/** proto 省略空 repeated 时兜底 nodes / edges / warnings。 */
export function normalizeBotFlowData(raw: unknown): MoeBotFlowData {
  const row =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  const base = raw as MoeBotFlowData
  return {
    ...base,
    nodes: asArray<MoeFlowNodeItem>(base.nodes ?? row.nodes),
    edges: asArray<MoeFlowEdgeItem>(base.edges ?? row.edges),
    warnings: asArray<string>(base.warnings ?? row.warnings),
  }
}
