/** Mirrors deploy-ops.html jobTargetForType + backend SuggestedTarget. */
export function jobTargetForType(
  type: string,
  fallbackTarget: string,
): string {
  const t = (type || '').toLowerCase()
  if (
    t.startsWith('docker_') ||
    t === 'backend_upload_binaries' ||
    t === 'remote_inspect'
  ) {
    return 'cloud'
  }
  if (t === 'backend_release_pipeline') return 'local'
  if (
    t === 'backend_build_linux' ||
    t === 'backend_build_local' ||
    t.startsWith('flutter_') ||
    t === 'env_inspect' ||
    t === 'git_tags'
  ) {
    return 'local'
  }
  return fallbackTarget
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    succeeded: '成功',
    failed: '失败',
    running: '运行中',
    pending: '排队',
    cancelled: '已取消',
  }
  return map[status] || status
}
