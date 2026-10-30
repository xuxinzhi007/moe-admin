import { Link } from 'react-router-dom'
import { usePlatform } from '../context/PlatformContext'
import { AdminTag } from './AdminTag'

type Props = {
  note?: string
  /** 已在平台治理页时关掉自指链接，默认 true */
  showPlatformLink?: boolean
}

/** 展示当前业务 API 环境 */
export function DataEnvBar({ note, showPlatformLink = true }: Props) {
  const { apiTarget, apiTargetLabel, health } = usePlatform()
  const api = apiTarget === 'cloud' ? health?.cloud_api : health?.local_api
  const online = api?.online

  return (
    <div className="data-env-bar">
      <AdminTag label={apiTargetLabel} tone={online ? 'run' : 'fail'} dot />
      {api?.base_url ? (
        <code className="data-env-url" title="业务 API 基址">
          {api.base_url}
        </code>
      ) : (
        <span className="muted">API 地址探测中…</span>
      )}
      {note ? <span className="data-env-note">{note}</span> : null}
      {showPlatformLink ? (
        <Link className="data-env-link btn btn-ghost btn-sm" to="/infra/platform?tab=config">
          平台治理
        </Link>
      ) : null}
    </div>
  )
}
