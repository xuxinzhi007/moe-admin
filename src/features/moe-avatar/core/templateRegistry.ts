import type { AnimationGrid, BaseLayerPaths, MoeAvatarManifest } from './types'

export type AvatarTemplateId =
  | 'base_character'
  | 'wearable_overlay'
  | 'held_item'
  | 'face_accessory'
  | 'full_replacement'
  | 'pose_variant'

export type AvatarTemplatePreset = {
  id: AvatarTemplateId
  label: string
  category: string
  description: string
  cellSize: number
  directions: readonly string[]
  animations: Readonly<Record<string, AnimationGrid>>
  composeOrder: readonly string[]
  baseKeys: readonly string[]
  slotKeys: readonly string[]
  requiredSlots: readonly string[]
  optionalSlots: readonly string[]
  importSteps: readonly string[]
  style: string
}

const DEFAULT_ANIMATIONS: Record<string, AnimationGrid> = {
  walk: { cols: 9, rows: 4 },
  idle: { cols: 2, rows: 4 },
}

const DEFAULT_DIRECTIONS = ['up', 'left', 'down', 'right']

function cloneAnimationGridMap(source: Readonly<Record<string, AnimationGrid>>): Record<string, AnimationGrid> {
  return Object.fromEntries(Object.entries(source).map(([key, grid]) => [key, { ...grid }]))
}

function cloneBaseLayers(source: Record<string, BaseLayerPaths>): Record<string, BaseLayerPaths> {
  return Object.fromEntries(Object.entries(source).map(([key, layer]) => [key, { ...layer }]))
}

function cloneSlots(source: MoeAvatarManifest['slots']): MoeAvatarManifest['slots'] {
  return Object.fromEntries(
    Object.entries(source).map(([slot, items]) => [
      slot,
      Object.fromEntries(Object.entries(items).map(([itemId, layer]) => [itemId, { ...layer }])),
    ]),
  )
}

const PRESETS: Record<AvatarTemplateId, AvatarTemplatePreset> = {
  base_character: {
    id: 'base_character',
    label: 'Base Character',
    category: '基础角色',
    description: '基础角色模板。用于换装、替换角色与标准站立/行走预览。',
    cellSize: 128,
    directions: DEFAULT_DIRECTIONS,
    animations: DEFAULT_ANIMATIONS,
    composeOrder: ['body', 'bottom', 'top', 'shoes', 'head', 'face', 'hat', 'hair'],
    baseKeys: ['body', 'head', 'face', 'hair'],
    slotKeys: ['hat', 'top', 'bottom', 'shoes'],
    requiredSlots: ['top', 'bottom', 'shoes'],
    optionalSlots: ['hat'],
    importSteps: ['Pick template', 'Load mannequin sheet', 'Import / align layer', 'Export pack'],
    style: 'soft_chibi',
  },
  wearable_overlay: {
    id: 'wearable_overlay',
    label: 'Wearable Overlay',
    category: '叠穿模板',
    description: '叠穿模板。重点处理衣服、帽子、鞋子、背部层。',
    cellSize: 128,
    directions: DEFAULT_DIRECTIONS,
    animations: DEFAULT_ANIMATIONS,
    composeOrder: ['body', 'bottom', 'top', 'shoes', 'back', 'head', 'face', 'hat', 'hair'],
    baseKeys: ['body', 'head', 'face', 'hair'],
    slotKeys: ['back', 'hat', 'top', 'bottom', 'shoes'],
    requiredSlots: ['top', 'bottom', 'shoes'],
    optionalSlots: ['back', 'hat'],
    importSteps: ['Pick template', 'Load mannequin sheet', 'Import / align overlay', 'Export pack'],
    style: 'soft_chibi',
  },
  held_item: {
    id: 'held_item',
    label: 'Held Item',
    category: '道具模板',
    description: '手持物模板。适合武器、工具、道具、双手物件。',
    cellSize: 128,
    directions: DEFAULT_DIRECTIONS,
    animations: DEFAULT_ANIMATIONS,
    composeOrder: ['body', 'bottom', 'top', 'shoes', 'head', 'face', 'hand', 'offhand', 'hat', 'hair'],
    baseKeys: ['body', 'head', 'face', 'hair'],
    slotKeys: ['hand', 'offhand', 'hat', 'top', 'bottom', 'shoes'],
    requiredSlots: ['hand'],
    optionalSlots: ['offhand', 'hat', 'top', 'bottom', 'shoes'],
    importSteps: ['Pick template', 'Load mannequin sheet', 'Place held item', 'Export pack'],
    style: 'soft_chibi',
  },
  face_accessory: {
    id: 'face_accessory',
    label: 'Face Accessory',
    category: '脸饰模板',
    description: '脸部附件模板。适合眼镜、面罩、贴花、表情覆盖。',
    cellSize: 128,
    directions: DEFAULT_DIRECTIONS,
    animations: DEFAULT_ANIMATIONS,
    composeOrder: ['body', 'bottom', 'top', 'shoes', 'head', 'face', 'mask', 'glasses', 'hat', 'hair'],
    baseKeys: ['body', 'head', 'face', 'hair'],
    slotKeys: ['mask', 'glasses', 'hat', 'top', 'bottom', 'shoes'],
    requiredSlots: ['mask', 'glasses'],
    optionalSlots: ['hat', 'top', 'bottom', 'shoes'],
    importSteps: ['Pick template', 'Load mannequin sheet', 'Attach face accessory', 'Export pack'],
    style: 'soft_chibi',
  },
  full_replacement: {
    id: 'full_replacement',
    label: 'Full Replacement',
    category: '整角色替换',
    description: '整角色替换模板。适合完全自定义角色，槽位最少，替换范围最大。',
    cellSize: 128,
    directions: DEFAULT_DIRECTIONS,
    animations: DEFAULT_ANIMATIONS,
    composeOrder: ['body', 'head', 'face', 'hair'],
    baseKeys: ['body', 'head', 'face', 'hair'],
    slotKeys: [],
    requiredSlots: [],
    optionalSlots: [],
    importSteps: ['Pick template', 'Load mannequin sheet', 'Replace all base layers', 'Export pack'],
    style: 'soft_chibi',
  },
  pose_variant: {
    id: 'pose_variant',
    label: 'Pose Variant',
    category: '姿态变体',
    description: '姿态模板。用于站、走、坐、待机等动作族的变体。',
    cellSize: 128,
    directions: DEFAULT_DIRECTIONS,
    animations: DEFAULT_ANIMATIONS,
    composeOrder: ['body', 'bottom', 'top', 'shoes', 'head', 'face', 'hat', 'hair'],
    baseKeys: ['body', 'head', 'face', 'hair'],
    slotKeys: ['hat', 'top', 'bottom', 'shoes'],
    requiredSlots: ['top', 'bottom', 'shoes'],
    optionalSlots: ['hat'],
    importSteps: ['Pick template', 'Load mannequin sheet', 'Adjust pose sheets', 'Export pack'],
    style: 'soft_chibi',
  },
}

export const AVATAR_TEMPLATE_PRESETS = PRESETS

export function createManifestFromTemplate(
  templateId: AvatarTemplateId,
  overrides: Partial<MoeAvatarManifest> = {},
): MoeAvatarManifest {
  const preset = PRESETS[templateId]
  const base: MoeAvatarManifest['base'] = Object.fromEntries(
    preset.baseKeys.map((key) => [key, { walk: '', idle: '' }]),
  )
  const slots: MoeAvatarManifest['slots'] = Object.fromEntries(
    preset.slotKeys.map((key) => [key, {}]),
  )

  return {
    specVersion: '1',
    packId: overrides.packId ?? `moe-${preset.id}-v1`,
    displayName: overrides.displayName ?? preset.label,
    cellSize: overrides.cellSize ?? preset.cellSize,
    style: overrides.style ?? preset.style,
    directionRows: [...(overrides.directionRows ?? preset.directions)],
    animations: cloneAnimationGridMap(overrides.animations ?? preset.animations),
    composeOrder: [...(overrides.composeOrder ?? preset.composeOrder)],
    base: cloneBaseLayers(overrides.base ?? base),
    slots: cloneSlots(overrides.slots ?? slots),
    animationPolicy: overrides.animationPolicy ? { ...overrides.animationPolicy } : { source: 'moe_official' },
  }
}

export function templatePresetLabel(templateId: AvatarTemplateId): string {
  return PRESETS[templateId].label
}

export function templatePresetDescription(templateId: AvatarTemplateId): string {
  return PRESETS[templateId].description
}
