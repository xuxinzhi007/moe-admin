import JSZip from 'jszip'
import type { AvatarAssetStore } from './assetStore'
import type { MoeAvatarManifest, OutfitSelection } from './types'
import type { TemplateSelection } from './resolveLayers'
import { assetUrl } from './resolveLayers'
import { layerThumbCanvas, composeSheet, composeTemplateSheet } from './composeSheet'
import { collectManifestAssets } from './collectManifestAssets'

async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
  })
}

async function fetchBlob(url: string): Promise<Blob> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`fetch ${url}: ${res.status}`)
  return res.blob()
}

export type ExportPackOptions = {
  manifest: MoeAvatarManifest
  packBaseUrl: string
  assetStore?: AvatarAssetStore
  previewOutfit?: OutfitSelection
  templateSelection?: TemplateSelection
  /** 仅 editor 调试预览用；App 运行时按 manifest 逐层 compose，不读 baked */
  includeBaked?: boolean
}

/** 导出官方包 zip：manifest + 各部位分层 PNG + 部件 thumbs */
export async function exportMoePackZip(options: ExportPackOptions): Promise<Blob> {
  const { manifest, packBaseUrl, assetStore, previewOutfit, includeBaked = false } = options
  const zip = new JSZip()
  const paths = new Set(collectManifestAssets(manifest).map((entry) => entry.path))

  for (const rel of paths) {
    try {
      const blob = assetStore?.get(rel) ?? (await fetchBlob(assetUrl(packBaseUrl, rel)))
      zip.file(rel, blob)
    } catch (e) {
      console.warn('skip layer', rel, e)
    }
  }

  if (assetStore) {
    for (const origKey of assetStore.originalPaths()) {
      const blob = assetStore.get(origKey)
      if (blob) zip.file(origKey, blob)
    }
  }

  const manifestOut = structuredClone(manifest)
  for (const [, items] of Object.entries(manifestOut.slots)) {
    for (const [itemId, layers] of Object.entries(items)) {
      const thumbCanvas = await layerThumbCanvas(
        manifestOut,
        layers.idle,
        packBaseUrl,
        64,
        assetStore,
      )
      if (!thumbCanvas) continue
      const blob = await canvasToPngBlob(thumbCanvas)
      zip.file(`thumbs/${itemId}.png`, blob)
      layers.thumb = `thumbs/${itemId}.png`
    }
  }

  if (includeBaked && (previewOutfit || options.templateSelection)) {
    const walk = options.templateSelection
      ? await composeTemplateSheet(
          manifestOut,
          options.templateSelection,
          'walk',
          packBaseUrl,
          assetStore,
        )
      : await composeSheet(manifestOut, previewOutfit as OutfitSelection, 'walk', packBaseUrl, assetStore)
    const idle = options.templateSelection
      ? await composeTemplateSheet(
          manifestOut,
          options.templateSelection,
          'idle',
          packBaseUrl,
          assetStore,
        )
      : await composeSheet(manifestOut, previewOutfit as OutfitSelection, 'idle', packBaseUrl, assetStore)
    if (walk) zip.file('baked/hero_walk.png', await canvasToPngBlob(walk))
    if (idle) zip.file('baked/hero_idle.png', await canvasToPngBlob(idle))
  }

  zip.file('manifest.json', JSON.stringify(manifestOut, null, 2))
  return zip.generateAsync({ type: 'blob' })
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
