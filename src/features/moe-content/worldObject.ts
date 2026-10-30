/**
 * World Object 定义 — **规范层 Spec**
 *
 * SSOT 文档：docs/dev/moe-pet-world-object.md
 * Pack manifest 类型：./petContentPackTypes.ts（勿在此重复定义）
 * 成熟度：docs/dev/pet-content-pack-maturity.md
 */

export type WorldObjectKind = 'furniture' | 'decor' | 'pickup' | 'prop'

export type WorldObjectInteraction = {
  draggable?: boolean
  rotatable?: boolean
  scalable?: boolean
  pickupable?: boolean
  interactable?: boolean
  useAction?: string
  collision?: 'none' | 'block' | 'platform'
  dropTo?: 'floor' | 'hand' | 'inventory'
}

export type WorldObjectDef = {
  id: string
  kind: WorldObjectKind
  label: string
  asset: { path: string; thumb?: string }
  scenes: string[]
  transform: {
    anchor?: 'bottom_center' | 'center'
    defaultScale?: number
    zIndex?: number
  }
  interaction?: WorldObjectInteraction
  placement?: 'floor' | 'wall' | 'hanging'
}

export type {
  PetContentPackManifest,
  PetContentPackManifestV1,
  PetContentPackManifestV2,
  PetContentPackPublish,
  ScenePreset,
  ScenePresetInstance,
} from './petContentPackTypes'
