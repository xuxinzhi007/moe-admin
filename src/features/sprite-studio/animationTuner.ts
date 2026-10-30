export type FrameTransform = {
  scale: number
  scaleX: number
  scaleY: number
  rotation: number
  offsetX: number
  offsetY: number
}

export const DEFAULT_FRAME_TRANSFORM: FrameTransform = {
  scale: 100,
  scaleX: 100,
  scaleY: 100,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
}

export function normalizeFrameTransform(value?: Partial<FrameTransform>): FrameTransform {
  const scale = Number.isFinite(value?.scale) ? Number(value?.scale) : DEFAULT_FRAME_TRANSFORM.scale
  return {
    scale,
    scaleX: Number.isFinite(value?.scaleX) ? Number(value?.scaleX) : scale,
    scaleY: Number.isFinite(value?.scaleY) ? Number(value?.scaleY) : scale,
    rotation: Number.isFinite(value?.rotation) ? Number(value?.rotation) : DEFAULT_FRAME_TRANSFORM.rotation,
    offsetX: Number.isFinite(value?.offsetX) ? Number(value?.offsetX) : DEFAULT_FRAME_TRANSFORM.offsetX,
    offsetY: Number.isFinite(value?.offsetY) ? Number(value?.offsetY) : DEFAULT_FRAME_TRANSFORM.offsetY,
  }
}

export function updateFrameTransforms(
  transforms: readonly FrameTransform[],
  frameCount: number,
  targetIndices: readonly number[],
  key: keyof FrameTransform,
  value: number,
): FrameTransform[] {
  const targets = new Set(targetIndices)
  return Array.from({ length: frameCount }, (_, index) => {
    const current = normalizeFrameTransform(transforms[index])
    return targets.has(index) ? { ...current, [key]: value } : current
  })
}
