export type ManualTweenEasing = 'linear' | 'ease_in_out' | 'ease_out'

export type ManualTweenTransform = {
  offsetX: number
  offsetY: number
  scale: number
  rotation: number
  opacity: number
}

export type ManualTweenMetadata = {
  kind: 'manual_tween'
  frameIndex: number
  frameCount: number
  easing: ManualTweenEasing
  fromTransform: ManualTweenTransform
  toTransform: ManualTweenTransform
}

export type ManualTweenFrame = {
  name: string
  url: string
  width: number
  height: number
  image: HTMLImageElement
  sourceName?: string
  mimeType?: string
  metadata: ManualTweenMetadata
}

export type ManualTweenOptions = {
  frameCount: number
  easing: ManualTweenEasing
  startTransform: ManualTweenTransform
  endTransform: ManualTweenTransform
  sourceName?: string
}

const PNG_MIME_TYPE = 'image/png'
const DEFAULT_SOURCE_NAME = 'manual-tween.png'

function getImageSize(source: HTMLImageElement) {
  const width = source.naturalWidth || source.width
  const height = source.naturalHeight || source.height
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    throw new Error('tween-source-image-has-no-size')
  }
  return { width, height }
}

function validateTransform(transform: ManualTweenTransform, label: string) {
  const values = Object.values(transform)
  if (values.some((value) => !Number.isFinite(value))) throw new Error(`${label}-transform-is-invalid`)
  if (transform.scale < 0) throw new Error(`${label}-transform-scale-is-invalid`)
  if (transform.opacity < 0 || transform.opacity > 1) throw new Error(`${label}-transform-opacity-is-invalid`)
}

function copyTransform(transform: ManualTweenTransform): ManualTweenTransform {
  return { ...transform }
}

function ease(progress: number, easing: ManualTweenEasing) {
  if (easing === 'linear') return progress
  if (easing === 'ease_out') return 1 - (1 - progress) ** 2
  return progress < 0.5 ? 2 * progress ** 2 : 1 - ((-2 * progress + 2) ** 2) / 2
}

function interpolate(start: number, end: number, progress: number) {
  return start + (end - start) * progress
}

function interpolateTransform(start: ManualTweenTransform, end: ManualTweenTransform, progress: number) {
  return {
    offsetX: interpolate(start.offsetX, end.offsetX, progress),
    offsetY: interpolate(start.offsetY, end.offsetY, progress),
    scale: interpolate(start.scale, end.scale, progress),
    rotation: interpolate(start.rotation, end.rotation, progress),
    opacity: interpolate(start.opacity, end.opacity, progress),
  }
}

function canvasToPng(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('manual-tween-frame-export-failed'))
    }, PNG_MIME_TYPE)
  })
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('manual-tween-frame-load-failed'))
    image.src = url
  })
}

function drawTransformedImage(
  context: CanvasRenderingContext2D,
  source: HTMLImageElement,
  width: number,
  height: number,
  sourceWidth: number,
  sourceHeight: number,
  transform: ManualTweenTransform,
  opacity: number,
) {
  context.save()
  context.globalAlpha = opacity * transform.opacity
  context.translate(width / 2 + transform.offsetX, height / 2 + transform.offsetY)
  context.rotate(transform.rotation)
  context.scale(transform.scale, transform.scale)
  context.drawImage(source, -sourceWidth / 2, -sourceHeight / 2, sourceWidth, sourceHeight)
  context.restore()
}

export async function generateManualTweenFrames(
  fromImage: HTMLImageElement,
  toImage: HTMLImageElement,
  options: ManualTweenOptions,
): Promise<ManualTweenFrame[]> {
  if (!Number.isInteger(options.frameCount) || options.frameCount < 1) {
    throw new Error('frameCount must be a positive integer')
  }
  if (!['linear', 'ease_in_out', 'ease_out'].includes(options.easing)) {
    throw new Error('manual-tween-easing-is-invalid')
  }
  validateTransform(options.startTransform, 'start')
  validateTransform(options.endTransform, 'end')

  const fromSize = getImageSize(fromImage)
  const toSize = getImageSize(toImage)
  const width = Math.max(fromSize.width, toSize.width)
  const height = Math.max(fromSize.height, toSize.height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('2d-canvas-context-unavailable')

  const sourceName = options.sourceName ?? DEFAULT_SOURCE_NAME
  const baseName = sourceName.replace(/\.[^.]+$/, '') || 'manual-tween'
  const startTransform = copyTransform(options.startTransform)
  const endTransform = copyTransform(options.endTransform)
  const generatedUrls: string[] = []

  try {
    const frames: ManualTweenFrame[] = []
    for (let frameIndex = 0; frameIndex < options.frameCount; frameIndex += 1) {
      const rawProgress = options.frameCount === 1 ? 0 : frameIndex / (options.frameCount - 1)
      const progress = ease(rawProgress, options.easing)
      const transform = interpolateTransform(startTransform, endTransform, progress)
      context.setTransform(1, 0, 0, 1, 0, 0)
      context.clearRect(0, 0, width, height)
      context.imageSmoothingEnabled = false
      drawTransformedImage(context, fromImage, width, height, fromSize.width, fromSize.height, transform, 1 - progress)
      drawTransformedImage(context, toImage, width, height, toSize.width, toSize.height, transform, progress)

      const url = URL.createObjectURL(await canvasToPng(canvas))
      generatedUrls.push(url)
      const image = await loadImage(url)
      frames.push({
        name: `${baseName}-${String(frameIndex + 1).padStart(3, '0')}.png`,
        url,
        width,
        height,
        image,
        sourceName,
        mimeType: PNG_MIME_TYPE,
        metadata: {
          kind: 'manual_tween',
          frameIndex,
          frameCount: options.frameCount,
          easing: options.easing,
          fromTransform: startTransform,
          toTransform: endTransform,
        },
      })
    }
    return frames
  } catch (error) {
    generatedUrls.forEach((url) => URL.revokeObjectURL(url))
    throw error
  }
}

export function revokeManualTweenFrames(frames: readonly ManualTweenFrame[]) {
  frames.forEach((frame) => URL.revokeObjectURL(frame.url))
}
