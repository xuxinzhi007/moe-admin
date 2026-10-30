/**
 * Pet Content Pack · 运行层能力矩阵（与 Flutter pet_content_registry.dart 对齐）
 *
 * SSOT 文档：docs/dev/pet-content-pack-maturity.md
 * 规范类型：./petContentPackTypes.ts · ./worldObject.ts
 */

export type PetContentRuntimeCapability = {
  /** 稳定 id，Flutter 侧同名 enum 值 */
  id: string
  label: string
  /** 规范层 schema 是否已定义 */
  specReady: boolean
  /** admin 生产/导出是否可用 */
  adminReady: boolean
  /** Flutter runtime 是否已消费 */
  runtimeReady: boolean
  notes?: string
}

/** 官方能力矩阵 — 产品/UI 不得宣传 runtimeReady=false 为已官方支持 */
export const PET_CONTENT_RUNTIME_CAPABILITIES: readonly PetContentRuntimeCapability[] =
  [
    {
      id: 'unified_manifest_v1',
      label: '统一 manifest（avatar + objects）',
      specReady: true,
      adminReady: true,
      runtimeReady: false,
      notes: 'Flutter 仍读分目录 avatar/furniture；根 manifest 待接',
    },
    {
      id: 'avatar_sheet_compose',
      label: 'Avatar 格线 sheet compose',
      specReady: true,
      adminReady: true,
      runtimeReady: true,
      notes: 'petMoeAvatar · PetMoeAvatarComposer',
    },
    {
      id: 'avatar_anchor_model',
      label: 'Avatar 锚点官方模型',
      specReady: true,
      adminReady: false,
      runtimeReady: true,
      notes: 'PetAvatarStack · petMoeAvatar=false',
    },
    {
      id: 'world_object_def',
      label: 'WorldObjectDef 定义',
      specReady: true,
      adminReady: true,
      runtimeReady: false,
    },
    {
      id: 'furniture_place',
      label: '家具布置（拖放/旋转/缩放）',
      specReady: true,
      adminReady: true,
      runtimeReady: true,
      notes: 'PetFurniture 老模型；默认值未读 manifest',
    },
    {
      id: 'scene_presets_v2',
      label: 'scenePresets 官方房间',
      specReady: true,
      adminReady: false,
      runtimeReady: false,
    },
    {
      id: 'interaction_pickup',
      label: 'pickupable / inventory',
      specReady: true,
      adminReady: false,
      runtimeReady: false,
    },
    {
      id: 'interaction_use_action',
      label: 'useAction 交互',
      specReady: true,
      adminReady: false,
      runtimeReady: false,
    },
    {
      id: 'publish_hash_rollback',
      label: 'publish.contentHash + 回滚',
      specReady: true,
      adminReady: false,
      runtimeReady: false,
      notes: 'export 轻量 hash；无 OSS/强制回滚',
    },
    {
      id: 'codegraph_readonly',
      label: 'codegraph 只读生成',
      specReady: true,
      adminReady: true,
      runtimeReady: true,
      notes: 'scripts/codegraph · 不参与 runtime',
    },
  ] as const

export function capabilitiesNotRuntimeReady(): PetContentRuntimeCapability[] {
  return PET_CONTENT_RUNTIME_CAPABILITIES.filter((c) => c.specReady && !c.runtimeReady)
}

export function canClaimOfficialCapability(id: string): boolean {
  const cap = PET_CONTENT_RUNTIME_CAPABILITIES.find((c) => c.id === id)
  return cap?.runtimeReady === true
}
