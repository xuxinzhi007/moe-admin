import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createDeployClient } from '../api/deployClient'
import { apiTargetLabel, loadApiTarget, saveApiTarget, type ApiTarget } from '../lib/apiTarget'
import { loadConn } from '../lib/storage'

export type ApiHealth = {
  target: string
  base_url: string
  online: boolean
  message?: string
  status_code?: number
}

export type PlatformHealth = {
  success: boolean
  agent?: { online: boolean; listen: string }
  local_api: ApiHealth
  cloud_api: ApiHealth
  default_target?: string
}

type PlatformContextValue = {
  apiTarget: ApiTarget
  setApiTarget: (t: ApiTarget) => void
  apiTargetLabel: string
  health: PlatformHealth | null
  healthLoading: boolean
  refreshHealth: () => Promise<void>
}

const PlatformContext = createContext<PlatformContextValue | null>(null)

function normalizeApiHealth(h: ApiHealth | undefined, fallbackTarget: string): ApiHealth {
  if (!h) {
    return {
      target: fallbackTarget,
      base_url: fallbackTarget === 'local' ? 'http://127.0.0.1:8888' : '',
      online: false,
    }
  }
  const reachableByStatus =
    typeof h.status_code === 'number' && h.status_code >= 200 && h.status_code < 500
  const isOnline = Boolean(h.online || reachableByStatus)
  return {
    ...h,
    online: isOnline,
    message: isOnline && h.status_code === 401 ? 'ok (auth required)' : h.message,
  }
}

export function PlatformProvider({ children }: { children: ReactNode }) {
  const { baseUrl, token } = loadConn()
  const [apiTarget, setApiTargetState] = useState<ApiTarget>(loadApiTarget)
  const [health, setHealth] = useState<PlatformHealth | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)

  const client = useMemo(
    () => createDeployClient({ baseUrl, token }),
    [baseUrl, token],
  )

  const setApiTarget = useCallback((t: ApiTarget) => {
    setApiTargetState(t)
    saveApiTarget(t)
  }, [])

  const refreshHealth = useCallback(async () => {
    setHealthLoading(true)
    try {
      const data = await client.platformHealth()
      setHealth({
        ...data,
        local_api: normalizeApiHealth(data.local_api, 'local'),
        cloud_api: normalizeApiHealth(data.cloud_api, 'cloud'),
      })
    } catch {
      try {
        const res = await fetch('/api/public/client-config')
        const localOnline = res.status >= 200 && res.status < 500
        setHealth({
          success: true,
          local_api: {
            target: 'local',
            base_url: 'http://127.0.0.1:8888',
            online: localOnline,
            status_code: res.status,
          },
          cloud_api: {
            target: 'cloud',
            base_url: '',
            online: false,
          },
        })
      } catch {
        setHealth(null)
      }
    } finally {
      setHealthLoading(false)
    }
  }, [client])

  useEffect(() => {
    void refreshHealth()
    const t = window.setInterval(() => void refreshHealth(), 30000)
    return () => window.clearInterval(t)
  }, [refreshHealth])

  const value: PlatformContextValue = {
    apiTarget,
    setApiTarget,
    apiTargetLabel: apiTargetLabel(apiTarget),
    health,
    healthLoading,
    refreshHealth,
  }

  return (
    <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>
  )
}

export function usePlatform() {
  const ctx = useContext(PlatformContext)
  if (!ctx) throw new Error('usePlatform must be used within PlatformProvider')
  return ctx
}
