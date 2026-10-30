/**
 * 统一 Pet Content Pack（avatar + objects）
 * SSOT：docs/dev/moe-pet-content-pack.md · docs/dev/moe-pet-world-object.md
 */

import type { MoeAvatarManifest, MoeAvatarSection } from '../moe-avatar/types'
import type {
  PetContentPackManifestV1,
  PetContentPackPublish,
} from './petContentPackTypes'
import { validatePackManifest } from './petContentPackTypes'
import type { WorldObjectDef } from './worldObject'

export type {
  PetContentPackManifest,
  PetContentPackManifestV1,
  PetContentPackManifestV2,
  PetContentPackPublish,
  ScenePreset,
  ScenePresetInstance,
} from './petContentPackTypes'
export { isPackManifestV2, validatePackManifest } from './petContentPackTypes'

/** 动画由 Moe 在 manifest 注册；App 只播放 catalog 内 key，不依赖 ULPC 全集 */
export type MoeAnimationPolicy = {
  source: 'moe_official'
  description?: string
}

export type MoeAnimationDef = {
  cols: number
  rows: number
  required?: boolean
}

/** avatar 节：嵌入统一 pack，不含 pack 级 packId/displayName */
export type { MoeAvatarSection } from '../moe-avatar/types'

export type LegacyFurnitureItem = {
  path: string
  thumb?: string
  label: string
  scenes: string[]
  defaultScale?: number
  anchor?: 'bottom_center' | 'center'
}

export type LegacyFurnitureManifest = {
  specVersion: string
  packId: string
  kind: string
  displayName: string
  items: Record<string, LegacyFurnitureItem>
}


const DEFAULT_OBJECT_INTERACTION: NonNullable<WorldObjectDef['interaction']> = {
  draggable: true,
  rotatable: true,
  scalable: true,
  pickupable: false,
  interactable: false,
}

/** 家具 legacy manifest → WorldObjectDef（zip 内 asset 路径为 objects/{id}.png） */
export function furnitureItemsToObjects(
  items: Record<string, LegacyFurnitureItem>,
): Record<string, WorldObjectDef> {
  const objects: Record<string, WorldObjectDef> = {}
  for (const [id, item] of Object.entries(items)) {
    objects[id] = {
      id,
      kind: 'furniture',
      label: item.label,
      asset: {
        path: `objects/${id}.png`,
        thumb: item.thumb ? `objects/thumbs/${id}.png` : undefined,
      },
      scenes: item.scenes,
      transform: {
        anchor: item.anchor ?? 'bottom_center',
        defaultScale: item.defaultScale ?? 1,
      },
      interaction: { ...DEFAULT_OBJECT_INTERACTION },
    }
  }
  return objects
}

/** 从角色 manifest 提取 avatar 节（加 animationPolicy） */
export function avatarManifestToSection(
  manifest: MoeAvatarManifest,
): MoeAvatarSection {
  const { specVersion: _s, packId: _p, displayName: _d, ...body } = manifest
  return {
    ...body,
    animationPolicy: manifest.animationPolicy ?? {
      source: 'moe_official',
      description:
        'walk/idle 由官方 sheet 定义；新增 run/emote/sit 等仅在 manifest.animations 注册后 App 才播放',
    },
  }
}

export function buildUnifiedManifest(
  avatarManifest: MoeAvatarManifest,
  furnitureManifest: LegacyFurnitureManifest,
  options?: {
    packId?: string
    displayName?: string
    publish?: PetContentPackPublish
  },
): PetContentPackManifestV1 {
  const manifest: PetContentPackManifestV1 = {
    specVersion: '1',
    packId: options?.packId ?? 'moe-official-pet-v1',
    displayName: options?.displayName ?? 'Moe 官方养成包',
    publish: options?.publish ?? {
      version: '1.0.0',
      builtAt: new Date().toISOString(),
    },
    avatar: avatarManifestToSection(avatarManifest),
    objects: furnitureItemsToObjects(furnitureManifest.items),
  }
  const errors = validatePackManifest(manifest)
  if (errors.length > 0) {
    console.warn('pack manifest validation:', errors)
  }
  return manifest
}

/** 收集 avatar 子包内相对路径（layers/...） */
export function collectAvatarAssetPaths(manifest: MoeAvatarManifest): string[] {
  const paths = new Set<string>()
  const addLayer = (layer: { walk: string; idle: string; thumb?: string }) => {
    paths.add(layer.walk)
    paths.add(layer.idle)
    if (layer.thumb) paths.add(layer.thumb)
  }
  for (const layer of Object.values(manifest.base)) {
    addLayer(layer)
  }
  for (const slot of Object.values(manifest.slots)) {
    for (const layer of Object.values(slot)) {
      addLayer(layer)
    }
  }
  return [...paths]
}
