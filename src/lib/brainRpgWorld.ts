export type RpgZoneId = 'camp' | 'meadow' | 'memory_shrine' | 'post_stage' | 'skill_grove'

export type RpgZone = {
  id: RpgZoneId
  label: string
  hint: string
  actionHint: string
  /** 区域中心（百分比，相对场景） */
  cx: number
  cy: number
  /** 漫游边界 */
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export const RPG_ZONES: Record<RpgZoneId, RpgZone> = {
  camp: {
    id: 'camp',
    label: '营地',
    hint: 'Bot 发呆、歇脚的地方',
    actionHint: '开启自主思考，观察它自言自语',
    cx: 18,
    cy: 28,
    minX: 8,
    maxX: 32,
    minY: 18,
    maxY: 38,
  },
  meadow: {
    id: 'meadow',
    label: '草原',
    hint: '闲逛探索，随机碰运气',
    actionHint: '试跑发帖后它会在这里琢磨新话题',
    cx: 52,
    cy: 32,
    minX: 34,
    maxX: 72,
    minY: 22,
    maxY: 48,
  },
  memory_shrine: {
    id: 'memory_shrine',
    label: '记忆神社',
    hint: '入梦、整理、压缩记忆的仪式区',
    actionHint: '点「入梦整理」或「压缩记忆」，Bot 会走过来',
    cx: 82,
    cy: 30,
    minX: 68,
    maxX: 92,
    minY: 20,
    maxY: 42,
  },
  post_stage: {
    id: 'post_stage',
    label: '发帖台',
    hint: '试跑流水线：加载 → 记忆 → 生成 → 发布',
    actionHint: '工作台点「试跑发帖」',
    cx: 50,
    cy: 58,
    minX: 36,
    maxX: 64,
    minY: 48,
    maxY: 68,
  },
  skill_grove: {
    id: 'skill_grove',
    label: '技能树',
    hint: '锁定 tag 后会常来这边徘徊',
    actionHint: '在下方技能列表锁定标签',
    cx: 22,
    cy: 58,
    minX: 10,
    maxX: 38,
    minY: 48,
    maxY: 68,
  },
}

export function zoneForActivity(activity: string, lockedSkills = 0): RpgZoneId {
  switch (activity) {
    case 'posting':
      return 'post_stage'
    case 'dreaming':
    case 'tidying':
    case 'compressing':
      return 'memory_shrine'
    case 'exploring':
    case 'walking':
      return lockedSkills > 0 ? 'skill_grove' : 'meadow'
    case 'idle':
    default:
      return 'camp'
  }
}

export function pickWanderPoint(zone: RpgZone, from?: { x: number; y: number }) {
  let x = zone.minX + Math.random() * (zone.maxX - zone.minX)
  let y = zone.minY + Math.random() * (zone.maxY - zone.minY)
  if (from) {
    let guard = 0
    while (Math.hypot(x - from.x, y - from.y) < 10 && guard < 6) {
      x = zone.minX + Math.random() * (zone.maxX - zone.minX)
      y = zone.minY + Math.random() * (zone.maxY - zone.minY)
      guard += 1
    }
  }
  return { x, y }
}
