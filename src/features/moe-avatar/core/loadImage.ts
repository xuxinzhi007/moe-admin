const cache = new Map<string, Promise<HTMLImageElement>>()

export function loadImage(url: string): Promise<HTMLImageElement> {
  const hit = cache.get(url)
  if (hit) return hit
  const p = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`load failed: ${url}`))
    img.src = url
  })
  cache.set(url, p)
  return p
}

export async function loadImageFromUrls(urls: string[]): Promise<HTMLImageElement> {
  let lastError: unknown
  for (const url of urls) {
    try {
      return await loadImage(url)
    } catch (err) {
      lastError = err
    }
  }
  throw (lastError instanceof Error ? lastError : new Error('load failed'))
}

export function clearImageCache(): void {
  cache.clear()
}
