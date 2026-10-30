/**
 * Legacy furniture/decor aliases — **兼容层 · 过渡职责 only**
 *
 * 规范 SSOT：`petContentPackTypes.ts` + `worldObject.ts`
 * 退场计划：`docs/dev/pet-content-pack-maturity.md` §5（目标 2026-12-31）
 *
 * @deprecated 新代码请 import 自 `petContentPack.ts` / `worldObject.ts`；勿在此新增类型。
 */
import type {
  LegacyFurnitureItem as FurnitureItemDef,
  LegacyFurnitureManifest as FurnitureManifest,
} from './petContentPack'

export type { FurnitureItemDef, FurnitureManifest }

/** @deprecated 装饰应演进为 WorldObjectDef kind=decor；2026-12-31 前收敛 */
export type DecorItemDef = FurnitureItemDef & {
  /** wall | floor | hanging */
  placement?: 'wall' | 'floor' | 'hanging'
}

/** @deprecated 见 DecorItemDef */
export type DecorManifest = Omit<FurnitureManifest, 'kind' | 'items'> & {
  kind: 'decor'
  items: Record<string, DecorItemDef>
}
