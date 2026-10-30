export type PreviewBackgroundOption = 'checker' | 'light' | 'dark' | 'green' | 'magenta'
export type MaskMode = 'off' | 'erase' | 'restore'

type SpriteStudioToolsPanelProps = {
  previewBackground: PreviewBackgroundOption
  onPreviewBackgroundChange: (value: PreviewBackgroundOption) => void
  maskMode: MaskMode
  maskBrushSize: number
  onMaskModeChange: (value: MaskMode) => void
  onMaskBrushSizeChange: (value: number) => void
  hasFrames: boolean
  onSave: () => void | Promise<void>
  onRestore: () => void | Promise<void>
  onExport: (format: 'png' | 'json' | 'zip') => void | Promise<void>
}

export function SpriteStudioToolsPanel({ previewBackground, onPreviewBackgroundChange, maskMode, maskBrushSize, onMaskModeChange, onMaskBrushSizeChange, hasFrames, onSave, onRestore, onExport }: SpriteStudioToolsPanelProps) {
  return <details className="sprite-collapsible sprite-tools-panel" open>
    <summary>工作台工具</summary>
    <label className="sprite-control"><span>预览背景</span><select value={previewBackground} onChange={(event) => onPreviewBackgroundChange(event.target.value as PreviewBackgroundOption)}><option value="checker">棋盘格</option><option value="light">浅色</option><option value="dark">深色</option><option value="green">绿色</option><option value="magenta">洋红</option></select></label>
    <label className="sprite-control"><span>蒙版编辑</span><select value={maskMode} onChange={(event) => onMaskModeChange(event.target.value as MaskMode)}><option value="off">关闭</option><option value="erase">擦除</option><option value="restore">恢复</option></select></label>
    <label className="sprite-control"><span>笔刷大小 <output>{maskBrushSize}px</output></span><input type="range" min="1" max="24" value={maskBrushSize} disabled={maskMode === 'off'} onChange={(event) => onMaskBrushSizeChange(Number(event.target.value))} /></label>
    <div className="sprite-tool-group"><span className="sprite-section-label">本地工作区</span><div className="sprite-tool-buttons"><button type="button" onClick={() => void onSave()} disabled={!hasFrames}>保存草稿</button><button type="button" onClick={() => void onRestore()}>恢复草稿</button></div></div>
    <div className="sprite-tool-group"><span className="sprite-section-label">直接导出</span><div className="sprite-tool-buttons"><button type="button" onClick={() => void onExport('png')} disabled={!hasFrames}>PNG</button><button type="button" onClick={() => void onExport('json')} disabled={!hasFrames}>JSON</button><button type="button" onClick={() => void onExport('zip')} disabled={!hasFrames}>ZIP</button></div></div>
  </details>
}
