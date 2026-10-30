import JSZip from 'jszip'

export function assetUrl(packBaseUrl: string, relativePath: string): string {
  const base = packBaseUrl.replace(/\/$/, '')
  const rel = relativePath.replace(/^\//, '')
  return `${base}/${rel}`
}

export async function fetchBlob(url: string): Promise<Blob> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`fetch ${url}: ${res.status}`)
  return res.blob()
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** 导出单品图包：manifest + items/*.png */
export async function exportItemPackZip(options: {
  manifest: object
  packBaseUrl: string
  itemPaths: string[]
  packFilename: string
}): Promise<void> {
  const { manifest, packBaseUrl, itemPaths, packFilename } = options
  const zip = new JSZip()
  zip.file('manifest.json', JSON.stringify(manifest, null, 2))
  const seen = new Set<string>()
  for (const rel of itemPaths) {
    if (seen.has(rel)) continue
    seen.add(rel)
    try {
      const blob = await fetchBlob(assetUrl(packBaseUrl, rel))
      zip.file(rel, blob)
    } catch (e) {
      console.warn('skip', rel, e)
    }
  }
  const out = await zip.generateAsync({ type: 'blob' })
  downloadBlob(out, packFilename)
}
