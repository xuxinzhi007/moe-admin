import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  createDeployClient,
  DeployApiError,
  type DeployClient,
} from '../api/deployClient'
import { jobTargetForType } from '../lib/jobTarget'
import { loadConn, resolveBaseUrl, saveConn } from '../lib/storage'
import type { DeployJob } from '../types/deploy'

export type AgentMeta = {
  pid?: number
  listen?: string
  platform?: string
  platform_label?: string
  arch?: string
  windows_shell_label?: string
  running?: boolean
}

type DeployContextValue = {
  baseUrl: string
  token: string
  deployTarget: string
  setDeployTarget: (id: string) => void
  client: DeployClient
  agentMeta: AgentMeta | null
  agentOnline: boolean | null
  authOk: boolean | null
  bootstrapped: boolean
  toast: string | null
  showToast: (msg: string) => void
  saveConnection: (baseUrl: string, token: string, deployTarget: string) => Promise<void>
  verifyToken: () => Promise<boolean>
  probeAgent: () => Promise<void>
  jobs: DeployJob[]
  refreshJobs: () => Promise<void>
  activeJob: DeployJob | null
  runJob: (
    type: string,
    params?: Record<string, string>,
  ) => Promise<string | undefined>
  confirmRunJob: (type: string, message: string) => void
}

const DeployContext = createContext<DeployContextValue | null>(null)

export function DeployProvider({ children }: { children: ReactNode }) {
  const initial = loadConn()
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl)
  const [token, setToken] = useState(initial.token)
  const [deployTarget, setDeployTargetState] = useState(initial.deployTarget)
  const [agentMeta, setAgentMeta] = useState<AgentMeta | null>(null)
  const [agentOnline, setAgentOnline] = useState<boolean | null>(null)
  const [authOk, setAuthOk] = useState<boolean | null>(null)
  const [bootstrapped, setBootstrapped] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [jobs, setJobs] = useState<DeployJob[]>([])
  const [activeJob, setActiveJob] = useState<DeployJob | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const client = useMemo(
    () => createDeployClient({ baseUrl, token }),
    [baseUrl, token],
  )

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2600)
  }, [])

  const setDeployTarget = useCallback(
    (id: string) => {
      setDeployTargetState(id)
      saveConn(baseUrl, token, id)
    },
    [baseUrl, token],
  )

  const probeAgent = useCallback(async () => {
    try {
      const ctrl = new AbortController()
      const timer = window.setTimeout(() => ctrl.abort(), 4000)
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/deploy/agent`, {
        signal: ctrl.signal,
      })
      window.clearTimeout(timer)
      const data = (await res.json()) as AgentMeta & {
        success?: boolean
        message?: string
      }
      if (!res.ok || !data.running) {
        throw new Error(data.message || 'Agent 无响应')
      }
      setAgentMeta(data)
      setAgentOnline(true)
    } catch {
      setAgentMeta(null)
      setAgentOnline(false)
    }
  }, [baseUrl])

  const verifyToken = useCallback(async () => {
    if (!token.trim()) {
      setAuthOk(false)
      return false
    }
    try {
      await client.session()
      setAuthOk(true)
      return true
    } catch {
      setAuthOk(false)
      return false
    }
  }, [client, token])

  const saveConnection = useCallback(
    async (url: string, tok: string, target: string) => {
      const u = url.replace(/\/$/, '')
      setBaseUrl(u)
      setToken(tok)
      setDeployTargetState(target)
      saveConn(u, tok, target)
      const c = createDeployClient({ baseUrl: u, token: tok })
      try {
        await c.session()
        setAuthOk(true)
        showToast('运维网关已连接')
      } catch (e) {
        setAuthOk(false)
        showToast(e instanceof DeployApiError ? e.message : '连接失败')
      }
      await probeAgent()
    },
    [probeAgent, showToast],
  )

  const refreshJobs = useCallback(async () => {
    if (!token.trim()) return
    try {
      const data = await client.listJobs()
      setJobs(data.jobs || [])
    } catch {
      /* ignore when offline */
    }
  }, [client, token])

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const pollJob = useCallback(
    (id: string) => {
      stopPoll()
      pollRef.current = setInterval(async () => {
        try {
          const data = await client.getJob(id)
          const job = data.job
          setActiveJob(job)
          await refreshJobs()
          if (job.status === 'succeeded' || job.status === 'failed') {
            stopPoll()
            showToast(job.status === 'succeeded' ? '任务完成' : '任务失败')
          }
        } catch {
          stopPoll()
        }
      }, 800)
    },
    [client, refreshJobs, showToast, stopPoll],
  )

  const runJob = useCallback(
    async (type: string, params: Record<string, string> = {}) => {
      if (!token.trim()) {
        showToast('运维网关未就绪，请打开设置检测 Agent')
        return undefined
      }
      const resolved = jobTargetForType(type, deployTarget)
      setDeployTarget(resolved)
      try {
        const data = await client.createJob(type, resolved, params)
        showToast(`任务 #${data.job_id.slice(0, 8)}`)
        await refreshJobs()
        pollJob(data.job_id)
        return data.job_id
      } catch (e) {
        showToast(e instanceof DeployApiError ? e.message : '任务失败')
        return undefined
      }
    },
    [
      client,
      deployTarget,
      pollJob,
      refreshJobs,
      setDeployTarget,
      showToast,
      token,
    ],
  )

  const confirmRunJob = useCallback(
    (type: string, message: string) => {
      if (window.confirm(message)) void runJob(type)
    },
    [runJob],
  )

  // 纠正 localStorage 里误存的网关地址，并同步到 state
  useEffect(() => {
    const resolved = resolveBaseUrl()
    if (resolved !== baseUrl) {
      setBaseUrl(resolved)
    }
  }, [baseUrl])

  useEffect(() => {
    let cancelled = false
    async function bootstrap() {
      setBootstrapped(false)
      await probeAgent()
      if (token.trim()) {
        const ok = await verifyToken()
        if (ok) await refreshJobs()
      } else {
        setAuthOk(false)
      }
      if (!cancelled) setBootstrapped(true)
    }
    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [baseUrl, probeAgent, refreshJobs, token, verifyToken])

  // 仅更新顶栏 Agent 状态，不触发总览卡片重载（见 useOverviewData initialLoadDone）
  useEffect(() => {
    const t = setInterval(() => void probeAgent(), 60000)
    return () => clearInterval(t)
  }, [probeAgent])

  useEffect(() => () => stopPoll(), [stopPoll])

  const value: DeployContextValue = {
    baseUrl,
    token,
    deployTarget,
    setDeployTarget,
    client,
    agentMeta,
    agentOnline,
    authOk,
    bootstrapped,
    toast,
    showToast,
    saveConnection,
    verifyToken,
    probeAgent,
    jobs,
    refreshJobs,
    activeJob,
    runJob,
    confirmRunJob,
  }

  return (
    <DeployContext.Provider value={value}>{children}</DeployContext.Provider>
  )
}

export function useDeploy() {
  const ctx = useContext(DeployContext)
  if (!ctx) throw new Error('useDeploy must be used within DeployProvider')
  return ctx
}
