import type { MoeAvatarManifest, OutfitSelection, PreviewAnimation } from './types'

/** manifest 内相对路径 → admin public URL */
export function assetUrl(packBaseUrl: string, relativePath: string): string {
  const base = packBaseUrl.replace(/\/$/, '')
  const rel = relativePath.replace(/^\//, '')
  return `${base}/${rel}`
}

/** 可加载 URL：优先会话内上传 blob */
export function resolveAssetUrl(
  packBaseUrl: string,
  relativePath: string,
  uploadedUrl?: string,
): string {
  if (uploadedUrl) return uploadedUrl
  return assetUrl(packBaseUrl, relativePath)
}

export function assetUrlCandidates(
  packBaseUrl: string,
  relativePath: string,
  uploadedUrl?: string,
  fallbackPackBaseUrls: string[] = [],
): string[] {
  if (uploadedUrl) return [uploadedUrl]
  return [assetUrl(packBaseUrl, relativePath), ...fallbackPackBaseUrls.map((base) => assetUrl(base, relativePath))]
}

function selectionIdForKey(selection: Record<string, string | undefined>, composeKey: string): string {
  const value = selection[`${composeKey}Id`] ?? selection[composeKey]
  return typeof value === 'string' ? value : ''
}

function layerPath(
  manifest: MoeAvatarManifest,
  composeKey: string,
  selection: Record<string, string>,
  anim: PreviewAnimation,
): string | null {
  const baseLayer = manifest.base[composeKey]
  if (baseLayer?.[anim]) {
    return baseLayer[anim]
  }
  const id = selectionIdForKey(selection, composeKey)
  if (!id) return null
  const entry = manifest.slots[composeKey]?.[id]
  if (!entry) return null
  return entry[anim] || null
}

/** 按 composeOrder 解析当前装扮的层路径（相对 pack 根） */
export function resolveLayerPaths(
  manifest: MoeAvatarManifest,
  outfit: OutfitSelection,
  anim: PreviewAnimation,
): string[] {
  const out: string[] = []
  for (const key of manifest.composeOrder) {
    const p = layerPath(manifest, key, outfit, anim)
    if (p) out.push(p)
  }
  return out
}

export function itemIdsForSlot(manifest: MoeAvatarManifest, slot: string): string[] {
  const m = manifest.slots[slot]
  if (!m) return []
  return Object.keys(m).sort()
}

export type TemplateSelection = Partial<Record<string, string>>

/** 适配任意模板槽位的路径解析 */
export function resolveTemplateLayerPaths(
  manifest: MoeAvatarManifest,
  selection: TemplateSelection,
  anim: PreviewAnimation,
): string[] {
  const out: string[] = []
  for (const key of manifest.composeOrder) {
    const baseLayer = manifest.base[key]
    if (baseLayer?.[anim]) {
      out.push(baseLayer[anim])
      continue
    }
    const id = selectionIdForKey(selection, key)
    if (!id) continue
    const entry = manifest.slots[key]?.[id]
    if (entry?.[anim]) out.push(entry[anim])
  }
  return out
}

export function itemIdsForTemplateSlot(manifest: MoeAvatarManifest, slot: string): string[] {
  return Object.keys(manifest.slots[slot] ?? {}).sort()
}
