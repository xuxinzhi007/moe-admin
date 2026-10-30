export type DocumentFrame = {
  index: number
  sourceFrameIndex: number
  durationMs: number
  disabled: boolean
  transform: {
    scale: number
    scaleX: number
    scaleY: number
    rotation: number
    offsetX: number
    offsetY: number
  }
}

export type DocumentAnimation = {
  id: string
  label: string
  fps: number
  loop: boolean
  frameIndices: number[]
}

export type DocumentLayer = {
  id: string
  label: string
  frameCount: number
  startFrame: number
  endFrame: number
  offsetX: number
  offsetY: number
  scale: number
  opacity: number
  enabled: boolean
}

export type AnimationSheetDocument = {
  version: 1
  sourceName: string
  frames: DocumentFrame[]
  animations: DocumentAnimation[]
  layers: DocumentLayer[]
  canvas: { width: number; height: number; originX: number; originY: number }
  padding: number
  fitMode: 'contain' | 'cover'
  previewBackground: string
}

export function getEnabledFrameIndices(frames: DocumentFrame[]): number[] {
  return frames.filter((frame) => !frame.disabled).map((frame) => frame.index)
}

export function createAnimationSheetDocument(input: Omit<AnimationSheetDocument, 'version'>): AnimationSheetDocument {
  return { version: 1, ...input }
}
