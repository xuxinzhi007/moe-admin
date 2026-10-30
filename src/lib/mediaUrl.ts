/** 将 /api/images/... 转为管理台可访问的完整 URL（与 MediaGalleryPage 一致）。 */
export function resolveMediaViewUrl(
  rawUrl: string,
  apiBase: string,
  devDirect: boolean,
  apiTarget: 'local' | 'cloud',
): string {
  const pathMatch = rawUrl.match(/\/api\/images\/[^?#]+/)
  if (!pathMatch) return rawUrl
  const path = pathMatch[0]
  if (devDirect) {
    if (apiTarget === 'cloud' && apiBase) return `${apiBase.replace(/\/$/, '')}${path}`
    return path
  }
  const base = apiBase.replace(/\/$/, '')
  if (!base) return rawUrl
  return `${base}${path}`
}
