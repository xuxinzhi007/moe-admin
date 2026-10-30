import { useCallback, useEffect, useState } from 'react'
import { AdminTag } from './AdminTag'
import { useAdminAuth } from '../context/AdminAuthContext'
import { DeployApiError } from '../api/deployClient'

export type InferenceStatus = {
  online: boolean
  base_url: string
  models: string[]
  default_post_model: string
  preferred_model?: string
  runtime_model?: string
  effective_model?: string
  auto_discovered?: boolean
  model_loaded: boolean
  context_limit?: number
  context_source?: string
  message?: string
}

type Props = {
  agentKey: string
  /** 变更时重新检测 */
  refreshKey?: number
}

export function InferenceStatusBar({ agentKey, refreshKey = 0 }: Props) {
  const { client } = useAdminAuth()
  const [status, setStatus] = useState<InferenceStatus | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await client.getMoeInferenceStatus(agentKey || undefined)
      if (res.success && res.data) {
        setStatus(res.data)
      } else {
        setStatus(null)
      }
    } catch (e) {
      setStatus({
        online: false,
        base_url: '',
        models: [],
        default_post_model: '',
        model_loaded: false,
        message: e instanceof DeployApiError ? e.message : '检测失败',
      })
    } finally {
      setLoading(false)
    }
  }, [agentKey, client])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  if (!status && !loading) return null

  const effective = status?.effective_model || status?.default_post_model || '—'
  const preferred = status?.preferred_model?.trim() || status?.default_post_model?.trim()
  const runtime = status?.runtime_model?.trim()
  const modelCount = status?.models?.length ?? 0

  return (
    <div className="inference-status-bar">
      <div className="inference-status-leading">
        <AdminTag
          label={loading ? '检测推理…' : status?.online ? '推理在线' : '推理离线'}
          tone={loading ? 'neutral' : status?.online ? 'ok' : 'fail'}
          dot
        />
        {status?.base_url ? (
          <code className="data-env-url" title="llm_inference 基址">
            {status.base_url}
          </code>
        ) : null}
      </div>
      <span className="muted inference-status-detail">
        发帖模型 <strong>{effective}</strong>
        {status?.auto_discovered && preferred && preferred !== effective ? (
          <>
            {' '}
            <span className="muted">（自动匹配，偏好 {preferred}）</span>
          </>
        ) : null}
        {runtime && runtime !== effective && runtime !== preferred ? (
          <>
            {' '}
            · Bot 配置 <code>{runtime}</code>
          </>
        ) : null}
        {status?.online && modelCount > 0 ? (
          <>
            {' '}
            · 服务模型 <span className="muted">{modelCount} 个</span>
          </>
        ) : null}
        {status?.online ? (
          <>
            {' '}
            · 已挂载{' '}
            <AdminTag
              spec={
                status.model_loaded
                  ? { label: '是', tone: 'ok' }
                  : { label: '否', tone: 'fail' }
              }
            />
          </>
        ) : null}
        {status?.context_limit && status.context_limit > 0 ? (
          <>
            {' '}
            · 上下文 <strong>{status.context_limit.toLocaleString()}</strong> tokens
            {status.context_source ? (
              <>
                {' '}
                <span className="muted">({status.context_source})</span>
              </>
            ) : null}
          </>
        ) : null}
      </span>
      <button
        type="button"
        className="btn btn-ghost btn-sm inference-status-refresh"
        disabled={loading}
        onClick={() => void load()}
      >
        重新检测
      </button>
      {status?.message ? (
        <span className="text-danger inference-status-msg">{status.message}</span>
      ) : null}
    </div>
  )
}
