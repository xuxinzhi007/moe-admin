import { clearImageCache } from './loadImage'

/** 原图归档路径（不参与 compose / App 消费） */
export const ORIGINALS_PREFIX = '_originals/'

export function originalAssetKey(relativePath: string): string {
  return `${ORIGINALS_PREFIX}${relativePath.replace(/^\//, '')}`
}

/** 会话内上传：processed 层用于 compose；原图可选归档至 _originals/ */
export class AvatarAssetStore {
  private readonly blobs = new Map<string, Blob>()
  private readonly objectUrls = new Map<string, string>()

  has(relativePath: string): boolean {
    return this.blobs.has(relativePath)
  }

  hasOriginal(relativePath: string): boolean {
    return this.blobs.has(originalAssetKey(relativePath))
  }

  get(relativePath: string): Blob | undefined {
    return this.blobs.get(relativePath)
  }

  getOriginal(relativePath: string): Blob | undefined {
    return this.blobs.get(originalAssetKey(relativePath))
  }

  entries(): Array<{ key: string; blob: Blob }> {
    return [...this.blobs.entries()]
      .map(([key, blob]) => ({ key, blob }))
      .sort((a, b) => a.key.localeCompare(b.key))
  }

  objectUrl(relativePath: string): string | undefined {
    return this.objectUrls.get(relativePath)
  }

  /** 写入 processed 层（compose / 导出用） */
  set(relativePath: string, blob: Blob): void {
    this.putBlob(relativePath, blob)
    clearImageCache()
  }

  /**
   * processed + 原图分离：原图完整保留，不影响上传文件内容。
   * @param sameAsProcessed 尺寸已匹配时原图与 processed 相同 blob
   */
  setWithOriginal(
    relativePath: string,
    processed: Blob,
    original: Blob,
    sameAsProcessed = false,
  ): void {
    this.putBlob(relativePath, processed)
    if (!sameAsProcessed) {
      this.putBlob(originalAssetKey(relativePath), original)
    } else if (this.hasOriginal(relativePath)) {
      this.revokeKey(originalAssetKey(relativePath))
    }
    clearImageCache()
  }

  /** 导出 zip 时附带 _originals/ */
  originalPaths(): string[] {
    const out: string[] = []
    for (const key of this.blobs.keys()) {
      if (key.startsWith(ORIGINALS_PREFIX)) out.push(key)
    }
    return out.sort()
  }

  revoke(relativePath: string): void {
    this.revokeKey(relativePath)
    this.revokeKey(originalAssetKey(relativePath))
    clearImageCache()
  }

  deleteKey(key: string): void {
    this.revokeKey(key)
    clearImageCache()
  }

  dispose(): void {
    for (const rel of [...this.objectUrls.keys()]) {
      this.revokeKey(rel)
    }
    clearImageCache()
  }

  private putBlob(key: string, blob: Blob): void {
    this.revokeKey(key)
    this.blobs.set(key, blob)
    this.objectUrls.set(key, URL.createObjectURL(blob))
  }

  private revokeKey(key: string): void {
    const url = this.objectUrls.get(key)
    if (url) URL.revokeObjectURL(url)
    this.objectUrls.delete(key)
    this.blobs.delete(key)
  }
}
