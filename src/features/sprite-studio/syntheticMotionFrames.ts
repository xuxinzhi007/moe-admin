export type SyntheticMotionPreset = 'idle' | 'walk' | 'attack' | 'hit'
export type SyntheticMotionDirection = 'left' | 'right'

export interface SyntheticMotionMetadata {
  kind: 'synthetic-motion'
  approximation: true
  poseGeneration: 'not-generated'
  method: 'canvas-2d-transform'
  preset: SyntheticMotionPreset
  frameIndex: number
  frameCount: 4
  direction?: SyntheticMotionDirection
  horizontalFlip: boolean
}

export interface SyntheticMotionFrame {
  name: string
  url: string
  width: number
  height: number
  image: HTMLImageElement
  sourceName?: string
  mimeType?: string
  metadata: SyntheticMotionMetadata
}

export interface SyntheticMotionOptions {
  preset: SyntheticMotionPreset
  direction?: SyntheticMotionDirection
  horizontalFlip?: boolean
  sourceName?: string
}

interface MotionTransform {
  scaleX: number
  scaleY: number
  offsetX: number
  offsetY: number
  rotation: number
}

const MOTION_PRESETS: Record<SyntheticMotionPreset, readonly MotionTransform[]> = {
  idle: [
    { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0, rotation: 0 },
    { scaleX: 1.01, scaleY: 0.99, offsetX: 0, offsetY: 1, rotation: 0.01 },
    { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0, rotation: 0 },
    { scaleX: 0.99, scaleY: 1.01, offsetX: 0, offsetY: 1, rotation: -0.01 },
  ],
  walk: [
    { scaleX: 0.98, scaleY: 1.02, offsetX: -1, offsetY: 1, rotation: -0.035 },
    { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: -1, rotation: 0.02 },
    { scaleX: 0.98, scaleY: 1.02, offsetX: 1, offsetY: 1, rotation: 0.035 },
    { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: -1, rotation: -0.02 },
  ],
  attack: [
    { scaleX: 0.98, scaleY: 1.02, offsetX: -2, offsetY: 1, rotation: -0.04 },
    { scaleX: 1.03, scaleY: 0.98, offsetX: 1, offsetY: 0, rotation: 0.03 },
    { scaleX: 1.08, scaleY: 0.94, offsetX: 4, offsetY: 0, rotation: 0.08 },
    { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0, rotation: 0 },
  ],
  hit: [
    { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0, rotation: 0 },
    { scaleX: 0.98, scaleY: 1.02, offsetX: -1, offsetY: 0, rotation: -0.08 },
    { scaleX: 1.01, scaleY: 0.99, offsetX: 1, offsetY: 0, rotation: 0.06 },
    { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0, rotation: 0 },
  ],
}

const FRAME_COUNT = 4
const PNG_MIME_TYPE = 'image/png'

function getImageSize(source: HTMLImageElement) {
  const width = source.naturalWidth || source.width
  const height = source.naturalHeight || source.height
  if (width <= 0 || height <= 0) throw new Error('source-image-has-no-size')
  return { width, height }
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('synthetic-frame-load-failed'))
    image.src = url
  })
}

function canvasToPng(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('synthetic-frame-export-failed'))
    }, PNG_MIME_TYPE)
  })
}

export async function generateSyntheticMotionFrames(
  source: HTMLImageElement,
  options: SyntheticMotionOptions,
): Promise<SyntheticMotionFrame[]> {
  const horizontalFlip = options.horizontalFlip ?? false
  if (horizontalFlip && !options.direction) {
    throw new Error('horizontal-flip-requires-left-or-right-direction')
  }

  const transforms = MOTION_PRESETS[options.preset]
  const { width, height } = getImageSize(source)
  const sourceName = options.sourceName ?? 'source-image.png'
  const baseName = sourceName.replace(/\.[^.]+$/, '') || 'source-image'
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('2d-canvas-context-unavailable')

  const generatedUrls: string[] = []
  try {
    const frames: SyntheticMotionFrame[] = []
    for (const [frameIndex, transform] of transforms.entries()) {
      context.setTransform(1, 0, 0, 1, 0, 0)
      context.clearRect(0, 0, width, height)
      context.imageSmoothingEnabled = false
      context.translate(width / 2 + transform.offsetX, height / 2 + transform.offsetY)
      context.scale(horizontalFlip ? -transform.scaleX : transform.scaleX, transform.scaleY)
      context.rotate(transform.rotation)
      context.translate(-width / 2, -height / 2)
      context.drawImage(source, 0, 0, width, height)

      const url = URL.createObjectURL(await canvasToPng(canvas))
      generatedUrls.push(url)
      const image = await loadImage(url)
      frames.push({
        name: `${baseName}-${options.preset}-${String(frameIndex + 1).padStart(2, '0')}.png`,
        url,
        width,
        height,
        image,
        sourceName,
        mimeType: PNG_MIME_TYPE,
        metadata: {
          kind: 'synthetic-motion',
          approximation: true,
          poseGeneration: 'not-generated',
          method: 'canvas-2d-transform',
          preset: options.preset,
          frameIndex,
          frameCount: FRAME_COUNT,
          direction: options.direction,
          horizontalFlip,
        },
      })
    }
    return frames
  } catch (error) {
    generatedUrls.forEach((url) => URL.revokeObjectURL(url))
    throw error
  }
}
