import { useMemo } from 'react'
import {
  aggregateUploadProgress,
  formatUploadMb,
  parseUploadProgress,
} from '../lib/uploadProgress'

type Props = {
  log: string | undefined
}

export function UploadProgressBar({ log }: Props) {
  const items = useMemo(() => parseUploadProgress(log), [log])
  const agg = useMemo(() => aggregateUploadProgress(items), [items])

  if (items.length === 0) return null

  const labelParts = items.map((x) => `${x.name} ${x.pct}%`)
  let detail = labelParts.join(' · ')
  if (agg.total > 0) {
    detail += ` (${formatUploadMb(agg.done)}/${formatUploadMb(agg.total)} MB)`
  }

  return (
    <div className="upload-progress" role="region" aria-label="上传进度">
      <div className="upload-progress-label">{detail}</div>
      {items.length > 1 ? (
        <div className="upload-progress-multi">
          {items.map((x) => (
            <div key={x.name} className="upload-progress-row">
              <span className="upload-progress-name">{x.name}</span>
              <div className="upload-progress-track">
                <div
                  className="upload-progress-bar"
                  style={{ width: `${Math.min(100, x.pct)}%` }}
                />
              </div>
              <span className="upload-progress-pct">{x.pct}%</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="upload-progress-track">
          <div
            className="upload-progress-bar"
            style={{ width: `${agg.pct}%` }}
          />
        </div>
      )}
    </div>
  )
}
