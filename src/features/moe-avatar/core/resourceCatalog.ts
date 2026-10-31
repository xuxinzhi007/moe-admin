import { ORIGINALS_PREFIX } from './assetStore'

export type ResourceScope = 'official' | 'session' | 'original'

export type ResourceGroup = '素体' | '槽位' | '会话资源' | '原图归档' | '其他'

export type ResourceCategory =
  | '身体'
  | '头部'
  | '脸部'
  | '发型'
  | '帽饰'
  | '上衣'
  | '下装'
  | '鞋子'
  | '背部'
  | '手持'
  | '副手'
  | '面罩'
  | '眼镜'
  | '其他'

export type ResourceClassification = {
  scope: ResourceScope
  group: ResourceGroup
  category: ResourceCategory
  slot?: string
  itemId?: string
  ext: string
}

export const RESOURCE_GROUP_ORDER: ResourceGroup[] = ['素体', '槽位', '会话资源', '原图归档', '其他']

const SLOT_RULES: Array<{ prefix: string; slot: string; category: ResourceCategory }> = [
  { prefix: 'body_', slot: 'body', category: '身体' },
  { prefix: 'head_', slot: 'head', category: '头部' },
  { prefix: 'face_', slot: 'face', category: '脸部' },
  { prefix: 'hair_', slot: 'hair', category: '发型' },
  { prefix: 'hat_', slot: 'hat', category: '帽饰' },
  { prefix: 'top_', slot: 'top', category: '上衣' },
  { prefix: 'bottom_', slot: 'bottom', category: '下装' },
  { prefix: 'shoes_', slot: 'shoes', category: '鞋子' },
  { prefix: 'back_', slot: 'back', category: '背部' },
  { prefix: 'hand_', slot: 'hand', category: '手持' },
  { prefix: 'offhand_', slot: 'offhand', category: '副手' },
  { prefix: 'mask_', slot: 'mask', category: '面罩' },
  { prefix: 'glasses_', slot: 'glasses', category: '眼镜' },
]

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/')
}

function pathName(path: string): string {
  const normalized = normalizePath(path)
  return normalized.split('/').pop() ?? normalized
}

function pathStem(path: string): string {
  return pathName(path).replace(/\.[^.]+$/, '')
}

function inferSlot(stem: string): { slot?: string; category: ResourceCategory } {
  for (const rule of SLOT_RULES) {
    if (stem.startsWith(rule.prefix)) return { slot: rule.slot, category: rule.category }
  }
  return { category: '其他' }
}

function extForPath(path: string): string {
  return pathName(path).split('.').pop()?.toLowerCase() ?? 'unknown'
}

export function classifyResourcePath(path: string, inManifest: boolean): ResourceClassification {
  const normalized = normalizePath(path)
  const ext = extForPath(normalized)

  if (normalized.startsWith(ORIGINALS_PREFIX)) {
    return { scope: 'original', group: '原图归档', category: '其他', ext }
  }

  const stem = pathStem(normalized)
  const slot = inferSlot(stem)

  if (!inManifest) {
    return {
      scope: 'session',
      group: '会话资源',
      category: slot.category,
      slot: slot.slot,
      ext,
    }
  }

  if (normalized.includes('/base/')) {
    return {
      scope: 'official',
      group: '素体',
      category: slot.category === '其他' ? '身体' : slot.category,
      slot: slot.slot,
      ext,
    }
  }

  if (normalized.includes('/slots/')) {
    return {
      scope: 'official',
      group: '槽位',
      category: slot.category,
      slot: slot.slot,
      ext,
    }
  }

  return { scope: 'official', group: '其他', category: slot.category, slot: slot.slot, ext }
}

export function resourceGroupSortIndex(group: ResourceGroup): number {
  const index = RESOURCE_GROUP_ORDER.indexOf(group)
  return index >= 0 ? index : RESOURCE_GROUP_ORDER.length
}
