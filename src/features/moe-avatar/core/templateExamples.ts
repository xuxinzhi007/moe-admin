import { createManifestFromTemplate, type AvatarTemplateId } from './templateRegistry'
import type { MoeAvatarManifest } from './types'
import type { TemplateSelection } from './resolveLayers'

export type TemplateExampleCase = {
  id: string
  templateId: AvatarTemplateId
  label: string
  description: string
  manifest: MoeAvatarManifest
  selection: TemplateSelection
}

function seedSelection(entries: Record<string, string>): TemplateSelection {
  return { ...entries }
}

function slotItem(walk: string, idle: string, label: string) {
  return { walk, idle, label }
}

function defaultBase() {
  return {
    body: { walk: 'layers/base/body_walk.png', idle: 'layers/base/body_idle.png' },
    head: { walk: 'layers/base/head_walk.png', idle: 'layers/base/head_idle.png' },
    face: { walk: 'layers/base/face_walk.png', idle: 'layers/base/face_idle.png' },
    hair: { walk: 'layers/base/hair_walk.png', idle: 'layers/base/hair_idle.png' },
  }
}

function withParts(
  manifest: MoeAvatarManifest,
  slots: Record<string, Record<string, { walk: string; idle: string; label: string }>>,
): MoeAvatarManifest {
  return {
    ...manifest,
    base: defaultBase(),
    slots: {
      ...manifest.slots,
      ...slots,
    },
  }
}

export const AVATAR_TEMPLATE_EXAMPLES: TemplateExampleCase[] = [
  {
    id: 'base-character-basic',
    templateId: 'base_character',
    label: 'Base Character · Basic Outfit',
    description: '基础角色换装示例，使用现有公开 pack 资源。',
    manifest: withParts(
      createManifestFromTemplate('base_character', {
        packId: 'moe-base-character-example-v1',
        displayName: 'Base Character Example',
        base: defaultBase(),
      }),
      {
        hat: {
          hat_cap: slotItem('layers/slots/hat_cap_walk.svg', 'layers/slots/hat_cap_idle.svg', 'Cap'),
        },
        top: {
          top_basic: slotItem('layers/slots/top_basic_walk.png', 'layers/slots/top_basic_idle.png', 'Basic Top'),
        },
        bottom: {
          bottom_basic: slotItem(
            'layers/slots/bottom_basic_walk.png',
            'layers/slots/bottom_basic_idle.png',
            'Basic Bottom',
          ),
        },
        shoes: {
          shoes_basic: slotItem(
            'layers/slots/shoes_basic_walk.png',
            'layers/slots/shoes_basic_idle.png',
            'Basic Shoes',
          ),
        },
      },
    ),
    selection: seedSelection({ hat: '', top: 'top_basic', bottom: 'bottom_basic', shoes: 'shoes_basic' }),
  },
  {
    id: 'wearable-overlay-layered',
    templateId: 'wearable_overlay',
    label: 'Wearable Overlay · Layered',
    description: '叠穿模板示例，含背部层与帽子层。',
    manifest: withParts(
      createManifestFromTemplate('wearable_overlay', {
        packId: 'moe-wearable-overlay-example-v1',
        displayName: 'Wearable Overlay Example',
        base: defaultBase(),
      }),
      {
        back: {
          back_cloak: slotItem(
            'layers/slots/back_cloak_walk.svg',
            'layers/slots/back_cloak_idle.svg',
            'Cloak Back',
          ),
        },
        hat: {
          hat_cap: slotItem('layers/slots/hat_cap_walk.svg', 'layers/slots/hat_cap_idle.svg', 'Cap'),
        },
        top: {
          top_basic: slotItem('layers/slots/top_basic_walk.png', 'layers/slots/top_basic_idle.png', 'Basic Top'),
        },
        bottom: {
          bottom_basic: slotItem(
            'layers/slots/bottom_basic_walk.png',
            'layers/slots/bottom_basic_idle.png',
            'Basic Bottom',
          ),
        },
        shoes: {
          shoes_basic: slotItem(
            'layers/slots/shoes_basic_walk.png',
            'layers/slots/shoes_basic_idle.png',
            'Basic Shoes',
          ),
        },
      },
    ),
    selection: seedSelection({
      back: 'back_cloak',
      hat: 'hat_cap',
      top: 'top_basic',
      bottom: 'bottom_basic',
      shoes: 'shoes_basic',
    }),
  },
  {
    id: 'held-item-utility',
    templateId: 'held_item',
    label: 'Held Item · Utility',
    description: '手持物模板示例，强调左右手物件。',
    manifest: withParts(
      createManifestFromTemplate('held_item', {
        packId: 'moe-held-item-example-v1',
        displayName: 'Held Item Example',
        base: defaultBase(),
      }),
      {
        hand: {
          hand_staff: slotItem('layers/slots/hand_staff_walk.svg', 'layers/slots/hand_staff_idle.svg', 'Staff'),
        },
        offhand: {
          offhand_shield: slotItem(
            'layers/slots/offhand_shield_walk.svg',
            'layers/slots/offhand_shield_idle.svg',
            'Shield',
          ),
        },
        hat: {
          hat_cap: slotItem('layers/slots/hat_cap_walk.svg', 'layers/slots/hat_cap_idle.svg', 'Cap'),
        },
        top: {
          top_basic: slotItem('layers/slots/top_basic_walk.png', 'layers/slots/top_basic_idle.png', 'Basic Top'),
        },
        bottom: {
          bottom_basic: slotItem(
            'layers/slots/bottom_basic_walk.png',
            'layers/slots/bottom_basic_idle.png',
            'Basic Bottom',
          ),
        },
        shoes: {
          shoes_basic: slotItem(
            'layers/slots/shoes_basic_walk.png',
            'layers/slots/shoes_basic_idle.png',
            'Basic Shoes',
          ),
        },
      },
    ),
    selection: seedSelection({
      hand: 'hand_staff',
      offhand: 'offhand_shield',
      hat: 'hat_cap',
      top: 'top_basic',
      bottom: 'bottom_basic',
      shoes: 'shoes_basic',
    }),
  },
  {
    id: 'face-accessory-shades',
    templateId: 'face_accessory',
    label: 'Face Accessory · Shades',
    description: '脸部附件模板示例，支持眼镜和面罩。',
    manifest: withParts(
      createManifestFromTemplate('face_accessory', {
        packId: 'moe-face-accessory-example-v1',
        displayName: 'Face Accessory Example',
        base: defaultBase(),
      }),
      {
        mask: {
          mask_soft: slotItem('layers/slots/mask_soft_walk.svg', 'layers/slots/mask_soft_idle.svg', 'Soft Mask'),
        },
        glasses: {
          glasses_round: slotItem(
            'layers/slots/glasses_round_walk.svg',
            'layers/slots/glasses_round_idle.svg',
            'Round Glasses',
          ),
        },
        hat: {
          hat_cap: slotItem('layers/slots/hat_cap_walk.svg', 'layers/slots/hat_cap_idle.svg', 'Cap'),
        },
        top: {
          top_basic: slotItem('layers/slots/top_basic_walk.png', 'layers/slots/top_basic_idle.png', 'Basic Top'),
        },
        bottom: {
          bottom_basic: slotItem(
            'layers/slots/bottom_basic_walk.png',
            'layers/slots/bottom_basic_idle.png',
            'Basic Bottom',
          ),
        },
        shoes: {
          shoes_basic: slotItem(
            'layers/slots/shoes_basic_walk.png',
            'layers/slots/shoes_basic_idle.png',
            'Basic Shoes',
          ),
        },
      },
    ),
    selection: seedSelection({
      glasses: 'glasses_round',
      mask: 'mask_soft',
      hat: 'hat_cap',
      top: 'top_basic',
      bottom: 'bottom_basic',
      shoes: 'shoes_basic',
    }),
  },
  {
    id: 'full-replacement-clean',
    templateId: 'full_replacement',
    label: 'Full Replacement · Clean',
    description: '整角色替换模板示例，仅保留基础四层。',
    manifest: createManifestFromTemplate('full_replacement', {
      packId: 'moe-full-replacement-example-v1',
      displayName: 'Full Replacement Example',
    }),
    selection: seedSelection({}),
  },
  {
    id: 'pose-variant-walk',
    templateId: 'pose_variant',
    label: 'Pose Variant · Walk',
    description: '姿态模板示例，适合动作族扩展。',
    manifest: withParts(
      createManifestFromTemplate('pose_variant', {
        packId: 'moe-pose-variant-example-v1',
        displayName: 'Pose Variant Example',
        base: defaultBase(),
      }),
      {
        hat: {
          hat_cap: slotItem('layers/slots/hat_cap_walk.svg', 'layers/slots/hat_cap_idle.svg', 'Cap'),
        },
        top: {
          top_basic: slotItem('layers/slots/top_basic_walk.png', 'layers/slots/top_basic_idle.png', 'Basic Top'),
        },
        bottom: {
          bottom_basic: slotItem(
            'layers/slots/bottom_basic_walk.png',
            'layers/slots/bottom_basic_idle.png',
            'Basic Bottom',
          ),
        },
        shoes: {
          shoes_basic: slotItem(
            'layers/slots/shoes_basic_walk.png',
            'layers/slots/shoes_basic_idle.png',
            'Basic Shoes',
          ),
        },
      },
    ),
    selection: seedSelection({
      hat: 'hat_cap',
      top: 'top_basic',
      bottom: 'bottom_basic',
      shoes: 'shoes_basic',
    }),
  },
]

export function exampleCaseByTemplate(templateId: AvatarTemplateId): TemplateExampleCase[] {
  return AVATAR_TEMPLATE_EXAMPLES.filter((entry) => entry.templateId === templateId)
}
