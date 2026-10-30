import { memo, type CSSProperties } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { AdminTag } from '../AdminTag'
import type { TagTone } from '../../lib/adminLabels'
import type { FlowNodeStatus } from '../../lib/botFlowTemplate'
import { CORE_PORT_COUNT } from '../../lib/botFlowEdges'

export { CORE_PORT_COUNT }

/** Bot 左右各 4 个接入点（共 8，与 MAX_HUB_TOOLS 一致） */
const CORE_PORTS: Array<{
  id: string
  position: Position
  style: CSSProperties
}> = [
  { id: 'port-0', position: Position.Left, style: { left: 0, top: '12%' } },
  { id: 'port-1', position: Position.Left, style: { left: 0, top: '36%' } },
  { id: 'port-2', position: Position.Left, style: { left: 0, top: '64%' } },
  { id: 'port-3', position: Position.Left, style: { left: 0, top: '88%' } },
  { id: 'port-4', position: Position.Right, style: { right: 0, top: '12%' } },
  { id: 'port-5', position: Position.Right, style: { right: 0, top: '36%' } },
  { id: 'port-6', position: Position.Right, style: { right: 0, top: '64%' } },
  { id: 'port-7', position: Position.Right, style: { right: 0, top: '88%' } },
]

export type BotFlowNodeData = {
  /** 中文展示名 */
  label: string
  /** 英文工具 ID（仅 tool 节点） */
  toolKey?: string
  subtitle: string
  status: FlowNodeStatus
  statusLabel: string
  nodeType: 'core' | 'step' | 'tool'
  /** 相对 Bot 所在侧（影响连线把手方向） */
  side?: 'left' | 'right'
}

function statusTone(st: FlowNodeStatus): TagTone {
  switch (st) {
    case 'ok':
      return 'ok'
    case 'fail':
      return 'fail'
    case 'running':
      return 'warn'
    default:
      return 'neutral'
  }
}

function CoreFlowNodeBody({ data }: NodeProps) {
  const d = data as BotFlowNodeData
  const label = d.label?.trim() ? d.label : 'Moe Bot'
  return (
    <div className={`bot-flow-node bot-flow-node--${d.status} bot-flow-node--core`}>
      {CORE_PORTS.map((p) => (
        <Handle
          key={p.id}
          id={p.id}
          type="target"
          position={p.position}
          className="bot-flow-handle bot-flow-handle--core"
          style={p.style}
        />
      ))}
      <div className="bot-flow-node-head bot-flow-node-head--core">
        <strong>{label}</strong>
        <AdminTag label={d.statusLabel} tone={statusTone(d.status)} />
      </div>
      <span className="muted bot-flow-node-sub">{d.subtitle}</span>
      <span className="bot-flow-core-ports-hint muted">左右各 4 个接入点</span>
    </div>
  )
}

function ToolFlowNodeBody({ data }: NodeProps) {
  const d = data as BotFlowNodeData
  const title = d.label?.trim() ? d.label : '工具'
  const side = d.side ?? 'left'
  const handlePos = side === 'left' ? Position.Right : Position.Left
  return (
    <div
      className={`bot-flow-node bot-flow-node--${d.status} bot-flow-node--tool bot-flow-node--tool-${side} ${d.status === 'disabled' ? 'bot-flow-node--disabled' : ''}`}
    >
      <Handle
        id="tool-out"
        type="source"
        position={handlePos}
        className="bot-flow-handle bot-flow-handle--tool"
      />
      <div className="bot-flow-node-head">
        <strong>{title}</strong>
        <AdminTag label={d.statusLabel} tone={statusTone(d.status)} />
      </div>
      <span className="muted bot-flow-node-sub">{d.subtitle}</span>
    </div>
  )
}

export const CoreFlowNode = memo(CoreFlowNodeBody)
export const StepFlowNode = memo(ToolFlowNodeBody)
export const ToolFlowNode = memo(ToolFlowNodeBody)
