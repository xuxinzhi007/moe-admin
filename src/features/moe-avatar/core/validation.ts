import { AVATAR_TEMPLATE_PRESETS, type AvatarTemplateId } from './templateRegistry'
import type { MoeAvatarManifest } from './types'
import { findDuplicateAssetPaths } from './manifestIntegrity'

export type ManifestValidationIssue = {
  level: 'error' | 'warning'
  code: string
  message: string
  path?: string
}

export type ManifestValidationResult = {
  ok: boolean
  issues: ManifestValidationIssue[]
}

function pushIssue(
  issues: ManifestValidationIssue[],
  level: 'error' | 'warning',
  code: string,
  message: string,
  path?: string,
): void {
  issues.push({ level, code, message, path })
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function validateLayerPair(
  issues: ManifestValidationIssue[],
  kind: 'base' | 'slot',
  key: string,
  layer: { walk?: unknown; idle?: unknown },
): void {
  if (!isNonEmptyString(layer.walk) || !isNonEmptyString(layer.idle)) {
    pushIssue(issues, 'error', `${kind}-layer`, `${kind} layer ${key} needs walk + idle`, `${kind}.${key}`)
  }
}

function validateCommon(manifest: MoeAvatarManifest, issues: ManifestValidationIssue[]): void {
  if (manifest.specVersion !== '1') {
    pushIssue(issues, 'error', 'spec-version', `specVersion must be 1, got ${manifest.specVersion}`)
  }
  if (!manifest.packId) pushIssue(issues, 'error', 'pack-id', 'packId is required')
  if (!manifest.displayName) pushIssue(issues, 'warning', 'display-name', 'displayName is empty')
  if (!manifest.directionRows?.length) {
    pushIssue(issues, 'error', 'directions', 'directionRows is required')
  } else if (!manifest.directionRows.includes('down')) {
    pushIssue(issues, 'warning', 'directions', 'directionRows should include down for editor thumbnails')
  }

  for (const anim of ['walk', 'idle'] as const) {
    const grid = manifest.animations[anim]
    if (!grid) {
      pushIssue(issues, 'error', 'animation-missing', `${anim} animation grid is missing`, `animations.${anim}`)
      continue
    }
    if (!Number.isInteger(grid.cols) || !Number.isInteger(grid.rows) || grid.cols <= 0 || grid.rows <= 0) {
      pushIssue(issues, 'error', 'animation-grid', `${anim} grid must be positive`, `animations.${anim}`)
    }
  }
}

function validateAgainstPreset(
  manifest: MoeAvatarManifest,
  templateId: AvatarTemplateId,
  issues: ManifestValidationIssue[],
): void {
  const preset = AVATAR_TEMPLATE_PRESETS[templateId]
  const allowedBaseKeys = new Set(preset.baseKeys)
  const allowedSlots = new Set(preset.slotKeys)

  if (manifest.cellSize !== preset.cellSize) {
    pushIssue(
      issues,
      'warning',
      'cell-size',
      `cellSize ${manifest.cellSize} differs from template default ${preset.cellSize}`,
      'cellSize',
    )
  }
  if (manifest.style !== preset.style) {
    pushIssue(issues, 'warning', 'style', `style ${manifest.style} differs from template default ${preset.style}`, 'style')
  }
  if (manifest.composeOrder.join('|') !== preset.composeOrder.join('|')) {
    pushIssue(
      issues,
      'warning',
      'compose-order',
      `composeOrder differs from template ${preset.label}`,
      'composeOrder',
    )
  }

  for (const [key, layer] of Object.entries(manifest.base)) {
    if (!allowedBaseKeys.has(key)) {
      pushIssue(issues, 'warning', 'base-unexpected', `base layer ${key} is not part of template ${preset.label}`, `base.${key}`)
    }
    validateLayerPair(issues, 'base', key, layer)
  }

  const missingBaseKeys = preset.baseKeys.filter((key) => !manifest.base[key])
  if (missingBaseKeys.length > 0) {
    pushIssue(issues, 'error', 'base-keys', `base keys must include ${missingBaseKeys.join(', ')}`, 'base')
  }

  for (const key of manifest.composeOrder) {
    if (!allowedBaseKeys.has(key) && !allowedSlots.has(key)) {
      pushIssue(issues, 'error', 'compose-order-key', `composeOrder references unknown key ${key}`, 'composeOrder')
    }
  }

  for (const [slot, items] of Object.entries(manifest.slots)) {
    if (!allowedSlots.has(slot)) {
      pushIssue(issues, 'warning', 'slot-unexpected', `slot ${slot} is not part of template ${preset.label}`, `slots.${slot}`)
    }
    for (const [itemId, layer] of Object.entries(items)) {
      validateLayerPair(issues, 'slot', `${slot}/${itemId}`, layer)
    }
  }

  for (const slot of preset.requiredSlots) {
    const items = manifest.slots[slot]
    if (!items || Object.keys(items).length === 0) {
      pushIssue(
        issues,
        'error',
        'required-slot-missing',
        `required slot ${slot} has no items in template ${preset.label}`,
        `slots.${slot}`,
      )
    }
  }

  for (const [path, refs] of findDuplicateAssetPaths(manifest)) {
    pushIssue(issues, 'warning', 'duplicate-asset-path', `asset path ${path} is shared by ${refs.join(', ')}`, 'slots')
  }

  for (const slot of preset.optionalSlots) {
    if (!allowedSlots.has(slot)) {
      pushIssue(issues, 'warning', 'optional-slot-missing', `optional slot ${slot} is not defined in template ${preset.label}`)
    }
  }
}

export function validateManifestAgainstTemplate(
  manifest: MoeAvatarManifest,
  templateId: AvatarTemplateId,
): ManifestValidationResult {
  const issues: ManifestValidationIssue[] = []
  validateCommon(manifest, issues)
  validateAgainstPreset(manifest, templateId, issues)
  return { ok: !issues.some((issue) => issue.level === 'error'), issues }
}
