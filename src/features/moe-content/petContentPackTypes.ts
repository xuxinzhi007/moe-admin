/**
 * Pet Content Pack 类型 SSOT（manifest · 发布元数据 · 场景 preset）
 *
 * **规范层 Spec** — 新字段/新类型只在此与 worldObject.ts 定义。
 * WorldObject 字段：./worldObject.ts
 * 合并/导出：./petContentPack.ts
 * 运行能力矩阵：./petContentPackCapabilities.ts
 * 成熟度对照：docs/dev/pet-content-pack-maturity.md
 */

import type { MoeAvatarSection } from '../moe-avatar/types'
import type { WorldObjectDef } from './worldObject'

/** 发布链路元数据（manifest 为生成物；上线需版本 / 校验 / 回滚） */
export type PetContentPackPublish = {
  /** semver，如 1.0.0 */
  version: string
  /** ISO8601 构建时间 */
  builtAt?: string
  /** 资源清单 sha256（P4 校验） */
  contentHash?: string
  /** 最低兼容 App 版本 */
  minAppVersion?: string
  /** 上一版 packId@version，便于回滚 */
  rollbackFrom?: string
}

export type ScenePresetInstance = {
  objectId: string
  x: number
  y: number
  rotation?: number
  scale?: number
  zIndex?: number
}

export type ScenePreset = {
  scene: string
  objects: ScenePresetInstance[]
}

/** 统一内容包 v1（当前 · avatar + objects） */
export type PetContentPackManifestV1 = {
  specVersion: '1'
  packId: string
  displayName: string
  publish?: PetContentPackPublish
  avatar: MoeAvatarSection
  objects: Record<string, WorldObjectDef>
}

/** 统一内容包 v2（+ 官方房间 preset · 场景编辑器产出） */
export type PetContentPackManifestV2 = {
  specVersion: '2'
  packId: string
  displayName: string
  publish?: PetContentPackPublish
  avatar: MoeAvatarSection
  objects: Record<string, WorldObjectDef>
  scenePresets?: Record<string, ScenePreset>
}

/** 任意已支持 spec 版本 */
export type PetContentPackManifest =
  | PetContentPackManifestV1
  | PetContentPackManifestV2

export function isPackManifestV2(
  m: PetContentPackManifest,
): m is PetContentPackManifestV2 {
  return m.specVersion === '2'
}

/** 导出/入库前校验（完整 hash 校验见 P4 publish.contentHash） */
export function validatePackManifest(
  m: PetContentPackManifest,
  options?: { strictPublish?: boolean },
): string[] {
  const errors: string[] = []
  if (!m.packId?.trim()) errors.push('packId 不能为空')
  if (!m.displayName?.trim()) errors.push('displayName 不能为空')
  if (!m.avatar?.cellSize) errors.push('avatar.cellSize 缺失')
  if (!m.avatar?.animations?.walk || !m.avatar?.animations?.idle) {
    errors.push('avatar.animations 需包含 walk 与 idle')
  }
  for (const [id, obj] of Object.entries(m.objects ?? {})) {
    if (obj.id !== id) errors.push(`objects.${id}.id 与 key 不一致`)
    if (!obj.asset?.path) errors.push(`objects.${id}.asset.path 缺失`)
    if (!obj.label?.trim()) errors.push(`objects.${id}.label 缺失`)
  }
  if (m.publish?.version && !/^\d+\.\d+\.\d+/.test(m.publish!.version)) {
    errors.push('publish.version 建议 semver（如 1.0.0）')
  }
  if (options?.strictPublish) {
    if (!m.publish?.version) errors.push('strict: publish.version 必填')
    if (!m.publish?.builtAt) errors.push('strict: publish.builtAt 必填')
  }
  return errors
}

