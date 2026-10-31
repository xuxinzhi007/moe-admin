import type { MoeAvatarManifest } from './types'

/** manifest 内是否有多个单品共用同一路径（上传会「全部替换」） */
export function findDuplicateAssetPaths(manifest: MoeAvatarManifest): Map<string, string[]> {
  const pathToItems = new Map<string, string[]>()
  for (const [slot, items] of Object.entries(manifest.slots)) {
    for (const [itemId, layer] of Object.entries(items)) {
      for (const p of [layer.walk, layer.idle]) {
        const key = `${slot}/${itemId}`
        const list = pathToItems.get(p) ?? []
        list.push(key)
        pathToItems.set(p, list)
      }
    }
  }
  const dupes = new Map<string, string[]>()
  for (const [path, refs] of pathToItems) {
    if (refs.length > 1) dupes.set(path, refs)
  }
  return dupes
}
