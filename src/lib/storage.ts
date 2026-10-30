const LS_URL = 'moe_deploy_url'
const LS_TOKEN = 'moe_deploy_token'
const LS_TARGET = 'moe_deploy_target'

/** Deploy Agent（:19010），管理台默认连此网关 */
export const AGENT_URL = 'http://127.0.0.1:19010'

/**
 * 与 backend/deploy 默认 token 对齐（config.Token 空时为 change-me）。
 * 本地开发无需在设置里再填一遍；自定义 token 仍可在设置「高级」覆盖。
 */
export const DEFAULT_DEPLOY_TOKEN = 'change-me'

const FALLBACK_URL = AGENT_URL

function isDevUiPort(port: string) {
  return port === '5173' || port === '4173'
}

/** 网关基址：Vite dev 用同源代理；:19010 托管用 origin；否则直连 Agent */
export function resolveBaseUrl(): string {
  if (typeof window === 'undefined') return FALLBACK_URL

  const { origin, port } = window.location
  if (port === '19010' || isDevUiPort(port)) return origin

  const stored = localStorage.getItem(LS_URL)?.replace(/\/$/, '')
  if (stored) {
    try {
      const storedPort = new URL(stored).port || ''
      if (!isDevUiPort(storedPort)) {
        return stored
      }
    } catch {
      /* use fallback */
    }
  }

  return FALLBACK_URL
}

export function loadConn(): {
  baseUrl: string
  token: string
  deployTarget: string
} {
  const stored = localStorage.getItem(LS_TOKEN)
  return {
    baseUrl: resolveBaseUrl(),
    token: stored?.trim() ? stored : DEFAULT_DEPLOY_TOKEN,
    deployTarget: localStorage.getItem(LS_TARGET) || 'local',
  }
}

export function saveConn(baseUrl: string, token: string, deployTarget: string) {
  let url = baseUrl.replace(/\/$/, '')
  try {
    if (isDevUiPort(new URL(url).port || '')) {
      url = FALLBACK_URL
    }
  } catch {
    /* keep url */
  }
  localStorage.setItem(LS_URL, url)
  localStorage.setItem(LS_TOKEN, token)
  localStorage.setItem(LS_TARGET, deployTarget)
}

export { FALLBACK_URL as DEFAULT_URL }

