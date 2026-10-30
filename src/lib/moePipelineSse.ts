import type { AdminClientOptions, MoeBrainPipelineData } from '../api/adminClient'
import { adminApiPath } from './adminApi'
import { normalizePipelineData } from './pipelineData'

type BaseResp<T> = {
  success: boolean
  message?: string
  data?: T
}

export type MoePipelineSseHandle = {
  close: () => void
  /** 试跑结束（收到 done 或连接关闭）时 resolve 为最后一次 pipeline 数据 */
  done: Promise<MoeBrainPipelineData | null>
}

/** 构造 SSE 地址（EventSource 无法带 Header，使用 admin_token 查询参数鉴权） */
export function buildMoeBrainPipelineStreamUrl(
  agentKey: string,
  clientOpts: AdminClientOptions,
  resolveUrl: (path: string, opts: AdminClientOptions) => string,
): string {
  const key = agentKey.trim()
  const q = new URLSearchParams({
    agent_key: key,
    admin_token: clientOpts.token,
  })
  return resolveUrl(adminApiPath(`/moe/brain/pipeline/stream?${q}`), clientOpts)
}

/** 订阅试跑流水线 SSE；返回关闭函数与结束 Promise */
export function openMoeBrainPipelineSse(
  streamUrl: string,
  onData: (data: MoeBrainPipelineData) => void,
): MoePipelineSseHandle {
  let last: MoeBrainPipelineData | null = null
  let settled = false
  let resolveDone!: (v: MoeBrainPipelineData | null) => void
  const done = new Promise<MoeBrainPipelineData | null>((resolve) => {
    resolveDone = resolve
  })

  const finish = (value: MoeBrainPipelineData | null) => {
    if (settled) return
    settled = true
    resolveDone(value)
  }

  const es = new EventSource(streamUrl)

  const onPipeline = (ev: MessageEvent) => {
    try {
      const body = JSON.parse(String(ev.data)) as BaseResp<MoeBrainPipelineData>
      if (body.success && body.data) {
        const normalized = normalizePipelineData(body.data)
        last = normalized
        onData(normalized)
      }
    } catch {
      /* ignore malformed */
    }
  }

  es.addEventListener('pipeline', onPipeline)
  es.addEventListener('done', () => {
    es.close()
    finish(last)
  })
  es.addEventListener('error', () => {
    es.close()
    finish(last)
  })

  return {
    close: () => {
      es.close()
      finish(last)
    },
    done,
  }
}

/** 打开 SSE 并等待试跑结束（用于 async run-once 之后） */
export async function waitMoeBrainPipelineSse(
  streamUrl: string,
  onData?: (data: MoeBrainPipelineData) => void,
): Promise<MoeBrainPipelineData | null> {
  const handle = openMoeBrainPipelineSse(streamUrl, (d) => {
    onData?.(d)
  })
  try {
    return await handle.done
  } finally {
    handle.close()
  }
}
