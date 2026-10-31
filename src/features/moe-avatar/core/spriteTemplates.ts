import type { SpriteResource, SpriteTemplate } from './spriteTypes'

const CHARACTER_ANIMATIONS = [{ id: 'idle', frameCount: 1, loop: true }]

export const SPRITE_TEMPLATES = {
  character_64: {
    id: 'character_64',
    label: 'Character 64',
    description: 'A four-direction character grid using 64px frames.',
    kind: 'character',
    canvas: { width: 64, height: 256 },
    anchor: { x: 32, y: 60 },
    animations: CHARACTER_ANIMATIONS,
    frameLayout: { mode: 'directional_grid', frameWidth: 64, frameHeight: 64, columns: 1, rows: 4 },
  },
  character_128: {
    id: 'character_128',
    label: 'Character 128',
    description: 'A four-direction character grid using 128px frames.',
    kind: 'character',
    canvas: { width: 128, height: 512 },
    anchor: { x: 64, y: 124 },
    animations: CHARACTER_ANIMATIONS,
    frameLayout: { mode: 'directional_grid', frameWidth: 128, frameHeight: 128, columns: 1, rows: 4 },
  },
  animation_strip_4: {
    id: 'animation_strip_4',
    label: 'Animation Strip 4',
    description: 'A four-frame horizontal animation strip for objects or effects.',
    kind: 'effect',
    canvas: { width: 256, height: 64 },
    anchor: { x: 32, y: 32 },
    animations: [{ id: 'default', frameCount: 4, loop: true }],
    frameLayout: { mode: 'animation_strip', frameWidth: 64, frameHeight: 64, columns: 4, rows: 1 },
  },
  animation_strip_16: {
    id: 'animation_strip_16',
    label: 'Animation Strip 16',
    description: 'A longer sixteen-frame strip for video samples and motion drafts.',
    kind: 'effect',
    canvas: { width: 1024, height: 64 },
    anchor: { x: 32, y: 32 },
    animations: [{ id: 'default', frameCount: 16, loop: true }],
    frameLayout: { mode: 'animation_strip', frameWidth: 64, frameHeight: 64, columns: 16, rows: 1 },
  },
  animation_strip_32: {
    id: 'animation_strip_32',
    label: 'Animation Strip 32',
    description: 'A high-frame strip for longer video samples.',
    kind: 'effect',
    canvas: { width: 2048, height: 64 },
    anchor: { x: 32, y: 32 },
    animations: [{ id: 'default', frameCount: 32, loop: true }],
    frameLayout: { mode: 'animation_strip', frameWidth: 64, frameHeight: 64, columns: 32, rows: 1 },
  },
  object_freeform: {
    id: 'object_freeform',
    label: 'Object Freeform',
    description: 'A single freely anchored object frame.',
    kind: 'object',
    canvas: { width: 128, height: 128 },
    anchor: { x: 64, y: 64 },
    animations: [{ id: 'default', frameCount: 1, loop: false }],
    frameLayout: { mode: 'single_frame', frameWidth: 128, frameHeight: 128, columns: 1, rows: 1 },
  },
} satisfies Record<string, SpriteTemplate>

export type SpriteTemplateId = keyof typeof SPRITE_TEMPLATES

export function createSpriteFromTemplate(
  templateId: SpriteTemplateId,
  sourcePath: string,
  overrides: Partial<Omit<SpriteResource, 'source'>> = {},
): SpriteResource {
  const template = SPRITE_TEMPLATES[templateId]
  return {
    id: overrides.id ?? template.id,
    kind: overrides.kind ?? template.kind,
    templateId,
    ...(overrides.status ? { status: overrides.status } : {}),
    ...(overrides.directions ? { directions: [...overrides.directions] } : {}),
    ...(overrides.sheet ? { sheet: overrides.sheet } : {}),
    canvas: { ...template.canvas, ...overrides.canvas },
    anchor: { ...template.anchor, ...overrides.anchor },
    animations: overrides.animations?.map((animation) => ({ ...animation })) ?? template.animations.map((animation) => ({ ...animation })),
    frameLayout: { ...template.frameLayout, ...overrides.frameLayout },
    source: { path: sourcePath },
    ...(overrides.layers ? { layers: overrides.layers.map((layer) => ({ ...layer })) } : {}),
    ...(overrides.frames ? { frames: overrides.frames.map((adjustment) => ({ ...adjustment, ...(adjustment.anchor ? { anchor: { ...adjustment.anchor } } : {}) })) } : {}),
    ...(overrides.frameAdjustments ? { frameAdjustments: overrides.frameAdjustments.map((adjustment) => ({ ...adjustment, ...(adjustment.anchor ? { anchor: { ...adjustment.anchor } } : {}) })) } : {}),
  }
}
