/** 对齐 moe-avatar/schema/manifest-v1.example.json */

export type AnimationGrid = { cols: number; rows: number }

export type BaseLayerPaths = {
  walk: string
  idle: string
}

/** 动画策略：姿势/动作由 Moe 在 manifest 控制，非 ULPC 全集 */
export type MoeAnimationPolicy = {
  source: 'moe_official'
  description?: string
}

export type SlotLayerPaths = {
  walk: string
  idle: string
  thumb?: string
  /** 显示名（admin 生产 · App 换衣 rail） */
  label?: string
} & BaseLayerPaths

export type MoeAvatarManifest = {
  specVersion: string
  packId: string
  displayName: string
  cellSize: number
  style: string
  directionRows: string[]
  /** 可扩展：walk/idle 为 v1；run/emote/sit 等由官方注册后 App 才播放 */
  animations: Record<string, AnimationGrid>
  animationPolicy?: MoeAnimationPolicy
  composeOrder: string[]
  base: Record<string, BaseLayerPaths>
  slots: Record<string, Record<string, SlotLayerPaths>>
}

/** 嵌入统一 pack 的 avatar 节（无 pack 级 id/name） */
export type MoeAvatarSection = Omit<
  MoeAvatarManifest,
  'specVersion' | 'packId' | 'displayName'
>

export type WearSlot = 'hat' | 'top' | 'bottom' | 'shoes' | (string & {})

export type OutfitSelection = {
  hatId: string
  topId: string
  bottomId: string
  shoesId: string
} & Record<string, string>

export type PreviewAnimation = 'walk' | 'idle'

/** 方向行序：up · left · down · right */
export const DIR_DOWN = 2
