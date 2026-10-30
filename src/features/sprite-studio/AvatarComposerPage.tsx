import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import JSZip from 'jszip'
import {
  composeTemplateSheet,
  downloadBlob,
  drawSheetFrame,
  exportMoePackZip,
  itemLabel,
  layerThumbCanvas,
  resolveTemplateLayerPaths,
  AvatarAssetStore,
  type MoeAvatarManifest,
  type PreviewAnimation,
  type TemplateSelection,
} from '../../../../moe-avatar/core/src'

import './avatar-composer.css'

const PACK_BASE_URL = `${import.meta.env.BASE_URL}pet/moe_content/avatar`.replace(/\/$/, '')
const DIRECTION_LABELS = ['上', '左', '下', '右']
const SLOT_LABELS: Record<string, string> = {
  hat: '帽饰',
  top: '上衣',
  bottom: '下装',
  shoes: '鞋子',
  hand: '手持',
  offhand: '副手',
  back: '背部',
  mask: '面罩',
  glasses: '眼镜',
}

function createSelection(manifest: MoeAvatarManifest): TemplateSelection {
  return Object.fromEntries(
    Object.entries(manifest.slots).map(([slot, items]) => [slot, Object.keys(items)[0] ?? '']),
  )
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('png-export-failed'))), 'image/png')
  })
}

function SlotCard({
  manifest,
  slot,
  itemId,
  selected,
  onSelect,
  assetStore,
  assetRevision,
}: {
  manifest: MoeAvatarManifest
  slot: string
  itemId: string
  selected: boolean
  onSelect: () => void
  assetStore: AvatarAssetStore
  assetRevision: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const item = manifest.slots[slot]?.[itemId]

  useEffect(() => {
    if (!item) return
    let active = true
    void layerThumbCanvas(manifest, item.idle, PACK_BASE_URL, 64, assetStore).then((thumb) => {
      if (!active || !thumb || !canvasRef.current) return
      canvasRef.current.width = thumb.width
      canvasRef.current.height = thumb.height
      canvasRef.current.getContext('2d')?.drawImage(thumb, 0, 0)
    })
    return () => { active = false }
  }, [assetRevision, assetStore, item, manifest, slot])

  return (
    <button type="button" className={`avatar-composer-item-card${selected ? ' active' : ''}`} onClick={onSelect}>
      <span className="avatar-composer-item-thumb"><canvas ref={canvasRef} aria-hidden="true" /></span>
      <strong>{itemLabel(itemId, manifest, slot)}</strong>
      <small>{selected ? '已选择' : '选择'}</small>
    </button>
  )
}

function DirectionCell({
  sheet,
  manifest,
  animation,
  direction,
  frame,
  large = false,
}: {
  sheet: HTMLCanvasElement | null
  manifest: MoeAvatarManifest
  animation: PreviewAnimation
  direction: number
  frame: number
  large?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cellSize = large ? 320 : 96

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context || !sheet) return
    canvas.width = cellSize
    canvas.height = cellSize
    context.clearRect(0, 0, cellSize, cellSize)
    drawSheetFrame(context, sheet, manifest, animation, direction, frame, 0, 0, cellSize)
  }, [animation, cellSize, direction, frame, manifest, sheet])

  return <canvas ref={canvasRef} className={large ? 'avatar-composer-main-canvas' : 'avatar-composer-direction-canvas'} aria-label={`${DIRECTION_LABELS[direction]}方向预览`} />
}

export function AvatarComposerPage() {
  const [assetStore] = useState(() => new AvatarAssetStore())
  const packInputRef = useRef<HTMLInputElement>(null)
  const manifestInputRef = useRef<HTMLInputElement>(null)
  const [manifest, setManifest] = useState<MoeAvatarManifest | null>(null)
  const [manifestDraft, setManifestDraft] = useState('')
  const [selection, setSelection] = useState<TemplateSelection>({})
  const [animation, setAnimation] = useState<PreviewAnimation>('idle')
  const [direction, setDirection] = useState(2)
  const [frame, setFrame] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [sheet, setSheet] = useState<HTMLCanvasElement | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [assetRevision, setAssetRevision] = useState(0)

  useEffect(() => () => assetStore.dispose(), [assetStore])

  useEffect(() => {
    let active = true
    void fetch(`${PACK_BASE_URL}/manifest.json`)
      .then((response) => {
        if (!response.ok) throw new Error('manifest-load-failed')
        return response.json() as Promise<MoeAvatarManifest>
      })
      .then((nextManifest) => {
        if (!active) return
        setManifest(nextManifest)
        setManifestDraft(JSON.stringify(nextManifest, null, 2))
        setSelection(createSelection(nextManifest))
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setError('自有角色素材包读取失败，请检查管理台基路径下的 pet/moe_content/avatar 资源。')
        setLoading(false)
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!manifest) return
    let active = true
    void composeTemplateSheet(manifest, selection, animation, PACK_BASE_URL, assetStore).then((nextSheet) => {
      if (active) setSheet(nextSheet)
    })
    return () => { active = false }
  }, [animation, assetRevision, assetStore, manifest, selection])

  const frameCount = manifest?.animations[animation]?.cols ?? 1
  const slotEntries = useMemo(
    () => manifest ? manifest.composeOrder.filter((slot) => manifest.slots[slot]) : [],
    [manifest],
  )

  useEffect(() => {
    if (!playing || frameCount < 2) return
    const timer = window.setInterval(() => setFrame((current) => (current + 1) % frameCount), animation === 'walk' ? 120 : 420)
    return () => window.clearInterval(timer)
  }, [animation, frameCount, playing])

  function updateSelection(slot: string, value: string) {
    setSelection((current) => ({ ...current, [slot]: value }))
    setFrame(0)
    setMessage(`${SLOT_LABELS[slot] ?? slot}已更新`)
  }

  async function exportCharacterPack() {
    if (!manifest) return
    setExporting(true)
    setError('')
    try {
      const blob = await exportMoePackZip({
        manifest,
        packBaseUrl: PACK_BASE_URL,
        assetStore,
        templateSelection: selection,
        includeBaked: true,
      })
      downloadBlob(blob, `${manifest.packId}-character.zip`)
      setMessage('完整角色素材包已导出：包含 manifest、分层素材、缩略图和 baked 预览。')
    } catch {
      setError('角色包导出失败，请确认当前素材文件完整。')
    } finally {
      setExporting(false)
    }
  }

  async function exportSelectedCharacter() {
    if (!manifest) return
    setExporting(true)
    setError('')
    try {
      const [idleSheet, walkSheet] = await Promise.all([
        composeTemplateSheet(manifest, selection, 'idle', PACK_BASE_URL, assetStore),
        composeTemplateSheet(manifest, selection, 'walk', PACK_BASE_URL, assetStore),
      ])
      if (!idleSheet || !walkSheet) throw new Error('compose-failed')
      const zip = new JSZip()
      zip.file('character/idle.png', await canvasToPngBlob(idleSheet))
      zip.file('character/walk.png', await canvasToPngBlob(walkSheet))
      const paths = [...new Set([
        ...resolveTemplateLayerPaths(manifest, selection, 'idle'),
        ...resolveTemplateLayerPaths(manifest, selection, 'walk'),
      ])]
      for (const relativePath of paths) {
        const localBlob = assetStore.get(relativePath)
        if (localBlob) {
          zip.file(`layers/${relativePath}`, localBlob)
          continue
        }
        const response = await fetch(`${PACK_BASE_URL}/${relativePath}`)
        if (!response.ok) throw new Error('layer-fetch-failed')
        zip.file(`layers/${relativePath}`, await response.blob())
      }
      zip.file('manifest.json', JSON.stringify({
        ...manifest,
        packId: `${manifest.packId}-selected-character`,
        displayName: `${manifest.displayName} · 当前角色`,
        selection,
        outputs: { idle: 'character/idle.png', walk: 'character/walk.png' },
      }, null, 2))
      const blob = await zip.generateAsync({ type: 'blob' })
      downloadBlob(blob, `${manifest.packId}-selected-character.zip`)
      setMessage('当前角色资源已导出：包含 idle、walk 成品图和当前使用的分层资源。')
    } catch {
      setError('当前角色资源导出失败，请确认素材文件完整。')
    } finally {
      setExporting(false)
    }
  }

  async function importPack(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const zip = await JSZip.loadAsync(file)
      const manifestFile = zip.file('manifest.json')
      if (!manifestFile) throw new Error('manifest-missing')
      const nextManifest = JSON.parse(await manifestFile.async('text')) as MoeAvatarManifest
      const entries = Object.values(zip.files).filter((entry) => !entry.dir && entry.name !== 'manifest.json')
      assetStore.dispose()
      for (const entry of entries) {
        assetStore.set(entry.name.replace(/^\//, ''), await entry.async('blob'))
      }
      setManifest(nextManifest)
      setManifestDraft(JSON.stringify(nextManifest, null, 2))
      setSelection(createSelection(nextManifest))
      setAssetRevision((current) => current + 1)
      setLoading(false)
      setMessage(`已导入素材包 ${nextManifest.displayName}，共载入 ${entries.length} 个本地资源。`)
    } catch {
      setLoading(false)
      setError('素材包导入失败：ZIP 中需要包含根目录 manifest.json 和对应分层资源。')
    }
  }

  async function importManifest(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')
    try {
      const nextManifest = JSON.parse(await file.text()) as MoeAvatarManifest
      setManifest(nextManifest)
      setManifestDraft(JSON.stringify(nextManifest, null, 2))
      setSelection(createSelection(nextManifest))
      setFrame(0)
      setMessage(`已导入 manifest：${nextManifest.displayName}`)
    } catch {
      setError('manifest 导入失败：请选择符合角色素材包协议的 JSON 文件。')
    }
  }

  function applyManifestDraft() {
    try {
      const nextManifest = JSON.parse(manifestDraft) as MoeAvatarManifest
      setManifest(nextManifest)
      setSelection(createSelection(nextManifest))
      setFrame(0)
      setError('')
      setMessage('manifest 配置已应用到当前预览。')
    } catch {
      setError('manifest JSON 格式无效，未应用修改。')
    }
  }

  if (loading) return <section className="avatar-composer-loading">正在加载自有角色素材包…</section>
  if (!manifest) return <section className="avatar-composer-error">{error}</section>

  return (
    <main className="avatar-composer">
      <header className="avatar-composer-header">
        <div>
          <span className="avatar-composer-kicker">OWN ASSET CHARACTER BUILDER</span>
          <h2>角色生成器</h2>
          <p>使用 Moe 自有分层素材组合角色，不依赖 LPC 资源或命名。</p>
        </div>
        <div className="avatar-composer-header-actions">
          <span className="avatar-composer-status"><i /> 自有素材包 · {manifest.cellSize}px</span>
          <div className="avatar-composer-export-actions">
            <button type="button" className="avatar-composer-export secondary" onClick={() => packInputRef.current?.click()}>导入素材包 ZIP</button>
            <input ref={packInputRef} type="file" accept=".zip,application/zip" hidden onChange={(event) => void importPack(event)} />
            <button type="button" className="avatar-composer-export secondary" onClick={() => manifestInputRef.current?.click()}>导入 Manifest</button>
            <input ref={manifestInputRef} type="file" accept="application/json" hidden onChange={(event) => void importManifest(event)} />
            <button type="button" className="avatar-composer-export secondary" disabled={exporting} onClick={() => void exportSelectedCharacter()}>导出当前角色</button>
            <button type="button" className="avatar-composer-export" disabled={exporting} onClick={() => void exportCharacterPack()}>{exporting ? '导出中…' : '导出完整素材包'}</button>
          </div>
        </div>
      </header>

      <div className="avatar-composer-layout">
        <aside className="avatar-composer-sidebar">
          <div className="avatar-composer-section-title">1 / 选择角色部件</div>
          <div className="avatar-composer-fixed-list">
            {['body', 'head', 'face', 'hair'].map((slot) => (
              <div key={slot} className="avatar-composer-fixed"><span>{slot === 'body' ? '身体' : slot === 'head' ? '头型' : slot === 'face' ? '脸型' : '发型'}</span><b>官方底模</b></div>
            ))}
          </div>
          <p className="avatar-composer-note">基础层当前使用官方自有底模；后续可在同一协议下增加多套身体、脸型和发型。</p>
          {slotEntries.map((slot) => {
            const items = Object.keys(manifest.slots[slot] ?? {})
            return (
              <section className="avatar-composer-slot-group" key={slot}>
                <div className="avatar-composer-slot-heading"><span>{SLOT_LABELS[slot] ?? slot}</span><small>{items.length} 个可用部件</small></div>
                <div className="avatar-composer-item-grid">
                  {(slot === 'hat' || slot === 'back' || slot === 'hand' || slot === 'offhand' || slot === 'mask' || slot === 'glasses') ? <button type="button" className={`avatar-composer-item-card avatar-composer-empty${!selection[slot] ? ' active' : ''}`} onClick={() => updateSelection(slot, '')}><span>×</span><strong>不使用</strong><small>{!selection[slot] ? '已选择' : '清空'}</small></button> : null}
                  {items.map((itemId) => <SlotCard key={itemId} manifest={manifest} slot={slot} itemId={itemId} selected={selection[slot] === itemId} onSelect={() => updateSelection(slot, itemId)} assetStore={assetStore} assetRevision={assetRevision} />)}
                </div>
              </section>
            )
          })}

          <div className="avatar-composer-section-title avatar-composer-spaced">2 / 选择动作</div>
          <div className="avatar-composer-animation-tabs">
            {Object.keys(manifest.animations).map((name) => (
              <button key={name} type="button" className={animation === name ? 'active' : ''} onClick={() => { setAnimation(name as PreviewAnimation); setFrame(0) }}>{name === 'idle' ? '待机' : name === 'walk' ? '行走' : name}</button>
            ))}
          </div>
          <div className="avatar-composer-direction-tabs">
            {manifest.directionRows.map((name, index) => <button key={name} type="button" className={direction === index ? 'active' : ''} onClick={() => setDirection(index)}>{DIRECTION_LABELS[index] ?? name}</button>)}
          </div>
          <button type="button" className="avatar-composer-play" onClick={() => setPlaying((current) => !current)}>{playing ? '暂停动作预览' : '播放动作预览'}</button>
          <p className="avatar-composer-message" role="status">{error || message || '选择部件后，右侧会实时合成四方向角色。'}</p>
        </aside>

        <section className="avatar-composer-workbench">
          <div className="avatar-composer-preview-card">
            <div className="avatar-composer-panel-head"><div><span>当前方向</span><strong>{DIRECTION_LABELS[direction]} · 第 {frame + 1} 帧</strong></div><small>{animation} · {frameCount} 帧 · {playing ? '播放中' : '已暂停'}</small></div>
            <div className="avatar-composer-main-preview"><DirectionCell sheet={sheet} manifest={manifest} animation={animation} direction={direction} frame={frame} large /></div>
          </div>
          <div className="avatar-composer-directions-card">
            <div className="avatar-composer-panel-head"><div><span>四方向预览</span><strong>同一角色 · {animation}</strong></div><small>行序：上 / 左 / 下 / 右</small></div>
            <div className="avatar-composer-directions-grid">
              {manifest.directionRows.map((name, index) => <button type="button" key={name} className={direction === index ? 'active' : ''} onClick={() => setDirection(index)}><DirectionCell sheet={sheet} manifest={manifest} animation={animation} direction={index} frame={frame} /><span>{DIRECTION_LABELS[index] ?? name}</span></button>)}
            </div>
          </div>
          <div className="avatar-composer-output-card">
            <div><span>输出预览</span><strong>{manifest.animations[animation].cols} 列 × {manifest.animations[animation].rows} 行 · {manifest.cellSize}px 网格</strong></div>
            <code>{manifest.packId}-character.zip</code>
            <p>导出包包含完整 manifest、分层素材、缩略图以及当前选择的 baked 行走/待机预览。</p>
          </div>
          <details className="avatar-composer-manifest-panel">
            <summary>高级 Manifest 配置</summary>
            <p>修改后会立即用于预览和导出；素材路径需与当前素材包一致。</p>
            <textarea value={manifestDraft} onChange={(event) => setManifestDraft(event.target.value)} spellCheck={false} />
            <button type="button" className="avatar-composer-export secondary" onClick={applyManifestDraft}>应用配置</button>
          </details>
        </section>
      </div>
    </main>
  )
}
