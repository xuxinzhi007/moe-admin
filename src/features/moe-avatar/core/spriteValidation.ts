import type { SpriteGenerationMode, SpriteResource, SpriteTemplateMode } from './spriteTypes'

export type SpriteValidationIssue = {
  code: string
  message: string
  path?: string
}

export type SpriteValidationResult = {
  ok: boolean
  issues: SpriteValidationIssue[]
}

function issue(issues: SpriteValidationIssue[], code: string, message: string, path?: string): void {
  issues.push({ code, message, path })
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0
}

function isFiniteNumber(value: number): boolean {
  return typeof value === 'number' && Number.isFinite(value)
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function validateSpriteResource(resource: SpriteResource): SpriteValidationResult {
  const issues: SpriteValidationIssue[] = []

  if (!isNonEmpty(resource.id)) issue(issues, 'id-required', 'id must be non-empty', 'id')
  if (!isNonEmpty(resource.source.path)) issue(issues, 'source-path-required', 'source.path must be non-empty', 'source.path')
  if (resource.generation !== undefined) {
    const validGenerationModes: SpriteGenerationMode[] = ['source_frames', 'video_extracted', 'synthetic_transform']
    if (!validGenerationModes.includes(resource.generation.mode)) {
      issue(issues, 'generation-mode-invalid', 'generation.mode is invalid', 'generation.mode')
    }
    if (resource.generation.action !== undefined && !isNonEmpty(resource.generation.action)) {
      issue(issues, 'generation-action-required', 'generation.action must be non-empty', 'generation.action')
    }
  }
  if ((resource.status === 'ready' || resource.status === 'published') && !isNonEmpty(resource.sheet)) {
    issue(issues, 'runtime-sheet-required', 'ready or published resources need a normalized runtime sheet', 'sheet')
  }

  const directions = resource.directions ?? []
  const directionIds = new Set<string>()
  for (const [index, direction] of directions.entries()) {
    if (!isNonEmpty(direction)) issue(issues, 'direction-invalid', 'direction must be non-empty', `directions.${index}`)
    if (directionIds.has(direction)) issue(issues, 'duplicate-direction', `direction ${direction} is duplicated`, `directions.${index}`)
    directionIds.add(direction)
  }

  for (const [name, value] of Object.entries(resource.canvas)) {
    if (!isPositiveInteger(value)) issue(issues, 'dimension-invalid', `${name} must be a positive integer`, `canvas.${name}`)
  }

  const validModes: SpriteTemplateMode[] = ['single_frame', 'animation_strip', 'directional_grid', 'layered_composition']
  if (!validModes.includes(resource.frameLayout.mode)) {
    issue(issues, 'frame-layout-mode-invalid', 'frameLayout.mode is invalid', 'frameLayout.mode')
  }
  for (const [name, value] of Object.entries(resource.frameLayout)) {
    if (name !== 'mode' && !isPositiveInteger(value as number)) {
      issue(issues, 'frame-layout-invalid', `${name} must be a positive integer`, `frameLayout.${name}`)
    }
  }

  if (resource.frameLayout.mode === 'directional_grid' && directions.length > 0 && directions.length !== resource.frameLayout.rows) {
    issue(issues, 'direction-count-mismatch', 'direction count must match directional grid rows', 'directions')
  }

  if (!isFiniteNumber(resource.anchor.x) || resource.anchor.x < 0 || resource.anchor.x > resource.frameLayout.frameWidth) {
    issue(issues, 'anchor-out-of-bounds', 'anchor.x must be within a frame', 'anchor.x')
  }
  if (!isFiniteNumber(resource.anchor.y) || resource.anchor.y < 0 || resource.anchor.y > resource.frameLayout.frameHeight) {
    issue(issues, 'anchor-out-of-bounds', 'anchor.y must be within a frame', 'anchor.y')
  }

  const capacity = resource.frameLayout.columns * resource.frameLayout.rows
  const layoutWidth = resource.frameLayout.frameWidth * resource.frameLayout.columns
  const layoutHeight = resource.frameLayout.frameHeight * resource.frameLayout.rows
  if (layoutWidth !== resource.canvas.width) {
    issue(issues, 'layout-dimension-mismatch', 'frame layout width must match canvas width', 'frameLayout')
  }
  if (layoutHeight !== resource.canvas.height) {
    issue(issues, 'layout-dimension-mismatch', 'frame layout height must match canvas height', 'frameLayout')
  }

  for (const [index, animation] of resource.animations.entries()) {
    const path = `animations.${index}`
    if (!isNonEmpty(animation.id)) issue(issues, 'animation-id-required', 'animation id must be non-empty', `${path}.id`)
    if (!isPositiveInteger(animation.frameCount)) issue(issues, 'frame-count-invalid', 'frameCount must be a positive integer', `${path}.frameCount`)
    if (animation.frameCount > capacity) issue(issues, 'frame-count-exceeds-layout', 'frameCount exceeds frame layout capacity', `${path}.frameCount`)
    if (animation.startFrame !== undefined && (!Number.isInteger(animation.startFrame) || animation.startFrame < 0 || animation.startFrame >= capacity)) {
      issue(issues, 'start-frame-invalid', 'startFrame must reference a frame in the layout', `${path}.startFrame`)
    }
    if (animation.startFrame !== undefined && isPositiveInteger(animation.frameCount) && animation.startFrame + animation.frameCount > capacity) {
      issue(issues, 'animation-range-invalid', 'animation frame range exceeds frame layout capacity', path)
    }
    if (animation.frameRate !== undefined && (!isFiniteNumber(animation.frameRate) || animation.frameRate <= 0)) {
      issue(issues, 'frame-rate-invalid', 'frameRate must be a positive number', `${path}.frameRate`)
    }
    if (animation.direction !== undefined && (!isNonEmpty(animation.direction) || (directions.length > 0 && !directionIds.has(animation.direction)))) {
      issue(issues, 'animation-direction-invalid', 'animation direction must be declared in directions', `${path}.direction`)
    }
  }

  const layerIds = new Set<string>()
  for (const [index, layer] of (resource.layers ?? []).entries()) {
    const path = `layers.${index}`
    if (!isNonEmpty(layer.id)) issue(issues, 'layer-id-required', 'layer id must be non-empty', `${path}.id`)
    if (!isNonEmpty(layer.path)) issue(issues, 'layer-path-required', 'layer path must be non-empty', `${path}.path`)
    if (layerIds.has(layer.id)) issue(issues, 'duplicate-layer-id', `layer id ${layer.id} is duplicated`, `${path}.id`)
    layerIds.add(layer.id)
  }

  const frameAdjustmentGroups = [
    ['frames', resource.frames ?? []],
    ['frameAdjustments', resource.frameAdjustments ?? []],
  ] as const
  for (const [field, adjustments] of frameAdjustmentGroups) {
    for (const [index, adjustment] of adjustments.entries()) {
      const path = `${field}.${index}`
      if (!Number.isInteger(adjustment.frame) || adjustment.frame < 0 || adjustment.frame >= capacity) {
        issue(issues, 'frame-index-invalid', 'frame must reference a frame in the layout', `${path}.frame`)
      }
      if (adjustment.endFrame !== undefined && (!Number.isInteger(adjustment.endFrame) || adjustment.endFrame < adjustment.frame || adjustment.endFrame >= capacity)) {
        issue(issues, 'frame-range-invalid', 'endFrame must be an inclusive frame range endpoint in the layout', `${path}.endFrame`)
      }
      if (!isFiniteNumber(adjustment.offsetX)) issue(issues, 'frame-offset-invalid', 'offsetX must be finite', `${path}.offsetX`)
      if (!isFiniteNumber(adjustment.offsetY)) issue(issues, 'frame-offset-invalid', 'offsetY must be finite', `${path}.offsetY`)
      if (!isFiniteNumber(adjustment.scale) || adjustment.scale <= 0) issue(issues, 'frame-scale-invalid', 'scale must be a positive finite number', `${path}.scale`)
      if (adjustment.scaleX !== undefined && (!isFiniteNumber(adjustment.scaleX) || adjustment.scaleX <= 0)) issue(issues, 'frame-scale-x-invalid', 'scaleX must be a positive finite number', `${path}.scaleX`)
      if (adjustment.scaleY !== undefined && (!isFiniteNumber(adjustment.scaleY) || adjustment.scaleY <= 0)) issue(issues, 'frame-scale-y-invalid', 'scaleY must be a positive finite number', `${path}.scaleY`)
      if (adjustment.rotation !== undefined && !isFiniteNumber(adjustment.rotation)) issue(issues, 'frame-rotation-invalid', 'rotation must be finite', `${path}.rotation`)
      if (adjustment.anchor !== undefined) {
        if (!isFiniteNumber(adjustment.anchor.x) || adjustment.anchor.x < 0 || adjustment.anchor.x > resource.frameLayout.frameWidth) {
          issue(issues, 'frame-anchor-out-of-bounds', 'anchor.x must be within a frame', `${path}.anchor.x`)
        }
        if (!isFiniteNumber(adjustment.anchor.y) || adjustment.anchor.y < 0 || adjustment.anchor.y > resource.frameLayout.frameHeight) {
          issue(issues, 'frame-anchor-out-of-bounds', 'anchor.y must be within a frame', `${path}.anchor.y`)
        }
      }
    }
  }

  return { ok: issues.length === 0, issues }
}

export const validateSpriteAsset = validateSpriteResource
