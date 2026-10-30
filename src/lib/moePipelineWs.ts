import type { AdminClientOptions, MoeBrainPipelineData } from '../api/adminClient'
import { normalizePipelineData } from './pipelineData'

type BaseResp<T> = {
  success: boolean
  message?: string
  data?: T
}

type WsPayload<T> = {
  type: string
  success?: boolean
  message?: string
  data?: T
}

export type MoePipelineWsHandle = {
  close: () => void
  done: Promise<MoeBrainPipelineData | null>
}

const PIPELINE_WAIT_MS = 30 * 60 * 1000
const RECONNECT_MS = 700

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function httpToWsUrl(httpUrl: string): string {
  const u = new URL(httpUrl)
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'
  return u.toString()
}

/** 构造 WebSocket 地址（与 SSE 相同鉴权：admin_token 查询参数）。 */
export function buildMoeBrainPipelineWsUrl(
  agentKey: string,
  clientOpts: AdminClientOptions,
  resolveUrl: (path: string, opts: AdminClientOptions) => string,
): string {
  const key = agentKey.trim()
  const q = new URLSearchParams({
    agent_key: key,
    admin_token: clientOpts.token,
  })
  const path = `/ws/admin/moe/brain/pipeline?${q}`
  if (typeof window !== 'undefined' && window.location.port === '5173') {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${proto}//${window.location.host}${path}`
  }
  if (typeof window !== 'undefined' && window.location.port === '4173') {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${proto}//${window.location.host}${path}`
  }
  return httpToWsUrl(resolveUrl(path, clientOpts))
}

type WsSessionResult = {
  last: MoeBrainPipelineData | null
  /** 服务端正常发送 done */
  graceful: boolean
}

/** 单次 WS 会话：直到 done、断线或主动 close。 */
function runPipelineWsSession(
  wsUrl: string,
  onData: (data: MoeBrainPipelineData) => void,
): { close: () => void; done: Promise<WsSessionResult> } {
  let last: MoeBrainPipelineData | null = null
  let settled = false
  let resolveDone!: (v: WsSessionResult) => void
  const done = new Promise<WsSessionResult>((resolve) => {
    resolveDone = resolve
  })

  const finish = (graceful: boolean) => {
    if (settled) return
    settled = true
    resolveDone({ last, graceful })
  }

  const ws = new WebSocket(wsUrl)

  const onMessage = (ev: MessageEvent) => {
    try {
      const body = JSON.parse(String(ev.data)) as WsPayload<MoeBrainPipelineData> | BaseResp<MoeBrainPipelineData>
      const type = 'type' in body ? body.type : ''
      if (type === 'error' || body.success === false) {
        return
      }
      if (type === 'pipeline' && body.data) {
        const normalized = normalizePipelineData(body.data)
        last = normalized
        onData(normalized)
        return
      }
      if (type === 'done') {
        ws.close()
        finish(true)
      }
    } catch {
      /* ignore malformed */
    }
  }

  ws.addEventListener('message', onMessage)
  ws.addEventListener('close', () => finish(false))
  ws.addEventListener('error', () => {
    ws.close()
    finish(false)
  })

  return {
    close: () => {
      ws.removeEventListener('message', onMessage)
      ws.close()
      finish(false)
    },
    done,
  }
}

/** 订阅试跑流水线 WebSocket；1s 服务端心跳 + 步骤变更推送。 */
export function openMoeBrainPipelineWs(
  wsUrl: string,
  onData: (data: MoeBrainPipelineData) => void,
): MoePipelineWsHandle {
  const session = runPipelineWsSession(wsUrl, onData)
  return {
    close: session.close,
    done: session.done.then((r) => r.last),
  }
}

/**
 * 等待试跑结束。生成阶段可能持续数分钟，WS 断线时会自动重连，避免误报「试跑未成功」。
 */
export async function waitMoeBrainPipelineWs(
  wsUrl: string,
  onData?: (data: MoeBrainPipelineData) => void,
): Promise<MoeBrainPipelineData | null> {
  const deadline = Date.now() + PIPELINE_WAIT_MS
  let last: MoeBrainPipelineData | null = null
  let sawRunning = false
  let acceptedStaleDone = false

  while (Date.now() < deadline) {
    const session = runPipelineWsSession(wsUrl, (d) => {
      last = d
      if (d.running) sawRunning = true
      onData?.(d)
    })
    try {
      const result = await session.done
      if (result.last) {
        last = result.last
        if (result.last.running) sawRunning = true
      }
      if (last && !last.running) {
        if (sawRunning || result.graceful) {
          return last
        }
        if (!acceptedStaleDone) {
          acceptedStaleDone = true
          await sleep(RECONNECT_MS)
          continue
        }
        return last
      }
    } finally {
      session.close()
    }
    await sleep(RECONNECT_MS)
  }
  return last
}
