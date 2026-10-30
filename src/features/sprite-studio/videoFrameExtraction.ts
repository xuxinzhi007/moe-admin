export type VideoMetadata = { duration: number; width: number; height: number }

export type ExtractedVideoFrame = {
  name: string
  url: string
  width: number
  height: number
  image: HTMLImageElement
  sourceName: string
  mimeType: string
}

export type VideoFrameExtractionOptions = {
  frameCount?: number
  duration?: number
  startTime?: number
  endTime?: number
  signal?: AbortSignal
  onProgress?: (completed: number, total: number) => void
}

export const MAX_VIDEO_FRAMES = 120
export const MAX_VIDEO_DURATION_SECONDS = 30
const DEFAULT_FRAME_COUNT = 8

function abortError() {
  return new DOMException('Video frame extraction was cancelled.', 'AbortError')
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw abortError()
}

function waitForEvent(video: HTMLVideoElement, eventName: 'loadedmetadata' | 'loadeddata' | 'seeked', signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener(eventName, handleEvent)
      video.removeEventListener('error', handleError)
      signal?.removeEventListener('abort', handleAbort)
    }
    const handleEvent = () => { cleanup(); resolve() }
    const handleError = () => { cleanup(); reject(new Error(`Video ${eventName} event failed.`)) }
    const handleAbort = () => { cleanup(); reject(abortError()) }
    video.addEventListener(eventName, handleEvent)
    video.addEventListener('error', handleError)
    signal?.addEventListener('abort', handleAbort, { once: true })
    if (signal?.aborted) handleAbort()
  })
}

export async function readVideoMetadata(file: File, signal?: AbortSignal): Promise<VideoMetadata> {
  throwIfAborted(signal)
  const video = document.createElement('video')
  const url = URL.createObjectURL(file)
  video.preload = 'metadata'
  video.src = url
  try {
    const metadata = waitForEvent(video, 'loadedmetadata', signal)
    video.load()
    await metadata
    if (!Number.isFinite(video.duration) || video.duration <= 0 || video.videoWidth < 1 || video.videoHeight < 1) {
      throw new Error('Video duration or dimensions are unavailable.')
    }
    return { duration: video.duration, width: video.videoWidth, height: video.videoHeight }
  } finally {
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(url)
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, signal?: AbortSignal) {
  return new Promise<Blob>((resolve, reject) => {
    throwIfAborted(signal)
    canvas.toBlob((blob) => {
      if (signal?.aborted) reject(abortError())
      else if (blob) resolve(blob)
      else reject(new Error('Frame image could not be encoded.'))
    }, 'image/png')
  })
}

function loadImage(url: string, signal?: AbortSignal) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    const handleAbort = () => reject(abortError())
    image.onload = () => {
      signal?.removeEventListener('abort', handleAbort)
      if (signal?.aborted) handleAbort()
      else resolve(image)
    }
    image.onerror = () => {
      signal?.removeEventListener('abort', handleAbort)
      reject(new Error('Extracted frame image could not be loaded.'))
    }
    signal?.addEventListener('abort', handleAbort, { once: true })
    if (signal?.aborted) { handleAbort(); return }
    image.src = url
  })
}

export async function extractVideoFrames(file: File, options: VideoFrameExtractionOptions = {}): Promise<ExtractedVideoFrame[]> {
  const signal = options.signal
  throwIfAborted(signal)
  const metadata = await readVideoMetadata(file, signal)
  const frameCount = options.frameCount ?? DEFAULT_FRAME_COUNT
  if (!Number.isInteger(frameCount) || frameCount < 1 || frameCount > MAX_VIDEO_FRAMES) throw new Error(`frameCount must be between 1 and ${MAX_VIDEO_FRAMES}.`)
  const startTime = options.startTime ?? 0
  const endTime = options.endTime ?? options.duration ?? metadata.duration
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || startTime < 0 || endTime < startTime || endTime > metadata.duration || endTime > MAX_VIDEO_DURATION_SECONDS) {
    throw new Error(`Video time range must be between 0 and ${metadata.duration.toFixed(3)} seconds.`)
  }

  const video = document.createElement('video')
  const videoUrl = URL.createObjectURL(file)
  const canvas = document.createElement('canvas')
  canvas.width = metadata.width
  canvas.height = metadata.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('2D canvas context is unavailable.')
  video.preload = 'auto'
  video.muted = true
  video.src = videoUrl
  const frameUrls: string[] = []

  try {
    const loaded = waitForEvent(video, 'loadeddata', signal)
    video.load()
    await loaded
    const frames: ExtractedVideoFrame[] = []
    for (let index = 0; index < frameCount; index += 1) {
      throwIfAborted(signal)
      const time = frameCount === 1 ? startTime : startTime + ((endTime - startTime) * index) / (frameCount - 1)
      const seekTime = Math.min(time, Math.max(0, metadata.duration - 0.001))
      if (Math.abs(video.currentTime - seekTime) >= 0.001) {
        const seeked = waitForEvent(video, 'seeked', signal)
        video.currentTime = seekTime
        await seeked
      }
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const frameUrl = URL.createObjectURL(await canvasToBlob(canvas, signal))
      frameUrls.push(frameUrl)
      const image = await loadImage(frameUrl, signal)
      frames.push({ name: `${file.name.replace(/\.[^.]*$/, '') || 'video'}-${String(index + 1).padStart(3, '0')}.png`, url: frameUrl, width: metadata.width, height: metadata.height, image, sourceName: file.name, mimeType: file.type || 'video/*' })
      options.onProgress?.(index + 1, frameCount)
    }
    return frames
  } catch (error) {
    frameUrls.forEach((url) => URL.revokeObjectURL(url))
    if (error instanceof Error) throw error
    throw new Error('Video frame extraction failed.')
  } finally {
    video.pause()
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(videoUrl)
  }
}

export function revokeVideoFrames(frames: readonly ExtractedVideoFrame[]) {
  frames.forEach((frame) => URL.revokeObjectURL(frame.url))
}
