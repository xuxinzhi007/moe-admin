import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminPanel } from '../ui/AdminPanel'
import { ListPageLayout } from '../ui'
import {
  MOE_FURNITURE_MANIFEST_URL,
  MOE_FURNITURE_PACK_BASE,
} from '../features/moe-content/constants'
import { exportItemPackZip } from '../features/moe-content/exportPack'
import type { FurnitureManifest } from '../features/moe-content/types'
import { assetUrl } from '../features/moe-content/exportPack'

/** 家具单品编辑器：预览 + manifest + 导出 */
export function PetFurnitureEditorPage() {
  const [manifest, setManifest] = useState<FurnitureManifest | null>(null)
  const [selectedId, setSelectedId] = useState<string>('')
  const [jsonText, setJsonText] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async () => {
    setError('')
    try {
      const res = await fetch(MOE_FURNITURE_MANIFEST_URL)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as FurnitureManifest
      setManifest(data)
      setJsonText(JSON.stringify(data, null, 2))
      const ids = Object.keys(data.items)
      setSelectedId((prev) => prev || ids[0] || '')
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const item = manifest?.items[selectedId]
  const imgUrl = item ? assetUrl(MOE_FURNITURE_PACK_BASE, item.path) : ''

  const onExport = async () => {
    if (!manifest) return
    setExporting(true)
    try {
      await exportItemPackZip({
        manifest,
        packBaseUrl: MOE_FURNITURE_PACK_BASE,
        itemPaths: Object.values(manifest.items).map((i) => i.path),
        packFilename: `${manifest.packId}.zip`,
      })
      setMessage('已下载家具包 → 解压到 assets/pet/furniture/ 或 moe_content/furniture/')
    } catch (e) {
      setError(e instanceof Error ? e.message : '导出失败')
    } finally {
      setExporting(false)
    }
  }

  return (
    <ListPageLayout
      title="养成 · 家具"
      description="透明 PNG · 场景元数据 · 导出官方家具包"
      headActions={
        <>
          <Link to="/biz/pet/content" className="btn" style={{ marginRight: 8 }}>
            总览
          </Link>
          <button type="button" className="btn primary" disabled={!manifest || exporting} onClick={() => void onExport()}>
            {exporting ? '导出中…' : '导出家具包 zip'}
          </button>
        </>
      }
    >
      {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
      {message ? <p className="muted">{message}</p> : null}

      {manifest ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <AdminPanel title="预览">
            {item ? (
              <>
                <div
                  style={{
                    minHeight: 200,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    background: 'linear-gradient(180deg,#fff8f2,#ffe8dc)',
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <img
                    src={imgUrl}
                    alt={item.label}
                    style={{ maxWidth: '100%', maxHeight: 220, objectFit: 'contain' }}
                  />
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 13 }}>
                  <strong>{item.label}</strong> · <code>{selectedId}</code>
                </p>
                <p className="muted" style={{ fontSize: 12 }}>
                  场景：{item.scenes.join(', ')} · scale {item.defaultScale ?? 1} · anchor{' '}
                  {item.anchor ?? 'bottom_center'}
                </p>
              </>
            ) : null}
          </AdminPanel>

          <AdminPanel title="单品列表">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(manifest.items).map(([id, def]) => (
                <button
                  key={id}
                  type="button"
                  className={`btn${selectedId === id ? ' primary' : ''}`}
                  style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                  onClick={() => setSelectedId(id)}
                >
                  {def.label} ({id})
                </button>
              ))}
            </div>
          </AdminPanel>
        </div>
      ) : (
        <p className="muted">加载 manifest…</p>
      )}

      <AdminPanel title="manifest.json" >
        <textarea
          rows={14}
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          style={{ width: '100%', fontFamily: 'monospace', fontSize: 12 }}
        />
        <button
          type="button"
          className="btn"
          style={{ marginTop: 8 }}
          onClick={() => {
            try {
              setManifest(JSON.parse(jsonText) as FurnitureManifest)
              setError('')
              setMessage('manifest 已应用')
            } catch (e) {
              setError(e instanceof Error ? e.message : 'JSON 无效')
            }
          }}
        >
          应用到预览
        </button>
      </AdminPanel>
    </ListPageLayout>
  )
}
