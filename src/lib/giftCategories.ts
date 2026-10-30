export const GIFT_CATEGORIES = [
  { value: 'emotion', label: '情感' },
  { value: 'food', label: '美食' },
  { value: 'luxury', label: '奢华' },
  { value: 'special', label: '特别' },
] as const

export function giftCategoryLabel(category: string): string {
  return GIFT_CATEGORIES.find((item) => item.value === category)?.label ?? category
}
