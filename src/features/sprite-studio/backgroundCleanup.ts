export type RgbColor = readonly [number, number, number]

export interface BackgroundCleanupOptions {
  colorDistance?: number
  outputAlpha?: number
  backgroundColor?: RgbColor
  speckleSize?: number
}

export type SpriteCleanupSource = HTMLImageElement | HTMLCanvasElement

const DEFAULT_COLOR_DISTANCE = 30
const DEFAULT_SPECKLE_SIZE = 256

function colorDistance(red: number, green: number, blue: number, background: RgbColor) {
  return Math.hypot(red - background[0], green - background[1], blue - background[2])
}

function edgeIndex(index: number, width: number, height: number) {
  const x = index % width
  const y = Math.floor(index / width)
  return x === 0 || y === 0 || x === width - 1 || y === height - 1
}

function isBackgroundPixel(data: Uint8ClampedArray, index: number, backgrounds: readonly RgbColor[], threshold: number) {
  const alpha = data[index + 3]
  return alpha === 0 || backgrounds.some((background) => colorDistance(data[index], data[index + 1], data[index + 2], background) <= threshold)
}

function sampleBackgroundColors(data: Uint8ClampedArray, width: number, height: number, threshold: number, configuredColor?: RgbColor) {
  if (configuredColor) return [configuredColor]
  const candidates = [
    0,
    width - 1,
    (height - 1) * width,
    height * width - 1,
    Math.floor(width / 2),
    (height - 1) * width + Math.floor(width / 2),
    Math.floor(height / 2) * width,
    Math.floor(height / 2) * width + width - 1,
  ]
  const backgrounds: RgbColor[] = []
  for (const pixelIndex of candidates) {
    const index = pixelIndex * 4
    const candidate: RgbColor = [data[index], data[index + 1], data[index + 2]]
    if (!backgrounds.some((background) => colorDistance(candidate[0], candidate[1], candidate[2], background) <= Math.max(1, threshold / 2))) backgrounds.push(candidate)
  }
  return backgrounds
}

export function removeBackgroundFromImageData(
  imageData: ImageData,
  options: BackgroundCleanupOptions = {},
): ImageData {
  const { data, width, height } = imageData
  if (width === 0 || height === 0) return imageData

  const threshold = Math.max(0, options.colorDistance ?? DEFAULT_COLOR_DISTANCE)
  const outputAlpha = Math.max(0, Math.min(255, options.outputAlpha ?? 0))
  const speckleSize = Math.max(0, Math.floor(options.speckleSize ?? DEFAULT_SPECKLE_SIZE))
  const backgrounds = sampleBackgroundColors(data, width, height, threshold, options.backgroundColor)
  const visited = new Uint8Array(width * height)
  const queue: number[] = []

  for (let index = 0; index < width * height; index += 1) {
    if (edgeIndex(index, width, height) && isBackgroundPixel(data, index * 4, backgrounds, threshold)) {
      visited[index] = 1
      queue.push(index)
    }
  }

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const index = queue[cursor]
    data[index * 4 + 3] = outputAlpha
    const x = index % width
    const y = Math.floor(index / width)
    const neighbors = [
      x > 0 ? index - 1 : -1,
      x + 1 < width ? index + 1 : -1,
      y > 0 ? index - width : -1,
      y + 1 < height ? index + width : -1,
    ]

    for (const neighbor of neighbors) {
      if (neighbor >= 0 && visited[neighbor] === 0 && isBackgroundPixel(data, neighbor * 4, backgrounds, threshold)) {
        visited[neighbor] = 1
        queue.push(neighbor)
      }
    }
  }

  if (speckleSize > 0) {
    for (let start = 0; start < width * height; start += 1) {
      if (visited[start] || !isBackgroundPixel(data, start * 4, backgrounds, threshold)) continue
      const component: number[] = [start]
      let touchesForeground = false
      visited[start] = 1
      for (let cursor = 0; cursor < component.length; cursor += 1) {
        const index = component[cursor]
        const x = index % width
        const y = Math.floor(index / width)
        const neighbors = [x > 0 ? index - 1 : -1, x + 1 < width ? index + 1 : -1, y > 0 ? index - width : -1, y + 1 < height ? index + width : -1]
        for (const neighbor of neighbors) {
          if (neighbor >= 0 && !isBackgroundPixel(data, neighbor * 4, backgrounds, threshold)) touchesForeground = true
          if (neighbor >= 0 && visited[neighbor] === 0 && isBackgroundPixel(data, neighbor * 4, backgrounds, threshold)) {
            visited[neighbor] = 1
            component.push(neighbor)
          }
        }
      }
      if (!touchesForeground && component.length <= speckleSize) for (const index of component) data[index * 4 + 3] = outputAlpha
    }
  }

  return imageData
}

export function applyAlphaBrush(imageData: ImageData, originalImageData: ImageData, centerX: number, centerY: number, radius: number, mode: 'erase' | 'restore'): ImageData {
  const brushRadius = Math.max(1, radius)
  const left = Math.max(0, Math.floor(centerX - brushRadius))
  const right = Math.min(imageData.width - 1, Math.ceil(centerX + brushRadius))
  const top = Math.max(0, Math.floor(centerY - brushRadius))
  const bottom = Math.min(imageData.height - 1, Math.ceil(centerY + brushRadius))
  for (let y = top; y <= bottom; y += 1) for (let x = left; x <= right; x += 1) {
    if (Math.hypot(x - centerX, y - centerY) > brushRadius) continue
    const offset = (y * imageData.width + x) * 4 + 3
    imageData.data[offset] = mode === 'erase' ? 0 : originalImageData.data[offset]
  }
  return imageData
}

export function removeImageBackground(
  source: SpriteCleanupSource,
  options: BackgroundCleanupOptions = {},
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  const width = source instanceof HTMLCanvasElement ? source.width : source.naturalWidth || source.width
  const height = source instanceof HTMLCanvasElement ? source.height : source.naturalHeight || source.height
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) throw new Error('2d-canvas-context-unavailable')
  context.drawImage(source, 0, 0, width, height)
  const imageData = context.getImageData(0, 0, width, height)
  removeBackgroundFromImageData(imageData, options)
  context.putImageData(imageData, 0, 0)
  return canvas
}
