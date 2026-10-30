import { useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import JSZip from 'jszip'
import './sprite-studio.css'
import { applyAlphaBrush, removeImageBackground } from './backgroundCleanup'
import { hasVisiblePixel, validateExportContract } from './spriteSheetContract'
import { createAnimationSheetDocument, type AnimationSheetDocument, type DocumentLayer } from './animationSheetDocument'
import { SpriteLayerPanel, type SpriteLayerEditorItem } from './SpriteLayerPanel'
import { SpriteStudioToolsPanel, type MaskMode, type PreviewBackgroundOption } from './SpriteStudioToolsPanel'
import { DEFAULT_FRAME_TRANSFORM, normalizeFrameTransform, type FrameTransform, updateFrameTransforms } from './animationTuner'
import { SPRITE_TEMPLATES } from '../../../../moe-avatar/core/src/spriteTemplates'
import { validateSpriteResource, type SpriteValidationResult } from '../../../../moe-avatar/core/src/spriteValidation'
import type { SpriteResource } from '../../../../moe-avatar/core/src/spriteTypes'

gsap.registerPlugin(useGSAP)
import {
  extractVideoFrames,
  MAX_VIDEO_DURATION_SECONDS,
  MAX_VIDEO_FRAMES,
  readVideoMetadata,
} from './videoFrameExtraction'

type FrameAsset = {
  id: string
  name: string
  url: string
  width: number
  height: number
  image: HTMLImageElement
  originalImage?: HTMLImageElement
  mask?: Uint8ClampedArray
  originalAlphaMask?: Uint8ClampedArray
  mimeType?: string
  durationMs: number
  disabled: boolean
  sourceFrameIndex: number
  crop?: { x: number; y: number; width: number; height: number }
}
type AnimationClip = { id: string; label: string; frameIndices: number[]; fps: number; loop: boolean }
type StoredWorkspaceFrame = { name: string; workingDataUrl: string; originalDataUrl: string; maskDataUrl?: string; durationMs: number; disabled: boolean; sourceFrameIndex: number }
type EffectLayer = { id: string; name: string; frames: FrameAsset[]; startFrame: number; endFrame: number; offsetX: number; offsetY: number; scale: number; opacity: number; enabled: boolean }
type StoredEffectLayer = { id: string; name: string; frames: Array<{ name: string; dataUrl: string }>; startFrame: number; endFrame: number; offsetX: number; offsetY: number; scale: number; opacity: number; enabled: boolean }
type StoredWorkspace = { sourceName: string; frames: StoredWorkspaceFrame[]; animations: AnimationClip[]; effectLayers?: StoredEffectLayer[]; frameTransforms?: FrameTransform[]; anchor?: { x: number; y: number }; previewTemplateId?: string; canvas: { width: number; height: number; originX: number; originY: number }; padding: number; fitMode: 'contain' | 'cover'; previewBackground: PreviewBackground }
type RepairStage = 'source' | 'tune' | 'export'
type TransformScope = 'frame' | 'enabled'
type PreviewBackground = PreviewBackgroundOption
type Bounds = { left: number; top: number; right: number; bottom: number }
type Interaction = { kind: 'image' | 'anchor' | 'grid' | 'layer'; layerId?: string; startX: number; startY: number; offsetX: number; offsetY: number; anchorX: number; anchorY: number; gridX: number; gridY: number }

const DEFAULT_TRANSFORM = DEFAULT_FRAME_TRANSFORM
const DEFAULT_FPS = 12
const DEFAULT_PADDING = 24
const PREVIEW_TEMPLATES = Object.values(SPRITE_TEMPLATES).map((template) => ({ ...template, canvas: { width: template.frameLayout.frameWidth, height: template.frameLayout.frameHeight } }))

function slug(value: string, fallback: string) {
  const result = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '')
  return result || fallback
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function isImageFile(file: File) {
  return file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name)
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('image-load-failed'))
    image.src = url
  })
}

function imageToDataUrl(image: HTMLImageElement) {
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth || image.width
  canvas.height = image.naturalHeight || image.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('workspace-canvas-unavailable')
  context.drawImage(image, 0, 0)
  return canvas.toDataURL('image/png')
}

function drawEffectLayers(context: CanvasRenderingContext2D, layers: readonly EffectLayer[], frameIndex: number, originX: number, originY: number) {
  layers.forEach((layer) => {
    if (!layer.enabled || !layer.frames.length || frameIndex < layer.startFrame || frameIndex > layer.endFrame) return
    const layerFrameIndex = layer.frames.length === 1 ? 0 : (frameIndex - layer.startFrame) % layer.frames.length
    const frame = layer.frames[layerFrameIndex]
    if (!frame) return
    const scale = Math.max(0.01, layer.scale / 100)
    context.save()
    context.globalAlpha = Math.max(0, Math.min(1, layer.opacity / 100))
    context.imageSmoothingEnabled = false
    context.drawImage(frame.image, originX - frame.width * scale / 2 + layer.offsetX, originY - frame.height * scale / 2 + layer.offsetY, frame.width * scale, frame.height * scale)
    context.restore()
  })
}

function drawTemplateGuides(context: CanvasRenderingContext2D, templateId: string, canvasWidth: number, canvasHeight: number, anchor: { x: number; y: number }) {
  if (templateId === 'freeform') return
  context.save()
  context.strokeStyle = 'rgba(52, 211, 200, .58)'
  context.setLineDash([7, 5])
  context.beginPath()
  context.moveTo(0, anchor.y + .5)
  context.lineTo(canvasWidth, anchor.y + .5)
  context.moveTo(anchor.x + .5, 0)
  context.lineTo(anchor.x + .5, canvasHeight)
  context.stroke()
  context.restore()
}

function alphaMaskFromCanvas(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('mask-canvas-unavailable')
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
  const mask = new Uint8ClampedArray(canvas.width * canvas.height)
  for (let index = 0; index < mask.length; index += 1) mask[index] = pixels[index * 4 + 3]
  return mask
}

function alphaMaskFromImage(image: HTMLImageElement) {
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth || image.width
  canvas.height = image.naturalHeight || image.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('mask-canvas-unavailable')
  context.drawImage(image, 0, 0)
  return alphaMaskFromCanvas(canvas)
}

function applyMaskToCanvas(canvas: HTMLCanvasElement, image: HTMLImageElement, mask: Uint8ClampedArray) {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('mask-canvas-unavailable')
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0)
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  for (let index = 0; index < mask.length; index += 1) imageData.data[index * 4 + 3] = Math.round(imageData.data[index * 4 + 3] * mask[index] / 255)
  context.putImageData(imageData, 0, 0)
}

function maskToDataUrl(mask: Uint8ClampedArray, width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('mask-canvas-unavailable')
  const imageData = context.createImageData(width, height)
  for (let index = 0; index < mask.length; index += 1) {
    imageData.data[index * 4] = 255
    imageData.data[index * 4 + 1] = 255
    imageData.data[index * 4 + 2] = 255
    imageData.data[index * 4 + 3] = mask[index]
  }
  context.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/png')
}

async function maskFromDataUrl(dataUrl: string) {
  const image = await loadImage(dataUrl)
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth || image.width
  canvas.height = image.naturalHeight || image.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('mask-canvas-unavailable')
  context.drawImage(image, 0, 0)
  return alphaMaskFromCanvas(canvas)
}

function frameFromCanvas(canvas: HTMLCanvasElement, name: string, sourceFrameIndex: number, durationMs = 1000 / DEFAULT_FPS, originalImage?: HTMLImageElement, mask?: Uint8ClampedArray): Promise<FrameAsset> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) { reject(new Error('frame-export-failed')); return }
      const url = URL.createObjectURL(blob)
      try {
        const image = await loadImage(url)
        resolve({ id: `${Date.now()}_${sourceFrameIndex}_${Math.random()}`, name, url, width: canvas.width, height: canvas.height, image, originalImage: originalImage ?? image, mask: mask ? new Uint8ClampedArray(mask) : undefined, mimeType: 'image/png', durationMs, disabled: false, sourceFrameIndex })
      } catch (error) {
        URL.revokeObjectURL(url)
        reject(error)
      }
    }, 'image/png')
  })
}

type JsonRecord = Record<string, unknown>

function parseSheetEntries(raw: unknown) {
  const data = (raw ?? {}) as JsonRecord
  if (Array.isArray(data.frames)) return data.frames.map((value, index: number) => { const entry = value as JsonRecord; return [String(entry.filename || entry.name || `frame_${index + 1}`), entry] as const })
  if (data.frames && typeof data.frames === 'object') return Object.entries(data.frames as JsonRecord).sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))
  throw new Error('JSON 中没有 frames')
}

function cropEntry(value: unknown) {
  const entry = (value ?? {}) as JsonRecord
  const frame = (entry.frame as JsonRecord | undefined) || (entry.crop as JsonRecord | undefined) || entry
  const x = Number(frame?.x ?? frame?.left ?? 0)
  const y = Number(frame?.y ?? frame?.top ?? 0)
  const width = Number(frame?.w ?? frame?.width ?? 0)
  const height = Number(frame?.h ?? frame?.height ?? 0)
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) throw new Error('JSON 中存在无效帧矩形')
  return { x, y, width, height }
}

function createClip(frameCount: number): AnimationClip {
  return { id: 'sequence_1', label: '未命名序列', frameIndices: Array.from({ length: frameCount }, (_, index) => index), fps: DEFAULT_FPS, loop: true }
}

function mergeBounds(left: Bounds | null, right: Bounds | null): Bounds | null {
  if (!right) return left
  if (!left) return right
  return { left: Math.min(left.left, right.left), top: Math.min(left.top, right.top), right: Math.max(left.right, right.right), bottom: Math.max(left.bottom, right.bottom) }
}

function readAlphaBounds(frame: FrameAsset) {
  const canvas = document.createElement('canvas')
  canvas.width = frame.width
  canvas.height = frame.height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null
  context.drawImage(frame.image, 0, 0)
  const pixels = context.getImageData(0, 0, frame.width, frame.height).data
  let bounds: Bounds | null = null
  for (let y = 0; y < frame.height; y += 1) for (let x = 0; x < frame.width; x += 1) {
    if (pixels[(y * frame.width + x) * 4 + 3] < 8) continue
    bounds = mergeBounds(bounds, { left: x, top: y, right: x + 1, bottom: y + 1 })
  }
  return bounds
}

function drawFrame(context: CanvasRenderingContext2D, frame: FrameAsset, transform: FrameTransform, originX: number, originY: number, fit: 'contain' | 'cover' = 'contain', canvasWidth = frame.width, canvasHeight = frame.height, source: CanvasImageSource = frame.image) {
  const imageRatio = frame.width / frame.height
  const canvasRatio = canvasWidth / canvasHeight
  const baseScale = fit === 'contain'
    ? (imageRatio > canvasRatio ? canvasWidth / frame.width : canvasHeight / frame.height)
    : (imageRatio > canvasRatio ? canvasHeight / frame.height : canvasWidth / frame.width)
  const normalized = normalizeFrameTransform(transform)
  const scaleX = baseScale * normalized.scale * normalized.scaleX / 10000
  const scaleY = baseScale * normalized.scale * normalized.scaleY / 10000
  context.imageSmoothingEnabled = false
  context.save()
  context.translate(originX + normalized.offsetX, originY + normalized.offsetY)
  context.rotate(normalized.rotation * Math.PI / 180)
  context.drawImage(source, -frame.width * scaleX / 2, -frame.height * scaleY / 2, frame.width * scaleX, frame.height * scaleY)
  context.restore()
}

function drawPreviewBackground(context: CanvasRenderingContext2D, width: number, height: number, background: PreviewBackground) {
  if (background === 'checker') {
    const size = 16
    context.fillStyle = '#f5f4f8'
    context.fillRect(0, 0, width, height)
    context.fillStyle = '#e5e4ea'
    for (let y = 0; y < height; y += size) for (let x = 0; x < width; x += size) if ((x / size + y / size) % 2 === 0) context.fillRect(x, y, size, size)
    return
  }
  const colors: Record<Exclude<PreviewBackground, 'checker'>, string> = { light: '#f4f3f8', dark: '#18202b', green: '#28463b', magenta: '#4b263e' }
  context.fillStyle = colors[background]
  context.fillRect(0, 0, width, height)
}

function calculateCanvasSize(frames: FrameAsset[], transforms: FrameTransform[], padding: number) {
  let bounds: Bounds | null = null
  for (const [index, frame] of frames.entries()) {
    const raw = readAlphaBounds(frame)
    if (!raw) continue
    const transform = normalizeFrameTransform(transforms[index])
    const scaleX = transform.scale * transform.scaleX / 10000
    const scaleY = transform.scale * transform.scaleY / 10000
    const radians = transform.rotation * Math.PI / 180
    const cosine = Math.cos(radians)
    const sine = Math.sin(radians)
    const corners = [
      { x: (raw.left - frame.width / 2) * scaleX, y: (raw.top - frame.height / 2) * scaleY },
      { x: (raw.right - frame.width / 2) * scaleX, y: (raw.top - frame.height / 2) * scaleY },
      { x: (raw.left - frame.width / 2) * scaleX, y: (raw.bottom - frame.height / 2) * scaleY },
      { x: (raw.right - frame.width / 2) * scaleX, y: (raw.bottom - frame.height / 2) * scaleY },
    ].map(({ x, y }) => ({ x: x * cosine - y * sine + transform.offsetX, y: x * sine + y * cosine + transform.offsetY }))
    bounds = mergeBounds(bounds, { left: Math.min(...corners.map((point) => point.x)), top: Math.min(...corners.map((point) => point.y)), right: Math.max(...corners.map((point) => point.x)), bottom: Math.max(...corners.map((point) => point.y)) })
  }
  if (!bounds) return { width: 256, height: 256, originX: 128, originY: 128 }
  return { width: Math.max(1, Math.ceil(bounds.right - bounds.left + padding * 2)), height: Math.max(1, Math.ceil(bounds.bottom - bounds.top + padding * 2)), originX: Math.ceil(-bounds.left + padding), originY: Math.ceil(-bounds.top + padding) }
}

export function SpriteRepairPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const studioRef = useRef<HTMLElement>(null)
  const interactionRef = useRef<Interaction | null>(null)
  const maskEditRef = useRef<{ frameIndex: number; frameId: string; sessionId: number; canvas: HTMLCanvasElement; mask: Uint8ClampedArray } | null>(null)
  const maskSessionRef = useRef(0)
  const frameUrlsRef = useRef(new Set<string>())
  const [frames, setFrames] = useState<FrameAsset[]>([])
  const [frameTransforms, setFrameTransforms] = useState<FrameTransform[]>([])
  const [clips, setClips] = useState<AnimationClip[]>([])
  const [activeClipId, setActiveClipId] = useState('sequence_1')
  const [effectLayers, setEffectLayers] = useState<EffectLayer[]>([])
  const [selectedEffectLayerId, setSelectedEffectLayerId] = useState<string | null>(null)
  const [activeFrame, setActiveFrame] = useState(0)
  const [previewFrame, setPreviewFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackPosition, setPlaybackPosition] = useState(0)
  const [stage, setStage] = useState<RepairStage>('source')
  const [dragFrameIndex, setDragFrameIndex] = useState<number | null>(null)
  const [sheetSourceName, setSheetSourceName] = useState('sprite')
  const [gridColumns, setGridColumns] = useState(4)
  const [gridRows, setGridRows] = useState(4)
  const [gridCellWidth, setGridCellWidth] = useState(64)
  const [gridCellHeight, setGridCellHeight] = useState(64)
  const [gridGapX, setGridGapX] = useState(0)
  const [gridGapY, setGridGapY] = useState(0)
  const [gridOffsetX, setGridOffsetX] = useState(0)
  const [gridOffsetY, setGridOffsetY] = useState(0)
  const [sheetFile, setSheetFile] = useState<File | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoDuration, setVideoDuration] = useState<number | null>(null)
  const [videoStart, setVideoStart] = useState(0)
  const [videoEnd, setVideoEnd] = useState(3)
  const [videoFps, setVideoFps] = useState(DEFAULT_FPS)
  const [extracting, setExtracting] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [preCleanupFrames, setPreCleanupFrames] = useState<FrameAsset[] | null>(null)
  const [padding, setPadding] = useState(DEFAULT_PADDING)
  const [canvasSize, setCanvasSize] = useState({ width: 256, height: 256, originX: 128, originY: 128 })
  const [measuring, setMeasuring] = useState(false)
  const [message, setMessage] = useState('等待导入 PNG 序列或图集')
  const [showHelp, setShowHelp] = useState(false)
  const [previewTemplateId, setPreviewTemplateId] = useState('freeform')
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain')
  const [previewBackground, setPreviewBackground] = useState<PreviewBackground>('checker')
  const [maskMode, setMaskMode] = useState<'off' | 'erase' | 'restore'>('off')
  const [maskBrushSize, setMaskBrushSize] = useState(4)
  const [maskRevision, setMaskRevision] = useState(0)
  const [anchor, setAnchor] = useState({ x: 128, y: 128 })
  const [transformScope, setTransformScope] = useState<TransformScope>('frame')

  const source = frames[0]
  const sequence = clips.find((clip) => clip.id === activeClipId) ?? clips[0] ?? createClip(frames.length)
  const playableFrames = sequence.frameIndices.filter((index) => Boolean(frames[index]) && !frames[index]?.disabled)
  const playableKey = playableFrames.join(',')
  const displayFrame = isPlaying ? playableFrames[playbackPosition] ?? activeFrame : activeFrame
  const currentFrame = frames[displayFrame]
  const transform = normalizeFrameTransform(frameTransforms[displayFrame])
  const sourceCapacity = MAX_VIDEO_FRAMES
  const videoLimit = videoDuration === null ? MAX_VIDEO_DURATION_SECONDS : Math.min(MAX_VIDEO_DURATION_SECONDS, videoDuration)
  const effectiveVideoEnd = Math.min(Math.max(videoEnd, videoStart), videoLimit)
  const requestedVideoFrames = Math.min(sourceCapacity, Math.max(1, Math.floor((effectiveVideoEnd - videoStart) * videoFps) + 1))
  const documentLayers = useMemo<DocumentLayer[]>(() => effectLayers.map((layer) => ({ id: layer.id, label: layer.name, frameCount: layer.frames.length, startFrame: layer.startFrame, endFrame: layer.endFrame, offsetX: layer.offsetX, offsetY: layer.offsetY, scale: layer.scale, opacity: layer.opacity, enabled: layer.enabled })), [effectLayers])
  const documentModel = useMemo<AnimationSheetDocument>(() => createAnimationSheetDocument({ sourceName: sheetSourceName, frames: frames.map((frame, index) => ({ index, sourceFrameIndex: frame.sourceFrameIndex, durationMs: frame.durationMs, disabled: frame.disabled, transform: frameTransforms[index] ?? DEFAULT_TRANSFORM })), animations: clips.map((clip) => ({ ...clip, frameIndices: clip.frameIndices.filter((index) => Boolean(frames[index]) && !frames[index]?.disabled) })), layers: documentLayers, canvas: canvasSize, padding, fitMode, previewBackground }), [canvasSize, clips, documentLayers, fitMode, frameTransforms, frames, padding, previewBackground, sheetSourceName])

  const enabledFrameCount = playableFrames.length

  const manifest = useMemo(() => ({
    formatVersion: 'sprite-animation-v1',
    schemaVersion: 1,
    kind: 'sprite_sheet',
    image: 'spritesheet.png',
    format: 'RGBA8888',
    canvas: { width: canvasSize.width * Math.max(1, enabledFrameCount), height: canvasSize.height },
    anchor: { x: canvasSize.originX, y: canvasSize.originY },
    frameLayout: { mode: 'animation_grid', frameWidth: canvasSize.width, frameHeight: canvasSize.height, columns: Math.max(1, enabledFrameCount), rows: 1 },
    meta: { app: 'Moe Animation Sheet Workbench', version: 1, documentVersion: documentModel.version, size: { w: canvasSize.width, h: canvasSize.height }, canvas: canvasSize },
    animations: enabledFrameCount ? [{ id: sequence.id, label: sequence.label, row: 0, fps: sequence.fps, loop: sequence.loop, frameCount: enabledFrameCount }] : [],
    layers: documentLayers,
    frames: playableFrames.map((index, position) => ({ animation: sequence.id, outputFrameIndex: position, sourceFrameIndex: frames[index]?.sourceFrameIndex ?? index, durationMs: Math.round(frames[index]?.durationMs ?? 1000 / sequence.fps), disabled: false })),
  }), [canvasSize, documentLayers, documentModel, enabledFrameCount, frames, playableFrames, sequence])
  const spriteResource = useMemo<SpriteResource>(() => ({
    id: slug(sheetSourceName, 'draft-sprite'),
    kind: 'character',
    templateId: previewTemplateId === 'freeform' ? undefined : previewTemplateId,
    status: 'draft',
    sheet: 'spritesheet.png',
    canvas: { width: canvasSize.width * Math.max(1, enabledFrameCount), height: canvasSize.height },
    anchor,
    animations: enabledFrameCount ? [{ id: sequence.id, frameCount: enabledFrameCount, frameRate: sequence.fps, loop: sequence.loop }] : [],
    frameLayout: { mode: 'animation_strip', frameWidth: canvasSize.width, frameHeight: canvasSize.height, columns: Math.max(1, enabledFrameCount), rows: 1 },
    source: { path: sheetSourceName, mimeType: source?.mimeType, width: source?.width, height: source?.height },
    generation: { mode: videoFile ? 'video_extracted' : 'source_frames' },
    frameAdjustments: playableFrames.map((index, frame) => {
      const adjustment = normalizeFrameTransform(frameTransforms[index])
      return { frame, offsetX: adjustment.offsetX, offsetY: adjustment.offsetY, scale: adjustment.scale / 100, scaleX: adjustment.scaleX / 100, scaleY: adjustment.scaleY / 100, rotation: adjustment.rotation }
    }),
  }), [anchor, canvasSize, enabledFrameCount, frameTransforms, playableFrames, previewTemplateId, sequence, sheetSourceName, source, videoFile])
  const validation: SpriteValidationResult = useMemo(() => validateSpriteResource(spriteResource), [spriteResource])

  function track(url: string) { frameUrlsRef.current.add(url); return url }
  function release(items: readonly FrameAsset[]) { items.forEach((item) => { if (frameUrlsRef.current.delete(item.url)) URL.revokeObjectURL(item.url) }) }
  function releaseEffectLayers(items: readonly EffectLayer[]) { items.forEach((layer) => release(layer.frames)) }
  useEffect(() => () => { frameUrlsRef.current.forEach((url) => URL.revokeObjectURL(url)) }, [])

  function replaceFrames(next: FrameAsset[], name: string, importedClips?: AnimationClip[]) {
    release(frames)
    if (preCleanupFrames) release(preCleanupFrames)
    releaseEffectLayers(effectLayers)
    setFrames(next)
    setEffectLayers([])
    setSelectedEffectLayerId(null)
    setPreCleanupFrames(null)
    setFrameTransforms(next.map(() => ({ ...DEFAULT_TRANSFORM })))
    const importedClip = importedClips?.[0]
    const nextClip = importedClip ? { ...importedClip, frameIndices: Array.from({ length: next.length }, (_, index) => index) } : createClip(next.length)
    const nextClips = [nextClip]
    setClips(nextClips)
    setActiveClipId(nextClip.id)
    setActiveFrame(0)
    setPreviewFrame(0)
    setPlaybackPosition(0)
    setIsPlaying(false)
    setSheetSourceName(name.replace(/\.[^.]+$/, '') || 'sprite')
    setStage(next.length > 1 ? 'tune' : 'source')
  }

  async function saveWorkspace() {
    if (!frames.length) { setMessage('请先导入帧，再保存工作区'); return }
    try {
      const stored: StoredWorkspace = { sourceName: sheetSourceName, frames: frames.map((frame) => ({ name: frame.name, workingDataUrl: imageToDataUrl(frame.image), originalDataUrl: imageToDataUrl(frame.originalImage ?? frame.image), maskDataUrl: frame.mask ? maskToDataUrl(frame.mask, frame.width, frame.height) : undefined, durationMs: frame.durationMs, disabled: frame.disabled, sourceFrameIndex: frame.sourceFrameIndex })), animations: clips, effectLayers: effectLayers.map((layer) => ({ id: layer.id, name: layer.name, frames: layer.frames.map((frame) => ({ name: frame.name, dataUrl: imageToDataUrl(frame.image) })), startFrame: layer.startFrame, endFrame: layer.endFrame, offsetX: layer.offsetX, offsetY: layer.offsetY, scale: layer.scale, opacity: layer.opacity, enabled: layer.enabled })), frameTransforms, anchor, previewTemplateId, canvas: canvasSize, padding, fitMode, previewBackground }
      localStorage.setItem('moe-animation-sheet-workspace-v1', JSON.stringify(stored))
      setMessage('工作区已保存到本机浏览器')
    } catch { setMessage('工作区保存失败，可能是浏览器存储空间不足') }
  }

  async function restoreWorkspace() {
    const raw = localStorage.getItem('moe-animation-sheet-workspace-v1')
    if (!raw) { setMessage('当前浏览器没有保存的工作区'); return }
    try {
      const stored = JSON.parse(raw) as StoredWorkspace
      const next = await Promise.all(stored.frames.map(async (value, index) => { const image = await loadImage(value.workingDataUrl); const originalImage = await loadImage(value.originalDataUrl); const mask = value.maskDataUrl ? await maskFromDataUrl(value.maskDataUrl) : undefined; return { id: `restored_${Date.now()}_${index}`, name: value.name, url: value.workingDataUrl, width: image.naturalWidth || image.width, height: image.naturalHeight || image.height, image, originalImage, mask, mimeType: 'image/png', durationMs: value.durationMs, disabled: value.disabled, sourceFrameIndex: value.sourceFrameIndex } }))
      const restoredLayers = await Promise.all((stored.effectLayers ?? []).map(async (layer) => ({ ...layer, frames: await Promise.all(layer.frames.map(async (frame, index) => { const image = await loadImage(frame.dataUrl); return { id: `restored_layer_${Date.now()}_${index}`, name: frame.name, url: frame.dataUrl, width: image.naturalWidth || image.width, height: image.naturalHeight || image.height, image, originalImage: image, mimeType: 'image/png', durationMs: 1000 / DEFAULT_FPS, disabled: false, sourceFrameIndex: index } })) })))
      replaceFrames(next, stored.sourceName, stored.animations)
      setActiveClipId(stored.animations[0]?.id ?? 'sequence_1')
      setEffectLayers(restoredLayers)
      setCanvasSize(stored.canvas); setFrameTransforms(stored.frameTransforms?.slice(0, next.length).map((value) => normalizeFrameTransform(value)) ?? next.map(() => ({ ...DEFAULT_TRANSFORM }))); setAnchor(stored.anchor ?? { x: stored.canvas.originX, y: stored.canvas.originY }); setPreviewTemplateId(stored.previewTemplateId ?? 'freeform'); setPadding(stored.padding); setFitMode(stored.fitMode); setPreviewBackground(stored.previewBackground ?? 'checker'); setActiveFrame(0); setPreviewFrame(0); setMessage(`已恢复工作区，共 ${next.length} 帧`)
    } catch { setMessage('工作区恢复失败，保存数据可能已损坏') }
  }

  async function loadFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!selected.length || selected.some((file) => !isImageFile(file))) { setMessage('只支持 PNG、JPG、JPEG 或 WebP 图片'); return }
    try {
      const next = await Promise.all(selected.slice(0, sourceCapacity).map(async (file, index) => {
        const url = track(URL.createObjectURL(file))
        const image = await loadImage(url)
        return { id: `${Date.now()}_${index}`, name: file.name, url, width: image.width, height: image.height, image, mimeType: file.type, durationMs: 1000 / DEFAULT_FPS, disabled: false, sourceFrameIndex: index }
      }))
      replaceFrames(next, selected[0].name)
      if (next.length === 1) initializeGrid(next[0].width, next[0].height)
      setSheetFile(null)
      setMessage(`已载入 ${next.length} 个原始帧；先校准，再导出统一画布`)
    } catch { setMessage('图片载入失败') }
  }

  async function loadEffectLayer(selected: File[]) {
    if (!selected.length || selected.some((file) => !isImageFile(file))) { setMessage('效果层只支持 PNG、JPG、JPEG 或 WebP 图片'); return }
    try {
      const layerFrames = await Promise.all(selected.slice(0, sourceCapacity).map(async (file, index) => {
        const url = track(URL.createObjectURL(file))
        const image = await loadImage(url)
        return { id: `layer_${Date.now()}_${index}`, name: file.name, url, width: image.width, height: image.height, image, originalImage: image, mimeType: file.type, durationMs: 1000 / DEFAULT_FPS, disabled: false, sourceFrameIndex: index }
      }))
      const layer: EffectLayer = { id: `effect_${Date.now()}`, name: selected.length > 1 ? '攻击效果序列' : selected[0].name.replace(/\.[^.]+$/, ''), frames: layerFrames, startFrame: 0, endFrame: Math.max(0, frames.length - 1), offsetX: 0, offsetY: 0, scale: 100, opacity: 100, enabled: true }
      setEffectLayers((current) => [...current, layer])
      setSelectedEffectLayerId(layer.id)
      setMessage(`已添加效果层：${layer.name}，可统一调整位置与透明度`)
    } catch { setMessage('效果层图片载入失败') }
  }

  function updateEffectLayer(id: string, patch: Partial<EffectLayer>) {
    setEffectLayers((current) => current.map((layer) => layer.id === id ? { ...layer, ...patch } : layer))
  }

  function deleteEffectLayer(id: string) {
    const layer = effectLayers.find((item) => item.id === id)
    if (!layer) return
    release(layer.frames)
    setEffectLayers((current) => current.filter((item) => item.id !== id))
    setSelectedEffectLayerId((current) => current === id ? null : current)
  }

  async function importSheet(event: ChangeEvent<HTMLInputElement>) {
    const jsonFile = event.target.files?.[0]
    event.target.value = ''
    if (!jsonFile || !sheetFile) { setMessage('请先选择 Sheet PNG，再选择 JSON 描述文件'); return }
    try {
      const sourceUrl = track(URL.createObjectURL(sheetFile))
      const sourceImage = await loadImage(sourceUrl)
      const raw = JSON.parse(await jsonFile.text().then((text) => text.replace(/^\uFEFF/, '')))
      const entries = parseSheetEntries(raw)
      const next: FrameAsset[] = []
      const importedFrameIndices = new Map<string, number>()
      for (const [name, value] of entries.slice(0, sourceCapacity)) {
        const entry = value as JsonRecord
        const crop = cropEntry(value)
        const canvas = document.createElement('canvas')
        canvas.width = crop.width
        canvas.height = crop.height
        const context = canvas.getContext('2d')
        if (!context) throw new Error('canvas-context-failed')
        context.drawImage(sourceImage, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height)
        const metadata = (raw.meta as JsonRecord | undefined) ?? {}
        const frame = await frameFromCanvas(canvas, name, next.length, Number(entry.durationMs ?? entry.duration ?? 1000 / Number(metadata.frameRate || DEFAULT_FPS)))
        track(frame.url)
        frame.crop = crop
        importedFrameIndices.set(name, next.length)
        next.push(frame)
      }
      URL.revokeObjectURL(sourceUrl)
      frameUrlsRef.current.delete(sourceUrl)
      const importedClips: AnimationClip[] | undefined = Array.isArray(raw.animations)
        ? (raw.animations as unknown[]).map((value: unknown, row: number) => {
          const animation = value as JsonRecord
          const animationId = String(animation.id || `sequence_${row + 1}`)
          const frameIndices = entries
            .filter(([, entry]) => String((entry as JsonRecord).animation || '') === animationId)
            .sort(([, left], [, right]) => Number((left as JsonRecord).outputFrameIndex ?? 0) - Number((right as JsonRecord).outputFrameIndex ?? 0))
            .map(([name]) => importedFrameIndices.get(name))
            .filter((index): index is number => index !== undefined)
          return {
            id: animationId,
            label: String(animation.label || animationId),
            frameIndices,
            fps: Number(animation.fps || animation.frameRate || DEFAULT_FPS),
            loop: animation.loop !== false,
          }
        }).filter((clip) => clip.frameIndices.length > 0)
        : undefined
      replaceFrames(next, sheetFile.name, importedClips)
      setMessage(`已导入 ${next.length} 个图集帧，保留 JSON 中的裁剪区域和帧时长`)
    } catch (error) { setMessage(error instanceof Error ? `图集导入失败：${error.message}` : '图集导入失败') }
  }

  async function handleVideo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const metadata = await readVideoMetadata(file)
      setVideoFile(file)
      setVideoDuration(metadata.duration)
      setVideoStart(0)
      setVideoEnd(Math.min(3, metadata.duration, (sourceCapacity - 1) / videoFps))
      setMessage(`已选择视频 ${metadata.width} × ${metadata.height}px`)
    } catch { setMessage('视频读取失败') }
  }

  async function extractVideo() {
    if (!videoFile || extracting) return
    setExtracting(true)
    try {
      const next = await extractVideoFrames(videoFile, { startTime: videoStart, endTime: effectiveVideoEnd, frameCount: requestedVideoFrames, onProgress: () => {} })
      next.forEach((frame) => track(frame.url))
      replaceFrames(next.map((frame, index) => ({ ...frame, id: `${Date.now()}_${index}`, durationMs: 1000 / videoFps, disabled: false, sourceFrameIndex: index })), videoFile.name)
      setMessage(`已提取 ${next.length} 帧；请在帧条上逐帧调校`)
    } catch { setMessage('视频帧提取失败') } finally { setExtracting(false) }
  }

  function initializeGrid(width: number, height: number, columns = gridColumns, rows = gridRows) {
    setGridCellWidth(Math.max(1, Math.floor(width / Math.max(1, columns))))
    setGridCellHeight(Math.max(1, Math.floor(height / Math.max(1, rows))))
  }

  async function extractGrid() {
    if (!source) return
    const requiredWidth = gridOffsetX + gridColumns * gridCellWidth + (gridColumns - 1) * gridGapX
    const requiredHeight = gridOffsetY + gridRows * gridCellHeight + (gridRows - 1) * gridGapY
    if (requiredWidth > source.width || requiredHeight > source.height) { setMessage('网格超出原图范围'); return }
    const next: FrameAsset[] = []
    for (let row = 0; row < gridRows; row += 1) for (let column = 0; column < gridColumns; column += 1) {
      const canvas = document.createElement('canvas')
      canvas.width = gridCellWidth
      canvas.height = gridCellHeight
      const context = canvas.getContext('2d')
      if (!context) return
      context.imageSmoothingEnabled = false
      context.drawImage(source.image, gridOffsetX + column * (gridCellWidth + gridGapX), gridOffsetY + row * (gridCellHeight + gridGapY), gridCellWidth, gridCellHeight, 0, 0, gridCellWidth, gridCellHeight)
      const frame = await frameFromCanvas(canvas, `${sheetSourceName}_r${row + 1}_c${column + 1}.png`, next.length)
      track(frame.url)
      next.push(frame)
    }
    replaceFrames(next, sheetSourceName)
    setMessage(`已切出 ${next.length} 个帧并进入统一帧池`)
  }

  function reorderFrames(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= frames.length || to >= frames.length) return
    const remap = (index: number) => index === from ? to : from < to && index > from && index <= to ? index - 1 : from > to && index >= to && index < from ? index + 1 : index
    setFrames((current) => { const next = [...current]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next })
    setFrameTransforms((current) => { const next = [...current]; const [item] = next.splice(from, 1); next.splice(to, 0, item ?? DEFAULT_TRANSFORM); return next })
    setClips((current) => current.map((clip) => ({ ...clip, frameIndices: clip.frameIndices.map(remap) })))
    setActiveFrame(remap(activeFrame)); setPreviewFrame(remap(previewFrame))
  }
  function deleteFrame() {
    if (!frames[activeFrame]) return
    const deleted = activeFrame
    const remaining = frames.filter((_, index) => index !== deleted)
    if (!remaining.some((frame) => frame.url === frames[deleted].url)) release([frames[deleted]])
    setFrames(remaining)
    setFrameTransforms((current) => current.filter((_, index) => index !== deleted))
    setClips((current) => current.map((clip) => ({ ...clip, frameIndices: clip.frameIndices.filter((index) => index !== deleted).map((index) => index > deleted ? index - 1 : index) })))
    setActiveFrame((current) => Math.min(current, Math.max(0, frames.length - 2)))
    setPreviewFrame((current) => Math.min(current, Math.max(0, frames.length - 2)))
  }
  function updateTransform(key: keyof FrameTransform, value: number) {
    const targets = transformScope === 'enabled' ? playableFrames : [activeFrame]
    setFrameTransforms((current) => updateFrameTransforms(current, frames.length, targets, key, value))
  }
  function resetFrameTransforms() {
    const targets = new Set(transformScope === 'enabled' ? playableFrames : [activeFrame])
    setFrameTransforms((current) => current.map((value, index) => targets.has(index) ? { ...DEFAULT_TRANSFORM } : normalizeFrameTransform(value)))
  }
  function updateActiveClip(patch: Partial<AnimationClip>) {
    setClips((current) => current.map((clip) => clip.id === sequence.id ? { ...clip, ...patch } : clip))
  }
  function addClip() {
    const usedIds = new Set(clips.map((clip) => clip.id))
    let number = clips.length + 1
    while (usedIds.has(`sequence_${number}`)) number += 1
    const next = { id: `sequence_${number}`, label: `新动作 ${number}`, frameIndices: [], fps: DEFAULT_FPS, loop: true }
    setClips((current) => [...current, next])
    setActiveClipId(next.id)
    setIsPlaying(false)
  }
  function removeActiveClip() {
    if (clips.length <= 1) return
    const next = clips.filter((clip) => clip.id !== sequence.id)
    setClips(next)
    setActiveClipId(next[0]?.id ?? 'sequence_1')
    setIsPlaying(false)
  }
  function toggleFrameInActiveClip(frameIndex: number) {
    const frameIndices = sequence.frameIndices.includes(frameIndex)
      ? sequence.frameIndices.filter((index) => index !== frameIndex)
      : [...sequence.frameIndices, frameIndex]
    updateActiveClip({ frameIndices })
  }
  function moveClipFrame(position: number, direction: -1 | 1) {
    const target = position + direction
    if (target < 0 || target >= sequence.frameIndices.length) return
    const frameIndices = [...sequence.frameIndices]
    const [frameIndex] = frameIndices.splice(position, 1)
    frameIndices.splice(target, 0, frameIndex)
    updateActiveClip({ frameIndices })
  }
  function updateFrame(patch: Partial<FrameAsset>) { setFrames((current) => current.map((frame, index) => index === activeFrame ? { ...frame, ...patch } : frame)) }

  async function cleanupBackground() {
    if (!frames.length || cleaning) return
    setCleaning(true)
    try {
      const next = await Promise.all(frames.map(async (frame) => { const canvas = removeImageBackground(frame.image, { colorDistance: 36, speckleSize: 256 }); const mask = alphaMaskFromCanvas(canvas); const cleaned = await frameFromCanvas(canvas, frame.name, frame.sourceFrameIndex, frame.durationMs, frame.originalImage ?? frame.image, mask); cleaned.disabled = frame.disabled; track(cleaned.url); return cleaned }))
      setPreCleanupFrames(frames); next.forEach((frame) => track(frame.url)); setFrames(next); setMessage('已清理背景；请检查发丝和半透明边缘')
    } catch { setMessage('背景清理失败') } finally { setCleaning(false) }
  }
  function restoreCleanup() { if (!preCleanupFrames) return; release(frames); setFrames(preCleanupFrames); setPreCleanupFrames(null) }

  function measureCanvas() {
    if (!frames.length || measuring) return
    setMeasuring(true)
    const next = calculateCanvasSize(frames, frameTransforms, padding)
    setCanvasSize(next); setAnchor({ x: next.originX, y: next.originY }); setMeasuring(false); setMessage(`统一画布：${next.width} × ${next.height}px，所有动画共享同一原点`)
  }

  function selectPreviewTemplate(value: string) {
    setPreviewTemplateId(value)
    if (value === 'freeform') return
    const template = PREVIEW_TEMPLATES.find((item) => item.id === value)
    if (!template) return
    setCanvasSize({ width: template.canvas.width, height: template.canvas.height, originX: template.anchor.x, originY: template.anchor.y })
    setAnchor(template.anchor)
    setMessage(`已切换 ${template.label} 模板；统一画布、锚点与导出将保持一致`)
  }

  function resetPlacement() {
    const targets = transformScope === 'enabled' ? new Set(playableFrames) : new Set([activeFrame])
    setFrameTransforms((current) => current.map((value, index) => targets.has(index) ? { ...DEFAULT_TRANSFORM } : normalizeFrameTransform(value)))
    setAnchor({ x: canvasSize.originX, y: canvasSize.originY })
    setFitMode('contain')
  }

  async function exportSheet(mode: 'zip' | 'png' | 'json' = 'zip') {
    if (!playableFrames.length) { setMessage('请先导入可导出的序列帧'); return }
    const measuredCanvasSize = calculateCanvasSize(frames, frameTransforms, padding)
    const selectedCanvasSize = previewTemplateId === 'freeform' ? measuredCanvasSize : canvasSize
    const exportCanvasSize = { ...selectedCanvasSize, originX: Math.max(0, Math.min(selectedCanvasSize.width, anchor.x)), originY: Math.max(0, Math.min(selectedCanvasSize.height, anchor.y)) }
    setCanvasSize(exportCanvasSize)
    const columns = playableFrames.length
    const rows = 1
    const canvas = document.createElement('canvas')
    canvas.width = exportCanvasSize.width * columns
    canvas.height = exportCanvasSize.height * rows
    if (canvas.width > 16384 || canvas.height > 16384) { setMessage('Sheet 尺寸过大，请减少列数或透明边距'); return }
    const context = canvas.getContext('2d')
    if (!context) return
    const outputFrames: Record<string, JsonRecord> = {}
    let visibleFrameCount = 0
    for (const [column, index] of playableFrames.entries()) {
      const frame = frames[index]
      if (!frame) continue
      context.save()
      context.translate(column * exportCanvasSize.width, 0)
      drawFrame(context, frame, frameTransforms[index] ?? DEFAULT_TRANSFORM, exportCanvasSize.originX, exportCanvasSize.originY, fitMode, exportCanvasSize.width, exportCanvasSize.height)
      drawEffectLayers(context, effectLayers, index, exportCanvasSize.originX, exportCanvasSize.originY)
      context.restore()
      if (hasVisiblePixel(context, exportCanvasSize.width, exportCanvasSize.height, column * exportCanvasSize.width, 0)) visibleFrameCount += 1
      const filename = `${sequence.id}_${String(column + 1).padStart(4, '0')}.png`
      outputFrames[filename] = { frame: { x: column * exportCanvasSize.width, y: 0, w: exportCanvasSize.width, h: exportCanvasSize.height }, duration: Math.round(frame.durationMs || 1000 / sequence.fps), sourceFrameIndex: frame.sourceFrameIndex, animation: sequence.id, outputFrameIndex: column }
    }
    const contractIssues = validateExportContract({ width: canvas.width, height: canvas.height, frameWidth: exportCanvasSize.width, frameHeight: exportCanvasSize.height, columns, rows, frameCount: Object.keys(outputFrames).length, expectedFrameCount: playableFrames.length, visibleFrameCount, expectedVisibleFrameCount: playableFrames.length })
    if (contractIssues.length || !hasVisiblePixel(context, canvas.width, canvas.height)) { setMessage(contractIssues[0]?.message ?? '导出结果为空，请检查透明度和帧内容'); return }
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) { setMessage('PNG 导出失败'); return }
    const exportedManifest = {
      ...manifest,
      canvas: { width: canvas.width, height: canvas.height },
      anchor: { x: exportCanvasSize.originX, y: exportCanvasSize.originY },
      frameLayout: { mode: 'animation_grid', frameWidth: exportCanvasSize.width, frameHeight: exportCanvasSize.height, columns, rows },
      meta: { ...manifest.meta, size: { w: canvas.width, h: canvas.height }, canvas: exportCanvasSize },
      animations: [{ id: sequence.id, label: sequence.label, row: 0, fps: sequence.fps, loop: sequence.loop, frameCount: playableFrames.length }],
      frames: outputFrames,
    }
    const baseName = slug(sheetSourceName, 'sprite')
    if (mode === 'png') {
      downloadBlob(blob, `${baseName}_spritesheet.png`)
      setMessage(`PNG export complete: ${Object.keys(outputFrames).length} frames`)
      return
    }
    const manifestBlob = new Blob([JSON.stringify(exportedManifest, null, 2)], { type: 'application/json' })
    if (mode === 'json') {
      downloadBlob(manifestBlob, `${baseName}_spritesheet.json`)
      setMessage('JSON export complete')
      return
    }
    const zip = new JSZip()
    zip.file('spritesheet.png', blob)
    zip.file('spritesheet.json', manifestBlob)
    const result = await zip.generateAsync({ type: 'blob' })
    downloadBlob(result, `${baseName}_sheet_package.zip`)
    setMessage(`Complete package exported: ${Object.keys(outputFrames).length} frames`)
  }

  useEffect(() => { const indices = playableKey ? playableKey.split(',').map(Number) : []; if (!isPlaying || indices.length < 2) return; const timer = window.setInterval(() => setPlaybackPosition((current) => { const next = (current + 1) % indices.length; setPreviewFrame(indices[next]); return next }), Math.max(30, Math.round(1000 / (sequence.fps || DEFAULT_FPS)))); return () => window.clearInterval(timer) }, [isPlaying, playableKey, sequence.fps])
  useGSAP(() => {
    const intro = gsap.timeline({ defaults: { duration: 0.42, ease: 'power2.out' } })
    intro.fromTo('.sprite-studio-head', { y: 12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, clearProps: 'transform,opacity,visibility' })
      .fromTo('.sprite-sidebar > .sprite-collapsible', { x: -12, autoAlpha: 0 }, { x: 0, autoAlpha: 1, clearProps: 'transform,opacity,visibility', stagger: 0.05 }, '<0.1')
      .fromTo('.sprite-workbench > *', { y: 12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, clearProps: 'transform,opacity,visibility', stagger: 0.06 }, '<0.08')
  }, { scope: studioRef, dependencies: [] })
  useGSAP(() => {
    gsap.fromTo('.sprite-frame', { y: 10, scale: 0.96, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 0.3, ease: 'power2.out', stagger: 0.025, clearProps: 'transform,opacity,visibility' })
  }, { scope: studioRef, dependencies: [frames.length], revertOnUpdate: true })
  useGSAP(() => {
    const media = gsap.matchMedia()
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const timeline = gsap.timeline({ defaults: { duration: 0.28, ease: 'power2.out' } })
      timeline.fromTo('.sprite-workflow-nav button.active', { scale: 0.96, autoAlpha: 0.6 }, { scale: 1, autoAlpha: 1, clearProps: 'transform,opacity,visibility' })
        .fromTo('.sprite-animation-row button', { y: 6, autoAlpha: 0 }, { y: 0, autoAlpha: 1, clearProps: 'transform,opacity,visibility', stagger: 0.025 }, '<0.04')
        .fromTo('.sprite-message', { y: 4, autoAlpha: 0 }, { y: 0, autoAlpha: 1, clearProps: 'transform,opacity,visibility' }, '<0.06')
    })
    return () => media.revert()
  }, { scope: studioRef, dependencies: [stage, message], revertOnUpdate: true })
  useEffect(() => { const canvas = canvasRef.current; if (!canvas || !currentFrame) return; const isSheetPreview = frames.length === 1; canvas.width = isSheetPreview ? currentFrame.width : canvasSize.width; canvas.height = isSheetPreview ? currentFrame.height : canvasSize.height; const context = canvas.getContext('2d'); if (!context) return; context.clearRect(0, 0, canvas.width, canvas.height); context.fillStyle = '#f4f3f8'; context.fillRect(0, 0, canvas.width, canvas.height); if (isSheetPreview) { context.drawImage(currentFrame.image, 0, 0); context.lineWidth = Math.max(1, Math.round(Math.min(currentFrame.width, currentFrame.height) / 180)); context.font = `${Math.max(9, Math.round(Math.min(currentFrame.width, currentFrame.height) / 45))}px ui-monospace`; for (let row = 0; row < gridRows; row += 1) for (let column = 0; column < gridColumns; column += 1) { const x = gridOffsetX + column * (gridCellWidth + gridGapX); const y = gridOffsetY + row * (gridCellHeight + gridGapY); const inside = x >= 0 && y >= 0 && x + gridCellWidth <= currentFrame.width && y + gridCellHeight <= currentFrame.height; context.strokeStyle = inside ? 'rgba(255, 59, 64, .94)' : 'rgba(150, 145, 160, .75)'; context.setLineDash(inside ? [] : [5, 4]); context.strokeRect(x + .5, y + .5, gridCellWidth - 1, gridCellHeight - 1); context.fillStyle = inside ? 'rgba(180, 30, 38, .92)' : 'rgba(100, 96, 110, .85)'; context.fillText(`${row + 1}:${column + 1}`, x + 4, y + 13) } context.setLineDash([]) } else { drawFrame(context, currentFrame, transform, anchor.x, anchor.y, fitMode, canvasSize.width, canvasSize.height); context.strokeStyle = '#6b5fc1'; context.setLineDash([5, 4]); context.strokeRect(.5, .5, canvas.width - 1, canvas.height - 1); context.setLineDash([]); context.strokeStyle = '#34d3c8'; context.beginPath(); context.arc(anchor.x, anchor.y, 5, 0, Math.PI * 2); context.stroke() } }, [anchor, canvasSize, currentFrame, fitMode, frames.length, gridCellHeight, gridCellWidth, gridColumns, gridGapX, gridGapY, gridOffsetX, gridOffsetY, gridRows, transform])
  useEffect(() => { if (!currentFrame || frames.length === 1) return; const canvas = canvasRef.current; const context = canvas?.getContext('2d'); if (!canvas || !context) return; const edit = maskEditRef.current; drawPreviewBackground(context, canvas.width, canvas.height, previewBackground); drawFrame(context, currentFrame, transform, anchor.x, anchor.y, fitMode, canvasSize.width, canvasSize.height, edit?.frameIndex === displayFrame ? edit.canvas : currentFrame.image); drawEffectLayers(context, effectLayers, displayFrame, anchor.x, anchor.y); drawTemplateGuides(context, previewTemplateId, canvas.width, canvas.height, anchor); context.strokeStyle = '#6b5fc1'; context.setLineDash([5, 4]); context.strokeRect(.5, .5, canvas.width - 1, canvas.height - 1); context.setLineDash([]); context.strokeStyle = '#34d3c8'; context.beginPath(); context.arc(anchor.x, anchor.y, 7, 0, Math.PI * 2); context.stroke() }, [anchor, canvasSize, currentFrame, displayFrame, effectLayers, fitMode, frames.length, maskRevision, previewTemplateId, previewBackground, transform])
  useEffect(() => { if (!currentFrame || frames.length !== 1) return; const canvas = canvasRef.current; const context = canvas?.getContext('2d'); if (!canvas || !context) return; drawPreviewBackground(context, canvas.width, canvas.height, previewBackground); context.drawImage(currentFrame.image, 0, 0); context.lineWidth = Math.max(1, Math.round(Math.min(currentFrame.width, currentFrame.height) / 180)); context.font = `${Math.max(9, Math.round(Math.min(currentFrame.width, currentFrame.height) / 45))}px ui-monospace`; for (let row = 0; row < gridRows; row += 1) for (let column = 0; column < gridColumns; column += 1) { const x = gridOffsetX + column * (gridCellWidth + gridGapX); const y = gridOffsetY + row * (gridCellHeight + gridGapY); const inside = x >= 0 && y >= 0 && x + gridCellWidth <= currentFrame.width && y + gridCellHeight <= currentFrame.height; context.strokeStyle = inside ? 'rgba(255, 59, 64, .94)' : 'rgba(150, 145, 160, .75)'; context.setLineDash(inside ? [] : [5, 4]); context.strokeRect(x + .5, y + .5, gridCellWidth - 1, gridCellHeight - 1); context.fillStyle = inside ? 'rgba(180, 30, 38, .92)' : 'rgba(100, 96, 110, .85)'; context.fillText(`${row + 1}:${column + 1}`, x + 4, y + 13) } context.setLineDash([]) }, [currentFrame, frames.length, gridCellHeight, gridCellWidth, gridColumns, gridGapX, gridGapY, gridOffsetX, gridOffsetY, gridRows, previewBackground])
  useEffect(() => { if (currentFrame) return; const canvas = canvasRef.current; const context = canvas?.getContext('2d'); if (!canvas || !context) return; canvas.width = 720; canvas.height = 420; context.fillStyle = '#f7f7fa'; context.fillRect(0, 0, canvas.width, canvas.height); context.strokeStyle = '#d8d4e5'; context.setLineDash([7, 7]); context.strokeRect(20.5, 20.5, canvas.width - 41, canvas.height - 41); context.setLineDash([]); context.fillStyle = '#6b5fc1'; context.textAlign = 'center'; context.font = '700 18px ui-monospace, Consolas, monospace'; context.fillText('DROP A FRAME TO BEGIN', canvas.width / 2, canvas.height / 2 - 8); context.fillStyle = '#858194'; context.font = '12px ui-monospace, Consolas, monospace'; context.fillText('PNG sequence · Sheet + JSON · video', canvas.width / 2, canvas.height / 2 + 20); context.textAlign = 'start' }, [currentFrame])
  useEffect(() => { if (!source || frames.length !== 1) return; const availableWidth = Math.max(1, source.width - gridOffsetX - Math.max(0, gridColumns - 1) * gridGapX); const availableHeight = Math.max(1, source.height - gridOffsetY - Math.max(0, gridRows - 1) * gridGapY); const nextWidth = Math.max(1, Math.floor(availableWidth / Math.max(1, gridColumns))); const nextHeight = Math.max(1, Math.floor(availableHeight / Math.max(1, gridRows))); const frame = window.requestAnimationFrame(() => { setGridCellWidth((current) => current === nextWidth ? current : nextWidth); setGridCellHeight((current) => current === nextHeight ? current : nextHeight) }); return () => window.cancelAnimationFrame(frame) }, [gridColumns, gridGapX, gridGapY, gridOffsetX, gridOffsetY, gridRows, frames.length, source])

  function maskImagePoint(canvas: HTMLCanvasElement, event: PointerEvent<HTMLCanvasElement>, frame: FrameAsset) { const rect = canvas.getBoundingClientRect(); const canvasX = (event.clientX - rect.left) * canvas.width / rect.width; const canvasY = (event.clientY - rect.top) * canvas.height / rect.height; if (frames.length === 1) return { x: canvasX, y: canvasY }; const imageRatio = frame.width / frame.height; const canvasRatio = canvasSize.width / canvasSize.height; const baseScale = fitMode === 'contain' ? (imageRatio > canvasRatio ? canvasSize.width / frame.width : canvasSize.height / frame.height) : (imageRatio > canvasRatio ? canvasSize.height / frame.height : canvasSize.width / frame.width); const scaleX = baseScale * transform.scale * transform.scaleX / 10000; const scaleY = baseScale * transform.scale * transform.scaleY / 10000; const radians = -transform.rotation * Math.PI / 180; const translatedX = canvasX - anchor.x - transform.offsetX; const translatedY = canvasY - anchor.y - transform.offsetY; const unrotatedX = translatedX * Math.cos(radians) - translatedY * Math.sin(radians); const unrotatedY = translatedX * Math.sin(radians) + translatedY * Math.cos(radians); return { x: unrotatedX / scaleX + frame.width / 2, y: unrotatedY / scaleY + frame.height / 2 } }
  function paintMask(event: PointerEvent<HTMLCanvasElement>) { const edit = maskEditRef.current; const frame = frames[edit?.frameIndex ?? -1]; if (!edit || !frame || maskMode === 'off') return; const point = maskImagePoint(event.currentTarget, event, frame); const maskData = new ImageData(new Uint8ClampedArray(edit.mask.length * 4), edit.canvas.width, edit.canvas.height); const originalMask = new ImageData(new Uint8ClampedArray(edit.mask.length * 4), edit.canvas.width, edit.canvas.height); const originalAlpha = frame.originalAlphaMask ?? alphaMaskFromImage(frame.originalImage ?? frame.image); frame.originalAlphaMask = originalAlpha; for (let index = 0; index < edit.mask.length; index += 1) { maskData.data[index * 4 + 3] = edit.mask[index]; originalMask.data[index * 4 + 3] = originalAlpha[index] } applyAlphaBrush(maskData, originalMask, point.x, point.y, maskBrushSize, maskMode); for (let index = 0; index < edit.mask.length; index += 1) edit.mask[index] = maskData.data[index * 4 + 3]; applyMaskToCanvas(edit.canvas, frame.originalImage ?? frame.image, edit.mask); setMaskRevision((value) => value + 1) }
  function pointerDown(event: PointerEvent<HTMLCanvasElement>) { const canvas = event.currentTarget; if (!canvas || isPlaying) return; event.preventDefault(); if (maskMode !== 'off' && currentFrame && frames.length >= 1) { const editCanvas = document.createElement('canvas'); editCanvas.width = currentFrame.width; editCanvas.height = currentFrame.height; const editContext = editCanvas.getContext('2d'); if (editContext) { editContext.drawImage(currentFrame.image, 0, 0); const sessionId = maskSessionRef.current + 1; maskSessionRef.current = sessionId; maskEditRef.current = { frameIndex: displayFrame, frameId: currentFrame.id, sessionId, canvas: editCanvas, mask: new Uint8ClampedArray(currentFrame.mask ?? currentFrame.originalAlphaMask ?? alphaMaskFromImage(currentFrame.image)) }; paintMask(event); canvas.setPointerCapture(event.pointerId); return } } const rect = canvas.getBoundingClientRect(); const x = (event.clientX - rect.left) * canvas.width / rect.width; const y = (event.clientY - rect.top) * canvas.height / rect.height; const selectedLayer = selectedEffectLayerId ? effectLayers.find((layer) => layer.id === selectedEffectLayerId) : undefined; if (selectedLayer && frames.length > 1) { interactionRef.current = { kind: 'layer', layerId: selectedLayer.id, startX: x, startY: y, offsetX: selectedLayer.offsetX, offsetY: selectedLayer.offsetY, anchorX: anchor.x, anchorY: anchor.y, gridX: gridOffsetX, gridY: gridOffsetY }; canvas.setPointerCapture(event.pointerId); return } const kind = frames.length === 1 ? 'grid' : 'anchor'; interactionRef.current = { kind, startX: x, startY: y, offsetX: transform.offsetX, offsetY: transform.offsetY, anchorX: anchor.x, anchorY: anchor.y, gridX: gridOffsetX, gridY: gridOffsetY }; canvas.setPointerCapture(event.pointerId) }
  function pointerMove(event: PointerEvent<HTMLCanvasElement>) { if (maskEditRef.current) { event.preventDefault(); paintMask(event); return } const interaction = interactionRef.current; const canvas = event.currentTarget; if (!interaction || !canvas) return; event.preventDefault(); const rect = canvas.getBoundingClientRect(); const x = (event.clientX - rect.left) * canvas.width / rect.width; const y = (event.clientY - rect.top) * canvas.height / rect.height; if (interaction.kind === 'grid') { setGridOffsetX(Math.round(Math.max(0, interaction.gridX + x - interaction.startX))); setGridOffsetY(Math.round(Math.max(0, interaction.gridY + y - interaction.startY))) } else if (interaction.kind === 'layer' && interaction.layerId) { updateEffectLayer(interaction.layerId, { offsetX: Math.round(interaction.offsetX + x - interaction.startX), offsetY: Math.round(interaction.offsetY + y - interaction.startY) }) } else setAnchor({ x: Math.round(Math.max(0, Math.min(canvas.width, interaction.anchorX + x - interaction.startX))), y: Math.round(Math.max(0, Math.min(canvas.height, interaction.anchorY + y - interaction.startY))) }) }
  async function pointerUp(event: PointerEvent<HTMLCanvasElement>) { const edit = maskEditRef.current; if (edit) { const frame = frames[edit.frameIndex]; const sessionId = edit.sessionId; if (frame) { const next = await frameFromCanvas(edit.canvas, frame.name, frame.sourceFrameIndex, frame.durationMs, frame.originalImage ?? frame.image, edit.mask); if (maskEditRef.current?.sessionId === sessionId) { next.disabled = frame.disabled; track(next.url); setFrames((current) => current.map((value) => value.id === edit.frameId ? next : value)); setActiveFrame(edit.frameIndex); setPreviewFrame(edit.frameIndex); maskEditRef.current = null; setMaskRevision((value) => value + 1) } } } interactionRef.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId) }

  return <main ref={studioRef} className="sprite-studio" data-repair-stage={stage}>
    <header className="sprite-studio-head"><div><p className="sprite-kicker">ANIMATION SHEET WORKBENCH</p><h2>序列帧整理工作台</h2><p className="sprite-intro">把杂乱 AI 帧整理成统一画布、可直接网格裁剪的透明 Sheet。</p></div><div className="sprite-head-actions"><button type="button" className="sprite-help-button" onClick={() => setShowHelp(true)}>使用说明</button><button type="button" className="sprite-head-export" disabled={!playableFrames.length} onClick={() => void exportSheet()}>导出最终 Sheet</button><span className="sprite-draft-badge"><span />本地编辑 · 不上传</span></div></header>
    <nav className="sprite-workflow-nav"><button type="button" className={stage === 'source' ? 'active' : ''} onClick={() => setStage('source')}><b>1</b><span>导入</span><small>序列或 Sheet + JSON</small></button><button type="button" className={stage === 'tune' ? 'active' : ''} disabled={!frames.length} onClick={() => setStage('tune')}><b>2</b><span>调校</span><small>画布与帧条</small></button><button type="button" className={stage === 'export' ? 'active' : ''} disabled={!frames.length} onClick={() => setStage('export')}><b>3</b><span>导出</span><small>统一透明画布</small></button></nav>
    <section className="sprite-studio-grid"><aside className="sprite-sidebar"><SpriteStudioToolsPanel previewBackground={previewBackground} onPreviewBackgroundChange={setPreviewBackground} maskMode={maskMode as MaskMode} maskBrushSize={maskBrushSize} onMaskModeChange={setMaskMode} onMaskBrushSizeChange={setMaskBrushSize} hasFrames={Boolean(frames.length)} onSave={saveWorkspace} onRestore={restoreWorkspace} onExport={exportSheet} />
      <SpriteLayerPanel layers={effectLayers.map<SpriteLayerEditorItem>((layer) => ({ id: layer.id, name: layer.name, frameCount: layer.frames.length, startFrame: layer.startFrame, endFrame: layer.endFrame, offsetX: layer.offsetX, offsetY: layer.offsetY, scale: layer.scale, opacity: layer.opacity, enabled: layer.enabled }))} frameCount={frames.length} selectedLayerId={selectedEffectLayerId} onAddFiles={(files) => void loadEffectLayer(files)} onUpdate={updateEffectLayer} onDelete={deleteEffectLayer} onSelect={setSelectedEffectLayerId} />
      <details className="sprite-collapsible sprite-source-panel" open><summary>输入素材</summary><label className="sprite-dropzone" htmlFor="sprite-upload"><span className="sprite-upload-mark">+</span><strong>导入 PNG 序列</strong><small>支持 PNG / JPG / JPEG / WebP</small><input id="sprite-upload" type="file" accept="image/*,.png,.jpg,.jpeg,.webp" multiple onChange={loadFiles} /></label>
        <div className="sprite-grid-extractor"><div className="sprite-section-label">单张图集切格</div><p>导入一张图集后按原始矩形切出帧，不改变帧的原始像素尺寸。</p><div className="sprite-grid-settings"><label className="sprite-control"><span>列数</span><input type="number" min="1" max="64" value={gridColumns} onChange={(event) => { const value = Math.max(1, Number(event.target.value) || 1); setGridColumns(value); if (source) initializeGrid(source.width, source.height, value, gridRows) }} /></label><label className="sprite-control"><span>行数</span><input type="number" min="1" max="64" value={gridRows} onChange={(event) => { const value = Math.max(1, Number(event.target.value) || 1); setGridRows(value); if (source) initializeGrid(source.width, source.height, gridColumns, value) }} /></label><label className="sprite-control"><span>格宽</span><input type="number" min="1" value={gridCellWidth} onChange={(event) => setGridCellWidth(Math.max(1, Number(event.target.value) || 1))} /></label><label className="sprite-control"><span>格高</span><input type="number" min="1" value={gridCellHeight} onChange={(event) => setGridCellHeight(Math.max(1, Number(event.target.value) || 1))} /></label><label className="sprite-control"><span>间距 X</span><input type="number" min="0" value={gridGapX} onChange={(event) => setGridGapX(Math.max(0, Number(event.target.value) || 0))} /></label><label className="sprite-control"><span>间距 Y</span><input type="number" min="0" value={gridGapY} onChange={(event) => setGridGapY(Math.max(0, Number(event.target.value) || 0))} /></label><label className="sprite-control"><span>起点 X</span><input type="number" min="0" value={gridOffsetX} onChange={(event) => setGridOffsetX(Math.max(0, Number(event.target.value) || 0))} /></label><label className="sprite-control"><span>起点 Y</span><input type="number" min="0" value={gridOffsetY} onChange={(event) => setGridOffsetY(Math.max(0, Number(event.target.value) || 0))} /></label></div><button type="button" className="sprite-grid-extract" disabled={!source || frames.length !== 1} onClick={() => void extractGrid()}>切格并进入帧池</button></div>
        <div className="sprite-sheet-import"><div className="sprite-section-label">重新导入 Sheet + JSON</div><label className="sprite-video-input" htmlFor="sheet-upload"><span>{sheetFile?.name ?? '选择 spritesheet.png'}</span><b>选择</b><input id="sheet-upload" type="file" accept="image/png,.png" onChange={(event) => setSheetFile(event.target.files?.[0] ?? null)} /></label><label className="sprite-video-input" htmlFor="sheet-json-upload"><span>选择 spritesheet.json</span><b>导入</b><input id="sheet-json-upload" type="file" accept="application/json,.json" onChange={(event) => void importSheet(event)} /></label></div>
        <div className="sprite-video-import"><div className="sprite-section-label">视频抽帧</div><label className="sprite-video-input" htmlFor="sprite-video-upload"><span>{videoFile?.name ?? '选择本地视频'}</span><b>选择</b><input id="sprite-video-upload" type="file" accept="video/*" onChange={(event) => void handleVideo(event)} /></label>{videoFile ? <><label className="sprite-control"><span>开始时间</span><input type="number" min="0" step=".01" value={videoStart} onChange={(event) => setVideoStart(Number(event.target.value))} /></label><label className="sprite-control"><span>结束时间</span><input type="number" min={videoStart} max={videoLimit} step=".01" value={effectiveVideoEnd} onChange={(event) => setVideoEnd(Number(event.target.value))} /></label><label className="sprite-control"><span>FPS</span><input type="number" min="1" max="60" value={videoFps} onChange={(event) => setVideoFps(Math.max(1, Math.min(60, Number(event.target.value) || 1)))} /></label><button type="button" className="sprite-video-extract" disabled={extracting} onClick={() => void extractVideo()}>{extracting ? '提取中…' : `提取 ${requestedVideoFrames} 帧`}</button></> : null}</div>
      </details>
      <details className="sprite-collapsible sprite-export-panel" open><summary>导出设置</summary><label className="sprite-control"><span>预览模板（可选）</span><select value={previewTemplateId} onChange={(event) => selectPreviewTemplate(event.target.value)}><option value="freeform">自由画布</option>{PREVIEW_TEMPLATES.map((item) => <option key={item.id} value={item.id}>{item.label} · {item.canvas.width} × {item.canvas.height}</option>)}</select></label><label className="sprite-control"><span>Fit 模式</span><select value={fitMode} onChange={(event) => setFitMode(event.target.value as 'contain' | 'cover')}><option value="contain">Contain</option><option value="cover">Cover</option></select></label><label className="sprite-control"><span>透明边距 px</span><input type="number" min="0" max="1024" value={padding} onChange={(event) => setPadding(Math.max(0, Number(event.target.value) || 0))} /></label><div className="sprite-canvas-result"><span>统一画布</span><strong>{canvasSize.width} × {canvasSize.height} · 原点 {anchor.x},{anchor.y}</strong></div><button type="button" className="sprite-reset" onClick={resetPlacement}>恢复当前放置</button><button type="button" className="sprite-export" disabled={!frames.length || measuring} onClick={measureCanvas}>{measuring ? '计算中…' : '计算全角色统一画布'}</button><button type="button" className="sprite-export" disabled={!frames.length} onClick={() => void exportSheet()}>导出 Sheet + JSON</button>{!validation.ok ? <div className="sprite-validation-error">{validation.issues.map((issue) => <div key={`${issue.code}-${issue.path}`}>{issue.message}</div>)}</div> : <div className="sprite-validation-ok">SpriteResource 校验通过</div>}<p className="sprite-message" role="status">{message}</p></details>
    </aside><div className="sprite-workbench">
      <section className="sprite-clip-board" aria-label="动画组编辑器">
        <div className="sprite-panel-top"><div><span className="sprite-eyebrow">ANIMATION GROUPS</span><strong>自定义动作序列</strong></div><span className="sprite-fps">当前导出：{sequence.label}</span></div>
        <div className="sprite-clip-board-body">
          <div className="sprite-clip-board-groups" role="tablist" aria-label="动画组">
            {clips.map((clip) => <button type="button" key={clip.id} role="tab" aria-selected={clip.id === sequence.id} className={clip.id === sequence.id ? 'active' : ''} onClick={() => { setActiveClipId(clip.id); setIsPlaying(false) }}><strong>{clip.label}</strong><small>{clip.frameIndices.length} 帧 · {clip.fps} FPS</small></button>)}
            <button type="button" className="add" onClick={addClip}>+ 新建动作</button>
          </div>
          <div className="sprite-clip-board-sequence">
            <div className="sprite-clip-board-settings"><label>名称 <input type="text" value={sequence.label} onChange={(event) => updateActiveClip({ label: event.target.value || sequence.id })} /></label><label>FPS <input type="number" min="1" max="60" value={sequence.fps} onChange={(event) => updateActiveClip({ fps: Math.max(1, Math.min(60, Number(event.target.value) || DEFAULT_FPS)) })} /></label><label className="sprite-clip-loop"><input type="checkbox" checked={sequence.loop} onChange={(event) => updateActiveClip({ loop: event.target.checked })} /> 循环</label><button type="button" disabled={clips.length <= 1} onClick={removeActiveClip}>删除动作</button></div>
            <div className="sprite-clip-board-frame-list" aria-label="当前动作帧顺序">{sequence.frameIndices.length ? sequence.frameIndices.map((frameIndex, position) => { const frame = frames[frameIndex]; return frame ? <button type="button" key={`${frame.id}_${position}`} className={frameIndex === activeFrame ? 'active' : ''} onClick={() => { setActiveFrame(frameIndex); setPreviewFrame(frameIndex); setIsPlaying(false) }}><span>{position + 1}</span><img src={frame.url} alt={`动作帧 ${position + 1}`} /><i onClick={(event) => { event.stopPropagation(); toggleFrameInActiveClip(frameIndex) }}>×</i></button> : null }) : <em>从下方帧池点击帧，按需要组成当前动作。</em>}</div>
            <div className="sprite-animation-row-actions"><span>{sequence.frameIndices.map((frameIndex, position) => <button type="button" key={`${frameIndex}_${position}`} title={`移动第 ${position + 1} 帧`} onClick={() => moveClipFrame(position, position === 0 ? 1 : -1)} disabled={sequence.frameIndices.length < 2}>{position === 0 ? '→' : '←'}</button>)}</span><em>帧池点击可加入或移出当前动作；动作内顺序独立于原始帧顺序。</em></div>
          </div>
        </div>
      </section>
      <section className="sprite-canvas-panel"><div className="sprite-panel-top"><div><span className="sprite-eyebrow">实时画布</span><strong>{currentFrame ? `${frames.length === 1 ? `${currentFrame.width} × ${currentFrame.height}` : `${canvasSize.width} × ${canvasSize.height}`} · 第 ${displayFrame + 1} 帧` : '等待导入帧'}</strong></div><span className="sprite-guide-key">{frames.length === 1 ? '红框 = 切格 · 拖动 = 移动整套网格' : '青色 = 原点 · 紫色 = 统一画布'}</span></div><div className="sprite-canvas-wrap"><canvas ref={canvasRef} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} aria-label="Sprite preview" /></div><div className="sprite-canvas-caption"><span><i className="cyan-dot" /> {frames.length === 1 ? '拖动网格调整起点 X/Y；左侧数字可精确校准' : '拖动画布中的帧可以校准当前帧偏移'}</span><span><i className="violet-dot" /> {frames.length === 1 ? `当前偏移 ${gridOffsetX}, ${gridOffsetY}` : '所有动画导出共享同一尺寸和原点'}</span></div></section>
      <section className="sprite-frame-panel"><div className="sprite-panel-top"><div><span className="sprite-eyebrow">FRAME STRIP</span><strong>{frames.length ? `${frames.length} 个原始帧` : '等待导入帧'}</strong></div><div className="sprite-frame-actions"><button type="button" className="play" disabled={playableFrames.length < 2} onClick={() => { const nextPlaying = !isPlaying; if (nextPlaying && playableFrames.length) { setPlaybackPosition(0); setActiveFrame(playableFrames[0]); setPreviewFrame(playableFrames[0]) }; setIsPlaying(nextPlaying) }}>{isPlaying ? '暂停' : '播放'}</button><button type="button" className="fill" disabled={!frames[activeFrame]} onClick={() => toggleFrameInActiveClip(activeFrame)}>{sequence.frameIndices.includes(activeFrame) ? '移出当前动作' : '加入当前动作'}</button><button type="button" disabled={!frames.length || cleaning || Boolean(preCleanupFrames)} onClick={() => void cleanupBackground()}>{cleaning ? '处理中…' : '清理背景'}</button>{preCleanupFrames ? <button type="button" onClick={restoreCleanup}>恢复原始</button> : null}<button type="button" disabled={!frames[activeFrame]} onClick={deleteFrame}>删除当前帧</button></div></div><div className="sprite-frames">{frames.map((frame, index) => <button type="button" key={frame.id} draggable onDragStart={(event) => { setDragFrameIndex(index); event.dataTransfer.setData('text/plain', String(index)) }} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragFrameIndex !== null) reorderFrames(dragFrameIndex, index); setDragFrameIndex(null) }} onDragEnd={() => setDragFrameIndex(null)} className={`sprite-frame ${index === activeFrame ? 'active' : ''} ${index === previewFrame && isPlaying ? 'previewing' : ''} ${frame.disabled ? 'disabled' : ''} ${dragFrameIndex === index ? 'dragging' : ''}`} onClick={() => { setActiveFrame(index); setPreviewFrame(index); setIsPlaying(false) }}><span>{String(index + 1).padStart(2, '0')}</span><img src={frame.url} alt="" /><small>{Math.round(frame.durationMs)}ms{frame.disabled ? ' · OFF' : ''}</small></button>)}</div>{currentFrame ? <div className="sprite-frame-adjustments"><div className="sprite-adjustment-head"><span>第 {activeFrame + 1} 帧 · 源帧 {currentFrame.sourceFrameIndex + 1}</span><button type="button" onClick={resetFrameTransforms}>恢复{transformScope === 'enabled' ? '启用帧' : '当前帧'}</button></div><div className="sprite-adjustment-controls"><label className="sprite-control"><span>时长 ms</span><input type="number" min="1" max="60000" value={Math.round(currentFrame.durationMs)} onChange={(event) => updateFrame({ durationMs: Math.max(1, Number(event.target.value) || 1) })} /></label><label className="sprite-control"><span>作用范围</span><select value={transformScope} onChange={(event) => setTransformScope(event.target.value as TransformScope)}><option value="frame">当前帧</option><option value="enabled">所有启用帧</option></select></label><label className="sprite-control"><span>统一缩放 <output>{transform.scale}%</output></span><input type="range" min="10" max="300" value={transform.scale} onChange={(event) => updateTransform('scale', Number(event.target.value))} /></label><label className="sprite-control"><span>X 缩放 <output>{transform.scaleX}%</output></span><input type="range" min="10" max="300" value={transform.scaleX} onChange={(event) => updateTransform('scaleX', Number(event.target.value))} /></label><label className="sprite-control"><span>Y 缩放 <output>{transform.scaleY}%</output></span><input type="range" min="10" max="300" value={transform.scaleY} onChange={(event) => updateTransform('scaleY', Number(event.target.value))} /></label><label className="sprite-control"><span>旋转 <output>{transform.rotation}°</output></span><input type="range" min="-180" max="180" value={transform.rotation} onChange={(event) => updateTransform('rotation', Number(event.target.value))} /></label><label className="sprite-control"><span>偏移 X <output>{transform.offsetX}px</output></span><input type="range" min="-1024" max="1024" value={transform.offsetX} onChange={(event) => updateTransform('offsetX', Number(event.target.value))} /></label><label className="sprite-control"><span>偏移 Y <output>{transform.offsetY}px</output></span><input type="range" min="-1024" max="1024" value={transform.offsetY} onChange={(event) => updateTransform('offsetY', Number(event.target.value))} /></label><label className="sprite-loop-toggle"><input type="checkbox" checked={currentFrame.disabled} onChange={(event) => updateFrame({ disabled: event.target.checked })} /> 禁用此帧</label></div></div> : null}</section>
      <section className="sprite-manifest-panel"><div className="sprite-panel-top"><div><span className="sprite-eyebrow">RE-IMPORTABLE PACKAGE</span><strong>spritesheet.json</strong></div><span className="sprite-json-dot" /></div><pre>{JSON.stringify(manifest, null, 2)}</pre></section>
    </div></section>
    {showHelp ? <div className="sprite-help-backdrop" role="presentation" onClick={() => setShowHelp(false)}><section className="sprite-help-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><div className="sprite-help-head"><div><span className="sprite-eyebrow">FRAME TUNER LITE MODEL</span><h3>先整理，再导出</h3></div><button type="button" onClick={() => setShowHelp(false)}>×</button></div><ol className="sprite-help-steps"><li>导入 PNG 序列，或先选择 Sheet PNG 再导入对应 JSON。</li><li>拖动帧条调整顺序；帧条从左到右就是播放与导出顺序。</li><li>在画布中统一校准锚点、缩放和透明画布，所有帧共享同一套设置。</li><li>清理背景后检查不同背景色下的边缘，再导出最终 Sheet。</li><li>导出的 `spritesheet.png` 和 `spritesheet.json` 可直接交给 Godot 的原生网格裁剪能力。</li></ol><p className="sprite-help-note">本工具只整理图片和导出标准资源，不替代 Godot 的动画编辑器。</p><button type="button" className="sprite-help-close" onClick={() => setShowHelp(false)}>开始使用</button></section></div> : null}
  </main>
}
