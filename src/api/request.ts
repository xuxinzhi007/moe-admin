import { adminApiPath, useDirectAdminApi } from '../lib/adminApi'
import { normalizeAdminResponse } from '../lib/apiResponse'
import { DeployApiError } from './deployClient'

export function formatFetchError(e: unknown): string {
  if (e instanceof DeployApiError) return e.message
  if (e instanceof TypeError) {
    if (useDirectAdminApi()) {
      return '无法连接本机管理后台 API，请确认服务已启动'
    }
    return '无法连接管理后台 API，请确认后端服务已启动'
  }
  return '网络请求失败，请检查服务是否已启动'
}

export type AdminClientOptions = {
  baseUrl: string
  token: string
  apiTarget: string
  cloudApiBaseUrl?: string
  /** Token 失效时清会话并跳转登录（由 AdminAuthProvider 注入） */
  onUnauthorized?: () => void
}

/** 判断管理端 API 是否因未登录/过期而失败（含 HTTP 200 + success:false）。 */
export function isAdminUnauthorized(
  data: Record<string, unknown>,
  httpStatus: number,
): boolean {
  if (httpStatus === 401 || httpStatus === 403) return true
  if (data.success !== false) return false
  const code = Number(data.code)
  const msg = String(data.message || '')
  if (code === 401 || code === 1005) return true
  return (
    msg.includes('登录已过期') ||
    msg.includes('请先登录') ||
    msg.includes('未授权')
  )
}

export function resolveAdminRequestUrl(path: string, opts: AdminClientOptions): string {
  if (path.startsWith('http')) return path
  const base = opts.baseUrl.replace(/\/$/, '')
  if (useDirectAdminApi()) {
    if (opts.apiTarget === 'cloud' && opts.cloudApiBaseUrl) {
      const cloudBase = opts.cloudApiBaseUrl.replace(/\/$/, '')
      const adminPath = path.replace(/^\/api\/deploy\/admin/, '/api/admin')
      return `${cloudBase}${adminPath}`
    }
    return `${base}${path}`
  }
  const url = new URL(`${base}${path}`)
  if (opts.apiTarget && path.includes('/api/deploy/')) {
    url.searchParams.set('target', opts.apiTarget)
  }
  return url.toString()
}

export type BaseResp<T> = {
  success: boolean
  code?: number
  message?: string
  data?: T
}

export type AdminApiFn = <T>(
  path: string,
  init?: RequestInit & { auth?: boolean },
) => Promise<T>

/** 创建内部 api() 请求函数，供各模块 factory 复用。 */
export function createAdminApi(opts: AdminClientOptions): AdminApiFn {
  return async function api<T>(
    path: string,
    init?: RequestInit & { auth?: boolean },
  ): Promise<T> {
    const headers = new Headers(init?.headers)
    const useAuth = init?.auth !== false
    if (useAuth && opts.token) {
      headers.set('Authorization', `Bearer ${opts.token}`)
    }
    const full = resolveAdminRequestUrl(path, opts)
    let res: Response
    try {
      res = await fetch(full, { ...init, headers })
    } catch (e) {
      throw new DeployApiError(formatFetchError(e))
    }
    const text = await res.text()
    let data: Record<string, unknown>
    try {
      data = JSON.parse(text) as Record<string, unknown>
    } catch {
      data = { raw: text }
    }
    if (!res.ok) {
      const msg =
        (data.message as string) ||
        (data.error as string) ||
        res.statusText ||
        text
      if (useAuth && isAdminUnauthorized(data, res.status)) {
        opts.onUnauthorized?.()
      }
      throw new DeployApiError(msg, res.status)
    }
    if (useAuth && isAdminUnauthorized(data, res.status)) {
      const msg =
        (data.message as string) || '登录已过期，请重新登录'
      opts.onUnauthorized?.()
      throw new DeployApiError(msg, 401)
    }
    return normalizeAdminResponse<T>(data) as T
  }
}

// Re-export adminApiPath for convenience
export { adminApiPath }
