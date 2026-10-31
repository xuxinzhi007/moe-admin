import type { MoeAvatarManifest } from './types'

/** 商品 id 显示名 fallback（与 Flutter PetLabels 对齐 subset） */
export const ITEM_LABELS: Record<string, string> = {
  hat_cap: '鸭舌帽',
  hat_beret: '贝雷帽',
  top_basic: '基础上衣',
  top_hoodie: '连帽衫',
  top_tee: 'T恤',
  bottom_basic: '基础下装',
  bottom_jeans: '牛仔裤',
  shoes_basic: '基础鞋',
  shoes_sneaker: '运动鞋',
}

export function itemLabel(
  id: string,
  manifest?: MoeAvatarManifest | null,
  slot?: string,
): string {
  if (!id) return '无'
  if (manifest && slot) {
    const fromManifest = manifest.slots[slot]?.[id]?.label
    if (fromManifest) return fromManifest
  }
  return ITEM_LABELS[id] ?? id
}
