import type { ChangeEvent } from 'react'

export type SpriteLayerEditorItem = {
  id: string
  name: string
  frameCount: number
  startFrame: number
  endFrame: number
  offsetX: number
  offsetY: number
  scale: number
  opacity: number
  enabled: boolean
}

type SpriteLayerPanelProps = {
  layers: SpriteLayerEditorItem[]
  frameCount: number
  selectedLayerId: string | null
  onAddFiles: (files: File[]) => void
  onUpdate: (id: string, patch: Partial<SpriteLayerEditorItem>) => void
  onDelete: (id: string) => void
  onSelect: (id: string) => void
}

export function SpriteLayerPanel({ layers, frameCount, selectedLayerId, onAddFiles, onUpdate, onDelete, onSelect }: SpriteLayerPanelProps) {
  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length) onAddFiles(files)
  }

  return <details className="sprite-collapsible sprite-effect-layer-panel" open>
    <summary>效果与部件层</summary>
    <p className="sprite-section-note">添加攻击特效、武器或独立部件；多张图片按帧条顺序叠加。</p>
    <label className="sprite-dropzone sprite-layer-dropzone" htmlFor="sprite-effect-upload">
      <span className="sprite-upload-mark">＋</span>
      <strong>添加效果 / 部件图片</strong>
      <small>单张覆盖区间，多张按序列帧播放</small>
      <input id="sprite-effect-upload" type="file" accept="image/*,.png,.jpg,.jpeg,.webp" multiple onChange={handleFiles} />
    </label>
    {layers.length ? <div className="sprite-layer-list">{layers.map((layer) => <article className={`sprite-layer-card ${selectedLayerId === layer.id ? 'active' : ''}`} key={layer.id} onClick={() => onSelect(layer.id)}>
      <div className="sprite-layer-card-head">
        <label className="sprite-layer-enabled"><input type="checkbox" checked={layer.enabled} onChange={(event) => onUpdate(layer.id, { enabled: event.target.checked })} /><strong>{layer.name}</strong></label>
        <button type="button" onClick={() => onDelete(layer.id)}>移除</button>
      </div>
      <small>{layer.frameCount > 1 ? `${layer.frameCount} 张序列帧` : '单张覆盖图'}</small>
      <div className="sprite-layer-controls">
        <label className="sprite-control"><span>起始帧</span><input type="number" min="1" max={Math.max(1, frameCount)} value={layer.startFrame + 1} onChange={(event) => onUpdate(layer.id, { startFrame: Math.max(0, Math.min(layer.endFrame, Number(event.target.value) - 1)) })} /></label>
        <label className="sprite-control"><span>结束帧</span><input type="number" min="1" max={Math.max(1, frameCount)} value={layer.endFrame + 1} onChange={(event) => onUpdate(layer.id, { endFrame: Math.max(layer.startFrame, Math.min(Math.max(0, frameCount - 1), Number(event.target.value) - 1)) })} /></label>
        <label className="sprite-control"><span>偏移 X <output>{layer.offsetX}px</output></span><input type="range" min="-1024" max="1024" value={layer.offsetX} onChange={(event) => onUpdate(layer.id, { offsetX: Number(event.target.value) })} /></label>
        <label className="sprite-control"><span>偏移 Y <output>{layer.offsetY}px</output></span><input type="range" min="-1024" max="1024" value={layer.offsetY} onChange={(event) => onUpdate(layer.id, { offsetY: Number(event.target.value) })} /></label>
        <label className="sprite-control"><span>缩放 <output>{layer.scale}%</output></span><input type="range" min="10" max="300" value={layer.scale} onChange={(event) => onUpdate(layer.id, { scale: Number(event.target.value) })} /></label>
        <label className="sprite-control"><span>透明度 <output>{layer.opacity}%</output></span><input type="range" min="0" max="100" value={layer.opacity} onChange={(event) => onUpdate(layer.id, { opacity: Number(event.target.value) })} /></label>
      </div>
    </article>)}</div> : <p className="sprite-empty-note">还没有叠加层。先导入人物，再添加攻击特效或独立部件。</p>}
  </details>
}
