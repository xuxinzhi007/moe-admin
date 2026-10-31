import type { AvatarAssetStore } from './assetStore'
import type { MoeAvatarManifest, OutfitSelection, PreviewAnimation } from './types'
import type { TemplateSelection } from './resolveLayers'
import { assetUrlCandidates, resolveLayerPaths, resolveTemplateLayerPaths } from './resolveLayers'
import { loadImageFromUrls } from './loadImage'

function urlsForPath(
  packBaseUrl: string,
  rel: string,
  assetStore?: AvatarAssetStore,
  fallbackPackBaseUrls: string[] = [],
): string[] {
  if (!rel) return []
  return assetUrlCandidates(packBaseUrl, rel, assetStore?.objectUrl(rel), fallbackPackBaseUrls)
}

/** 叠层合成 walk 或 idle 整张 sheet canvas */
export async function composeSheet(
  manifest: MoeAvatarManifest,
  outfit: OutfitSelection,
  anim: PreviewAnimation,
  packBaseUrl: string,
  assetStore?: AvatarAssetStore,
  fallbackPackBaseUrls: string[] = [],
): Promise<HTMLCanvasElement | null> {
  const grid = manifest.animations[anim]
  const cell = manifest.cellSize
  const w = grid.cols * cell
  const h = grid.rows * cell
  const paths = resolveLayerPaths(manifest, outfit, anim)
  if (paths.length === 0) return null

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  for (const rel of paths) {
    if (!rel) continue
    try {
      const img = await loadImageFromUrls(urlsForPath(packBaseUrl, rel, assetStore, fallbackPackBaseUrls))
      ctx.drawImage(img, 0, 0)
    } catch {
      // 缺层跳过
    }
  }
  return canvas
}

export async function composeTemplateSheet(
  manifest: MoeAvatarManifest,
  selection: TemplateSelection,
  anim: PreviewAnimation,
  packBaseUrl: string,
  assetStore?: AvatarAssetStore,
  fallbackPackBaseUrls: string[] = [],
): Promise<HTMLCanvasElement | null> {
  const grid = manifest.animations[anim]
  const cell = manifest.cellSize
  const w = grid.cols * cell
  const h = grid.rows * cell
  const paths = resolveTemplateLayerPaths(manifest, selection, anim)
  if (paths.length === 0) return null

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  for (const rel of paths) {
    if (!rel) continue
    try {
      const img = await loadImageFromUrls(urlsForPath(packBaseUrl, rel, assetStore, fallbackPackBaseUrls))
      ctx.drawImage(img, 0, 0)
    } catch {
      // 缺层跳过
    }
  }
  return canvas
}

/** 绘制 sheet 中单帧到目标 ctx */
export function drawSheetFrame(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLCanvasElement,
  manifest: MoeAvatarManifest,
  anim: PreviewAnimation,
  directionRow: number,
  frameCol: number,
  destX: number,
  destY: number,
  destSize: number,
): void {
  const cell = manifest.cellSize
  const grid = manifest.animations[anim]
  const col = Math.max(0, Math.min(frameCol, grid.cols - 1))
  const row = Math.max(0, Math.min(directionRow, grid.rows - 1))
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(
    sheet,
    col * cell,
    row * cell,
    cell,
    cell,
    destX,
    destY,
    destSize,
    destSize,
  )
}

/** 从单层 idle·down·0 生成缩略图（列表只用部件） */
export async function layerThumbCanvas(
  manifest: MoeAvatarManifest,
  layerRelPath: string,
  packBaseUrl: string,
  thumbSize = 64,
  assetStore?: AvatarAssetStore,
  fallbackPackBaseUrls: string[] = [],
): Promise<HTMLCanvasElement | null> {
  if (!layerRelPath) return null
  try {
    const img = await loadImageFromUrls(urlsForPath(packBaseUrl, layerRelPath, assetStore, fallbackPackBaseUrls))
    const cell = manifest.cellSize
    const canvas = document.createElement('canvas')
    canvas.width = thumbSize
    canvas.height = thumbSize
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(
      img,
      0,
      2 * cell,
      cell,
      cell,
      0,
      0,
      thumbSize,
      thumbSize,
    )
    return canvas
  } catch {
    return null
  }
}
