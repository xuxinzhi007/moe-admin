import { useCallback, useEffect, useState } from 'react'
import { useDeploy } from '../context/DeployContext'

export type BuildCacheStatus = {
  root: string
  go_cache_dir: string
  tmp_dir: string
  cache_bytes: number
  binary_bytes: number
  total_reclaimable_bytes: number
  linux_binaries?: Array<{
    path: string
    exists: boolean
    size_bytes: number
  }>
}

function formatBytes(n: number): string {
  if (n <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let v = n
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i += 1
  }
  return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${units[i]}`
}

type Props = {
  compact?: boolean
}

export function BuildCacheActions({ compact }: Props) {
  const { client, authOk, showToast } = useDeploy()
  const [cache, setCache] = useState<BuildCacheStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [cleaning, setCleaning] = useState(false)

  const refresh = useCallback(async () => {
    if (authOk !== true) return
    setLoading(true)
    try {
      const res = await client.getBuildCache()
      setCache(res.cache)
    } catch (e) {
      showToast(e instanceof Error ? e.message : '读取编译缓存失败')
    } finally {
      setLoading(false)
    }
  }, [authOk, client, showToast])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function clean(removeBinaries: boolean) {
    const label = removeBinaries
      ? '将删除编译缓存与 Linux 二进制（moe-social），确定？'
      : '将删除编译缓存目录（不影响已上传的云端版本），确定？'
    if (!window.confirm(label)) return
    setCleaning(true)
    try {
      const res = await client.cleanBuildCache(removeBinaries)
      setCache(res.cache)
      showToast(
        `已释放 ${formatBytes(res.freed_bytes ?? 0)}${removeBinaries ? '（含二进制）' : ''}`,
      )
    } catch (e) {
      showToast(e instanceof Error ? e.message : '清理失败')
    } finally {
      setCleaning(false)
    }
  }

  const reclaim = cache?.total_reclaimable_bytes ?? 0
  const hasBin =
    cache?.linux_binaries?.some((b) => b.exists) ?? (cache?.binary_bytes ?? 0) > 0

  if (compact) {
    return (
      <div className="btn-row" style={{ flexWrap: 'wrap', gap: 8 }}>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={authOk !== true || cleaning}
          onClick={() => void clean(false)}
          title={cache?.root}
        >
          {cleaning ? '清理中…' : `清缓存${reclaim > 0 ? ` (${formatBytes(reclaim)})` : ''}`}
        </button>
        {hasBin ? (
          <button
            type="button"
            className="btn btn-ghost"
            disabled={authOk !== true || cleaning}
            onClick={() => void clean(true)}
          >
            清缓存+二进制
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="panel" style={{ marginTop: 0 }}>
      <div className="panel-head">
        <h3>编译缓存</h3>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={loading || authOk !== true}
          onClick={() => void refresh()}
        >
          刷新
        </button>
      </div>
      <div className="panel-body">
        <p className="sub" style={{ marginTop: 0 }}>
          运维台任务使用独立目录，不占用系统{' '}
          <code>%TEMP%</code>。默认{' '}
          <code>backend/deploy/.moe-build-cache</code>
        </p>
        {cache ? (
          <p style={{ fontSize: 13 }}>
            <strong>{formatBytes(reclaim)}</strong> 可清理
            {cache.root ? (
              <>
                {' '}
                · <code style={{ fontSize: 12 }}>{cache.root}</code>
              </>
            ) : null}
          </p>
        ) : (
          <p className="loading-hint">{loading ? '加载中…' : '—'}</p>
        )}
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={authOk !== true || cleaning || reclaim === 0}
            onClick={() => void clean(false)}
          >
            仅清缓存
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={authOk !== true || cleaning || !hasBin}
            onClick={() => void clean(true)}
            title="同时删除 bin/moe-social"
          >
            清缓存 + Linux 二进制
          </button>
        </div>
      </div>
    </div>
  )
}
