import type { AvatarAssetStore } from './assetStore'
import { loadImageFromUrls } from './loadImage'
import { assetUrlCandidates } from './resolveLayers'
import type { MoeAvatarManifest, PreviewAnimation } from './types'
import { DIR_DOWN } from './types'

const BASE_KEYS = ['body', 'head', 'face', 'hair'] as const

/** 官方底模：base 四层 idle·down·帧0（单格 · 绑定编辑背景） */
export async function composeMannequinCell(
  manifest: MoeAvatarManifest,
  packBaseUrl: string,
  assetStore?: AvatarAssetStore,
  anim: PreviewAnimation = 'idle',
  directionRow = DIR_DOWN,
  frameCol = 0,
  fallbackPackBaseUrls: string[] = [],
): Promise<HTMLCanvasElement | null> {
  const cell = manifest.cellSize
  const canvas = document.createElement('canvas')
  canvas.width = cell
  canvas.height = cell
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  for (const key of BASE_KEYS) {
    const layer = manifest.base[key]
    if (!layer) continue
    const rel = layer[anim]
    if (!rel) continue
    try {
      const urls = assetUrlCandidates(packBaseUrl, rel, assetStore?.objectUrl(rel), fallbackPackBaseUrls)
      const sheet = await loadImageFromUrls(urls)
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(
        sheet,
        frameCol * cell,
        directionRow * cell,
        cell,
        cell,
        0,
        0,
        cell,
        cell,
      )
    } catch {
      // skip
    }
  }
  return canvas
}
