import JSZip from 'jszip'
import {
  MOE_AVATAR_MANIFEST_URL,
  MOE_AVATAR_PACK_BASE,
  MOE_FURNITURE_MANIFEST_URL,
  MOE_FURNITURE_PACK_BASE,
} from './constants'
import {
  assetUrl,
  downloadBlob,
  fetchBlob,
} from './exportPack'
import type { MoeAvatarManifest } from '../moe-avatar/types'
import {
  buildUnifiedManifest,
  collectAvatarAssetPaths,
  type LegacyFurnitureManifest,
} from './petContentPack'
import { validatePackManifest } from './petContentPackTypes'

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** 导出完整养成内容包：manifest.json + avatar/* + objects/*（校验失败即阻断） */
export async function exportUnifiedPetPack(): Promise<void> {
  const [avatarRes, furnitureRes] = await Promise.all([
    fetch(MOE_AVATAR_MANIFEST_URL),
    fetch(MOE_FURNITURE_MANIFEST_URL),
  ])
  if (!avatarRes.ok) {
    throw new Error(`avatar manifest: ${avatarRes.status}`)
  }
  if (!furnitureRes.ok) {
    throw new Error(`furniture manifest: ${furnitureRes.status}`)
  }

  const avatarManifest = (await avatarRes.json()) as MoeAvatarManifest
  const furnitureManifest =
    (await furnitureRes.json()) as LegacyFurnitureManifest

  const builtAt = new Date().toISOString()
  let manifest = buildUnifiedManifest(avatarManifest, furnitureManifest, {
    publish: {
      version: '1.0.0',
      builtAt,
    },
  })

  const manifestJson = JSON.stringify(manifest, null, 2)
  const errors = validatePackManifest(manifest, { strictPublish: true })
  if (errors.length > 0) {
    throw new Error(`pack 校验失败：\n${errors.join('\n')}`)
  }

  const contentHash = await sha256Hex(manifestJson)
  manifest = {
    ...manifest,
    publish: {
      ...manifest.publish!,
      contentHash,
    },
  }
  const finalJson = JSON.stringify(manifest, null, 2)

  const zip = new JSZip()
  zip.file('manifest.json', finalJson)

  const avatarPaths = collectAvatarAssetPaths(avatarManifest)
  for (const rel of avatarPaths) {
    try {
      const blob = await fetchBlob(assetUrl(MOE_AVATAR_PACK_BASE, rel))
      zip.file(`avatar/${rel}`, blob)
    } catch (e) {
      console.warn('skip avatar asset', rel, e)
    }
  }

  for (const [id, item] of Object.entries(furnitureManifest.items)) {
    try {
      const blob = await fetchBlob(assetUrl(MOE_FURNITURE_PACK_BASE, item.path))
      zip.file(`objects/${id}.png`, blob)
    } catch (e) {
      console.warn('skip object asset', id, e)
    }
  }

  const out = await zip.generateAsync({ type: 'blob' })
  downloadBlob(out, `${manifest.packId}.zip`)
}
