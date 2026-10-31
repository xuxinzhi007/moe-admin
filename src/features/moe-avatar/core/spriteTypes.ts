export type SpriteAssetKind = 'character' | 'object' | 'effect'

export type SpriteResourceStatus = 'draft' | 'ready' | 'published'

export type SpriteTemplateMode =
  | 'single_frame'
  | 'animation_strip'
  | 'directional_grid'
  | 'layered_composition'

export type SpriteSize = {
  width: number
  height: number
}

export type SpriteAnchor = {
  x: number
  y: number
}

export type SpriteFrameTransform = {
  offsetX: number
  offsetY: number
  scale: number
  /** Optional non-uniform scale multipliers for frame-tuning tools. */
  scaleX?: number
  scaleY?: number
  /** Clockwise rotation in degrees around the frame center. */
  rotation?: number
  anchor?: SpriteAnchor
}

export type SpriteFrameAdjustment = SpriteFrameTransform & {
  frame: number
  endFrame?: number
}

export type SpriteFrameLayout = {
  mode: SpriteTemplateMode
  frameWidth: number
  frameHeight: number
  columns: number
  rows: number
}

export type SpriteAnimation = {
  id: string
  frameCount: number
  startFrame?: number
  frameRate?: number
  loop?: boolean
  direction?: string
}

export type SpriteSourceMetadata = {
  path: string
  mimeType?: string
  width?: number
  height?: number
  provider?: string
  prompt?: string
  model?: string
  generatedAt?: string
}

export type SpriteGenerationMode = 'source_frames' | 'video_extracted' | 'synthetic_transform'

export type SpriteGenerationMetadata = {
  mode: SpriteGenerationMode
  action?: string
  quality?: string
  approximation?: string
  sourceFrame?: number
}

export type SpriteLayer = {
  id: string
  path: string
  zIndex?: number
  opacity?: number
}

export type SpriteResource = {
  id: string
  kind: SpriteAssetKind
  templateId?: string
  status?: SpriteResourceStatus
  /** Direction labels are intentionally data-driven; the contract does not prescribe LPC names or order. */
  directions?: string[]
  /** Runtime-ready sprite sheet path. The source path remains the original AI asset. */
  sheet?: string
  canvas: SpriteSize
  anchor: SpriteAnchor
  animations: SpriteAnimation[]
  frameLayout: SpriteFrameLayout
  source: SpriteSourceMetadata
  generation?: SpriteGenerationMetadata
  layers?: SpriteLayer[]
  frames?: SpriteFrameAdjustment[]
  frameAdjustments?: SpriteFrameAdjustment[]
}

export type AiSpriteResource = SpriteResource

export type SpriteTemplate = Omit<SpriteResource, 'id' | 'source'> & {
  id: string
  label: string
  description: string
}
