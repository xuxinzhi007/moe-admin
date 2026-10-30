/**
 * 管理后台 API 基址。
 * 默认使用当前 origin，依赖前端 dev proxy 或同域部署，避免绑定 Deploy Agent。
 */
export function resolveAdminBaseUrl(): string {
  if (typeof window === 'undefined') return 'http://127.0.0.1:8888'
  return window.location.origin
}
