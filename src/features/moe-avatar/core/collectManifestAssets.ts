import type { MoeAvatarManifest } from './types'

export type ManifestAssetEntry = {
  path: string
  group: 'base' | 'slot'
  label: string
  slot?: string
  itemId?: string
  animation: 'walk' | 'idle'
}

/** manifest 引用的全部 layer 路径（当前 pack 正在使用的文件清单） */
export function collectManifestAssets(manifest: MoeAvatarManifest): ManifestAssetEntry[] {
  const out: ManifestAssetEntry[] = []
  const push = (entry: Omit<ManifestAssetEntry, 'path'> & { path: string }): void => {
    if (!entry.path) return
    out.push(entry)
  }
  for (const [key, layer] of Object.entries(manifest.base)) {
    push({ path: layer.walk, group: 'base', label: `${key} · walk`, slot: key, animation: 'walk' })
    push({ path: layer.idle, group: 'base', label: `${key} · idle`, slot: key, animation: 'idle' })
  }
  for (const [slot, items] of Object.entries(manifest.slots)) {
    for (const [itemId, layer] of Object.entries(items)) {
      push({
        path: layer.walk,
        group: 'slot',
        label: `${slot}/${itemId} · walk`,
        slot,
        itemId,
        animation: 'walk',
      })
      push({
        path: layer.idle,
        group: 'slot',
        label: `${slot}/${itemId} · idle`,
        slot,
        itemId,
        animation: 'idle',
      })
    }
  }
  const seen = new Set<string>()
  return out.filter((e) => {
    if (seen.has(e.path)) return false
    seen.add(e.path)
    return true
  })
}

/** 当前试穿装扮会用到的 layer 路径 */
export function layersForOutfit(
  manifest: MoeAvatarManifest,
  outfit: { hatId: string; topId: string; bottomId: string; shoesId: string },
  anim: 'walk' | 'idle',
): Set<string> {
  const paths = new Set<string>()
  for (const key of manifest.composeOrder) {
    const baseLayer = manifest.base[key]
    if (baseLayer?.[anim]) {
      paths.add(baseLayer[anim])
      continue
    }
    const slotId = (
      {
        hat: outfit.hatId,
        top: outfit.topId,
        bottom: outfit.bottomId,
        shoes: outfit.shoesId,
      } as Record<string, string>
    )[key]
    if (!slotId) continue
    const layer = manifest.slots[key]?.[slotId]
    if (layer?.[anim]) paths.add(layer[anim])
  }
  return paths
}
