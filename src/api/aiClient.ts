import type { AdminApiFn, AdminClientOptions, BaseResp } from './request'
import { adminApiPath, resolveAdminRequestUrl } from './request'

// ── AI 相关类型 ──────────────────────────────────────────────────────

export type MoeBrainGenerationMeta = {
  post_uses_tool_memory: boolean
  memories_synced: number
  episodes_in_prompt: number
  prompt_memory_lines: number
  prompt_preview: string
  note: string
  prompt_est_tokens?: number
  context_limit?: number
  context_used_pct?: number
}

export type MoeInferenceStatusData = {
  online: boolean
  base_url: string
  models: string[]
  default_post_model: string
  preferred_model?: string
  runtime_model?: string
  effective_model?: string
  auto_discovered?: boolean
  model_loaded: boolean
  context_limit?: number
  context_source?: string
  message?: string
}

export type MoeInferenceModelInfoData = {
  model: string
  system?: string
  modelfile?: string
  template?: string
  parameters_text?: string
  parameters?: Record<string, number>
}

export type MoeInferenceCreateModelReq = {
  name: string
  base_model?: string
  system_prompt?: string
  modelfile?: string
  parameters?: Record<string, number>
  replace_existing?: boolean
}

export type MoeInferenceMutationData = {
  ok: boolean
  model: string
  status?: string
  message?: string
}

export type MoeInferenceChatMessage = {
  role: 'system' | 'user' | 'assistant' | string
  content: string
}

export type MoeInferenceChatReq = {
  model?: string
  messages: MoeInferenceChatMessage[]
  temperature?: number
  top_p?: number
  repeat_penalty?: number
  max_tokens?: number
}

export type MoeInferenceChatData = {
  model: string
  content: string
  duration_ms?: number
}

export type MoePipelineStepItem = {
  key: string
  label: string
  status: string
  detail?: string
  duration_ms?: number
}

export type MoeGenAttemptItem = {
  attempt: number
  outcome: string
  snippet?: string
  note?: string
}

export type MoeHostMetrics = {
  proc_alloc_mb?: number
  proc_sys_mb?: number
  num_cpu?: number
  num_goroutine?: number
  inference_online?: boolean
  inference_base_url?: string
  inference_models?: number
  gpu_note?: string
}

export type MoePipelineToolInvokeItem = {
  tool: string
  ok: boolean
  latency_ms?: number
  created_at?: string
}

export type MoeBrainPipelineData = {
  agent_key: string
  run_at?: string
  ok: boolean
  detail?: string
  post_id?: string
  total_duration_ms?: number
  host_metrics?: MoeHostMetrics
  generate_attempts?: MoeGenAttemptItem[]
  steps: MoePipelineStepItem[]
  tools_invoked?: MoePipelineToolInvokeItem[]
  stability_score?: number
  stability_delta?: number
  run_feedback?: string
  /** 试跑进行中（后端 live 状态） */
  running?: boolean
  current_phase?: string
  run_started_at?: string
  active_step_key?: string
}

export type MoeFlowNodeItem = {
  id: string
  type: 'core' | 'step' | 'tool' | string
  kind?: string
  label: string
  subtitle?: string
  step_key?: string
  tool_name?: string
  position_x: number
  position_y: number
  enabled?: boolean
  on_fail?: string
  retry_max?: number
}

export type MoeFlowEdgeItem = {
  id: string
  source: string
  target: string
  kind?: string
  label?: string
}

export type MoeBotFlowData = {
  agent_key: string
  version?: number
  entry_node_id?: string
  nodes: MoeFlowNodeItem[]
  edges: MoeFlowEdgeItem[]
  viewport_zoom?: number
  viewport_x?: number
  viewport_y?: number
  updated_at?: string
  is_default?: boolean
  warnings?: string[]
}

/** AI 相关 API */
export function createAiMethods(api: AdminApiFn, opts: AdminClientOptions) {
  return {
    // ── AI Agent CRUD ─────────────────────────────────────
    listAiAgents: (params: {
      page?: number
      page_size?: number
      keyword?: string
    } = {}) => {
      const q = new URLSearchParams()
      if (params.page) q.set('page', String(params.page))
      if (params.page_size) q.set('page_size', String(params.page_size))
      if (params.keyword) q.set('keyword', params.keyword)
      const qs = q.toString()
      return api<
        BaseResp<{
          items: Array<{
            id: string
            owner_user_id: string
            owner_name: string
            payload_json: string
          }>
          total: number
        }>
      >(`${adminApiPath('/ai/agents')}${qs ? `?${qs}` : ''}`)
    },

    deleteAiAgent: (body: { user_id: string; agent_id: string }) => {
      const q = new URLSearchParams()
      q.set('user_id', body.user_id)
      q.set('agent_id', body.agent_id)
      return api<BaseResp<unknown>>(`${adminApiPath('/ai/agents')}?${q}`, {
        method: 'DELETE',
      })
    },

    updateAiAgent: (body: {
      user_id: string
      agent_id: string
      payload_json: string
    }) =>
      api<BaseResp<unknown>>(adminApiPath('/ai/agents'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: body.user_id,
          agent_id: body.agent_id,
          payload_json: body.payload_json,
        }),
      }),

    // ── AI 对话日志 ──────────────────────────────────────
    listAiChatSessions: (params: {
      page?: number
      page_size?: number
      user_id?: string
      session_id?: string
      from?: string
      to?: string
    } = {}) => {
      const q = new URLSearchParams()
      if (params.page) q.set('page', String(params.page))
      if (params.page_size) q.set('page_size', String(params.page_size))
      if (params.user_id) q.set('user_id', params.user_id)
      if (params.session_id) q.set('session_id', params.session_id)
      if (params.from) q.set('from', params.from)
      if (params.to) q.set('to', params.to)
      const qs = q.toString()
      return api<
        BaseResp<{
          items: Array<{
            id: string
            user_id: string
            username?: string
            session_id: string
            model?: string
            message_count?: number
            last_message_at?: string
            created_at: string
            updated_at: string
          }>
          total: number
        }>
      >(`${adminApiPath('/ai/chat/sessions')}${qs ? `?${qs}` : ''}`)
    },

    listAiChatMessages: (params: {
      page?: number
      page_size?: number
      user_id?: string
      session_id?: string
      role?: string
      keyword?: string
      from?: string
      to?: string
    } = {}) => {
      const q = new URLSearchParams()
      if (params.page) q.set('page', String(params.page))
      if (params.page_size) q.set('page_size', String(params.page_size))
      if (params.user_id) q.set('user_id', params.user_id)
      if (params.session_id) q.set('session_id', params.session_id)
      if (params.role) q.set('role', params.role)
      if (params.keyword) q.set('keyword', params.keyword)
      if (params.from) q.set('from', params.from)
      if (params.to) q.set('to', params.to)
      const qs = q.toString()
      return api<
        BaseResp<{
          items: Array<{
            id: string
            user_id: string
            username?: string
            session_id: string
            source_msg_id?: string
            role: string
            content: string
            model?: string
            created_at: string
          }>
          total: number
        }>
      >(`${adminApiPath('/ai/chat/messages')}${qs ? `?${qs}` : ''}`)
    },

    exportAiChatMessages: (params: {
      user_id?: string
      session_id?: string
      role?: string
      keyword?: string
      from?: string
      to?: string
      limit?: number
    } = {}) => {
      const q = new URLSearchParams()
      if (params.user_id) q.set('user_id', params.user_id)
      if (params.session_id) q.set('session_id', params.session_id)
      if (params.role) q.set('role', params.role)
      if (params.keyword) q.set('keyword', params.keyword)
      if (params.from) q.set('from', params.from)
      if (params.to) q.set('to', params.to)
      if (params.limit) q.set('limit', String(params.limit))
      const qs = q.toString()
      return api<
        BaseResp<{
          csv: string
          row_count: number
          truncated: boolean
        }>
      >(`${adminApiPath('/ai/chat/messages/export')}${qs ? `?${qs}` : ''}`)
    },

    // ── Moe 工具 ─────────────────────────────────────────
    getMoeToolsSchema: () =>
      api<
        BaseResp<{
          default_tier: string
          tools: Array<{
            name: string
            description: string
            allowed_tiers: string[]
          }>
          openai_tools: unknown[]
        }>
      >(adminApiPath('/moe/tools/schema')),

    getMoeToolStats: (params: {
      from?: string
      to?: string
      agent_key?: string
      tool?: string
    } = {}) => {
      const q = new URLSearchParams()
      if (params.from) q.set('from', params.from)
      if (params.to) q.set('to', params.to)
      if (params.agent_key) q.set('agent_key', params.agent_key)
      if (params.tool) q.set('tool', params.tool)
      const qs = q.toString()
      return api<
        BaseResp<{
          total_calls: number
          success_calls: number
          failed_calls: number
          by_tool: Array<{
            tool: string
            total_calls: number
            success_calls: number
            failed_calls: number
          }>
          by_day: Array<{
            date: string
            total_calls: number
            success_calls: number
          }>
        }>
      >(`${adminApiPath('/moe/tools/stats')}${qs ? `?${qs}` : ''}`)
    },

    listMoeToolCalls: (params: {
      page?: number
      page_size?: number
      tool?: string
      agent_key?: string
      actor_user_id?: string
      source?: string
      ok_only?: boolean
      failed_only?: boolean
      from?: string
      to?: string
    } = {}) => {
      const q = new URLSearchParams()
      if (params.page) q.set('page', String(params.page))
      if (params.page_size) q.set('page_size', String(params.page_size))
      if (params.tool) q.set('tool', params.tool)
      if (params.agent_key) q.set('agent_key', params.agent_key)
      if (params.actor_user_id) q.set('actor_user_id', params.actor_user_id)
      if (params.source) q.set('source', params.source)
      if (params.ok_only) q.set('ok_only', 'true')
      if (params.failed_only) q.set('failed_only', 'true')
      if (params.from) q.set('from', params.from)
      if (params.to) q.set('to', params.to)
      const qs = q.toString()
      return api<
        BaseResp<{
          items: Array<{
            id: string
            tool: string
            actor_user_id: string
            agent_key?: string
            ok: boolean
            error_msg?: string
            latency_ms: number
            source: string
            arguments_preview?: string
            created_at: string
          }>
          total: number
        }>
      >(`${adminApiPath('/moe/tools/calls')}${qs ? `?${qs}` : ''}`)
    },

    // ── Moe 推理状态 ─────────────────────────────────────
    getMoeInferenceStatus: (agentKey?: string) => {
      const q = agentKey ? `?agent_key=${encodeURIComponent(agentKey)}` : ''
      return api<BaseResp<MoeInferenceStatusData>>(
        `${adminApiPath('/moe/inference/status')}${q}`,
      )
    },

    showMoeInferenceModel: (model: string) =>
      api<BaseResp<MoeInferenceModelInfoData>>(
        adminApiPath('/moe/inference/models/show'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model }),
        },
      ),

    createMoeInferenceModel: (body: MoeInferenceCreateModelReq) =>
      api<BaseResp<MoeInferenceMutationData>>(
        adminApiPath('/moe/inference/models/create'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      ),

    deleteMoeInferenceModel: (model: string) =>
      api<BaseResp<MoeInferenceMutationData>>(
        adminApiPath('/moe/inference/models/delete'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model }),
        },
      ),

    pullMoeInferenceModel: (model: string) =>
      api<BaseResp<MoeInferenceMutationData>>(
        adminApiPath('/moe/inference/models/pull'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model }),
        },
      ),

    chatMoeInference: (body: MoeInferenceChatReq) =>
      api<BaseResp<MoeInferenceChatData>>(
        adminApiPath('/moe/inference/chat'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      ),

    streamMoeInferenceChat: async (
      body: MoeInferenceChatReq,
      onChunk: (delta: string) => void,
      signal?: AbortSignal,
    ): Promise<MoeInferenceChatData> => {
      const url = resolveAdminRequestUrl(
        adminApiPath('/moe/inference/chat/stream'),
        opts,
      )
      const headers = new Headers({
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      })
      if (opts.token) {
        headers.set('Authorization', `Bearer ${opts.token}`)
      }
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal,
      })
      if (!res.ok || !res.body) {
        const fallback = await api<BaseResp<MoeInferenceChatData>>(
          adminApiPath('/moe/inference/chat'),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal,
          },
        )
        if (!fallback.success || !fallback.data) {
          throw new Error(fallback.message || '试聊请求失败')
        }
        onChunk(fallback.data.content || '')
        return fallback.data
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''
      let resolvedModel = body.model || ''
      let durationMs: number | undefined

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() || ''
        for (const rawEvent of events) {
          const lines = rawEvent.split('\n')
          let eventName = 'message'
          let dataLine = ''
          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventName = line.slice(6).trim()
            } else if (line.startsWith('data:')) {
              dataLine += line.slice(5).trim()
            }
          }
          if (!dataLine) continue
          let parsed: Record<string, unknown>
          try {
            parsed = JSON.parse(dataLine) as Record<string, unknown>
          } catch {
            continue
          }
          if (eventName === 'chunk') {
            const delta = typeof parsed.delta === 'string' ? parsed.delta : ''
            if (delta) {
              fullContent += delta
              onChunk(delta)
            }
          } else if (eventName === 'done') {
            if (typeof parsed.content === 'string' && !fullContent) {
              fullContent = parsed.content
              onChunk(fullContent)
            }
            if (typeof parsed.model === 'string') {
              resolvedModel = parsed.model
            }
            if (typeof parsed.duration_ms === 'number') {
              durationMs = parsed.duration_ms
            }
          } else if (eventName === 'error') {
            throw new Error(
              typeof parsed.message === 'string' ? parsed.message : '流式试聊失败',
            )
          }
        }
      }

      return {
        model: resolvedModel,
        content: fullContent,
        duration_ms: durationMs,
      }
    },

    // ── Moe Brain Pipeline ────────────────────────────────
    getMoeBrainPipeline: (agentKey: string) =>
      api<BaseResp<MoeBrainPipelineData>>(
        `${adminApiPath('/moe/brain/pipeline')}?agent_key=${encodeURIComponent(agentKey)}`,
      ),

    brainPipelineStreamUrl: (agentKey: string) => {
      const q = new URLSearchParams({
        agent_key: agentKey.trim(),
        admin_token: opts.token,
      })
      return resolveAdminRequestUrl(
        adminApiPath(`/moe/brain/pipeline/stream?${q}`),
        opts,
      )
    },

    brainPipelineWsUrl: (agentKey: string) => {
      const q = new URLSearchParams({
        agent_key: agentKey.trim(),
        admin_token: opts.token,
      })
      const path = `/ws/admin/moe/brain/pipeline?${q}`
      if (typeof window !== 'undefined' && (window.location.port === '5173' || window.location.port === '4173')) {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        return `${proto}//${window.location.host}${path}`
      }
      const httpUrl = resolveAdminRequestUrl(path, opts)
      const u = new URL(httpUrl)
      u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'
      return u.toString()
    },

    // ── Moe Brain Graph ──────────────────────────────────
    getMoeBrainGraph: (agentKey: string, limit = 80) =>
      api<
        BaseResp<{
          agent_key: string
          nodes: Array<{
            id: string
            kind: string
            label: string
            summary: string
            weight: number
            ref_id: string
          }>
          edges: Array<{
            id: string
            source: string
            target: string
            relation: string
            weight: number
          }>
          episode_count: number
          memory_count: number
          tag_count: number
        }>
      >(
        adminApiPath(
          `/moe/runtimes/${encodeURIComponent(agentKey)}/brain/graph?limit=${limit}`,
        ),
      ),

    // ── Moe Bot Flow ─────────────────────────────────────
    getMoeBotFlow: (agentKey: string) =>
      api<BaseResp<MoeBotFlowData>>(
        adminApiPath(`/moe/runtimes/${encodeURIComponent(agentKey)}/flow`),
      ),

    putMoeBotFlow: (
      agentKey: string,
      body: {
        nodes: MoeFlowNodeItem[]
        edges: MoeFlowEdgeItem[]
        viewport_zoom?: number
        viewport_x?: number
        viewport_y?: number
      },
    ) =>
      api<BaseResp<MoeBotFlowData>>(
        adminApiPath(`/moe/runtimes/${encodeURIComponent(agentKey)}/flow`),
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      ),

    deleteMoeBotFlow: (agentKey: string) =>
      api<BaseResp<MoeBotFlowData>>(
        adminApiPath(`/moe/runtimes/${encodeURIComponent(agentKey)}/flow`),
        { method: 'DELETE' },
      ),

    // ── Moe Brain ────────────────────────────────────────
    getMoeBrain: (agentKey: string) =>
      api<
        BaseResp<{
          agent_key: string
          display_name: string
          bot_user_id: string
          forbidden_tags: string[]
          preferred_tags: string[]
          tag_stats: Array<{ tag: string; count: number }>
          episodes: Array<{
            id: number
            post_id: string
            content: string
            tags: string[]
            mood_tag: string
            style_score: number
            quality_score: number
            approved: boolean
            revision_count: number
            memory_key: string
            source: string
            created_at: string
          }>
          memories: Array<{
            key: string
            value: string
            memory_type: string
            updated_at: string
          }>
          generation_meta?: MoeBrainGenerationMeta
        }>
      >(adminApiPath(`/moe/runtimes/${encodeURIComponent(agentKey)}/brain`)),

    updateMoeBrainPolicy: (
      agentKey: string,
      body: { forbidden_tags?: string[]; preferred_tags?: string[] },
    ) =>
      api<
        BaseResp<{
          agent_key: string
          display_name: string
          bot_user_id: string
          forbidden_tags: string[]
          preferred_tags: string[]
          tag_stats: Array<{ tag: string; count: number }>
          episodes: unknown[]
          memories: unknown[]
        }>
      >(adminApiPath(`/moe/runtimes/${encodeURIComponent(agentKey)}/brain/policy`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),

    deleteMoeBrainEpisode: (id: number) =>
      api<BaseResp<unknown>>(adminApiPath(`/moe/brain/episodes/${id}`), {
        method: 'DELETE',
      }),

    refineMoeBrainEpisode: (id: number, body?: { max_attempts?: number }) =>
      api<
        BaseResp<{
          episode_id: number
          ok: boolean
          approved: boolean
          quality_score: number
          before_content: string
          after_content: string
          attempts: number
          detail: string
        }>
      >(adminApiPath(`/moe/brain/episodes/${id}/refine`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      }),

    curateMoeBrain: (
      agentKey: string,
      body?: {
        max_episodes?: number
        max_attempts?: number
        min_quality?: number
        force?: boolean
      },
    ) =>
      api<
        BaseResp<{
          agent_key: string
          total: number
          approved: number
          results: Array<{
            episode_id: number
            ok: boolean
            approved: boolean
            quality_score: number
            detail: string
          }>
        }>
      >(adminApiPath(`/moe/runtimes/${encodeURIComponent(agentKey)}/brain/curate`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      }),

    // ── Moe Brain RPG ────────────────────────────────────
    getMoeBrainRpg: (agentKey: string) =>
      api<
        BaseResp<{
          agent_key: string
          level: number
          xp: number
          xp_to_next: number
          stability_score: number
          skills: Array<{
            tag: string
            label: string
            level: number
            locked: boolean
            usage_count: number
          }>
          fragments: Array<{
            id: number
            kind: string
            title: string
            status: string
            quality_score: number
            approved: boolean
            created_at: string
            memory_key: string
          }>
          recent_dreams: Array<{
            id: number
            ran_at: string
            summary: string
            refined: number
            merged: number
            archived: number
            xp_gained: number
          }>
          stats: {
            total_fragments: number
            solid_memories: number
            pending_tidy: number
            locked_skills: number
            graph_nodes: number
          }
          last_dream_at: string
          dream_enabled: boolean
          dream_cron: string
          next_dream_at: string
          autonomous_mind_enabled: boolean
          pending_delete_count: number
        }>
      >(adminApiPath(`/moe/runtimes/${encodeURIComponent(agentKey)}/brain/rpg`)),

    runMoeBrainDream: (agentKey: string, body?: { skip_curate?: boolean }) =>
      api<
        BaseResp<{
          agent_key: string
          summary: string
          refined: number
          merged: number
          archived: number
          xp_gained: number
          level: number
          xp: number
        }>
      >(adminApiPath(`/moe/runtimes/${encodeURIComponent(agentKey)}/brain/rpg/dream`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      }),

    compressMoeBrainMemories: (agentKey: string, body?: { days?: number }) =>
      api<
        BaseResp<{
          agent_key: string
          memory_key: string
          summary: string
          source_count: number
          xp_gained: number
          swept_count: number
          merged_clusters: number
          marked_count: number
          pending_remaining: number
        }>
      >(adminApiPath(`/moe/runtimes/${encodeURIComponent(agentKey)}/brain/rpg/compress`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      }),

    tidyMoeBrainFragments: (agentKey: string, body?: { max_episodes?: number }) =>
      api<
        BaseResp<{
          agent_key: string
          total: number
          approved: number
          xp_gained: number
        }>
      >(adminApiPath(`/moe/runtimes/${encodeURIComponent(agentKey)}/brain/rpg/tidy`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      }),

    lockMoeBrainSkill: (agentKey: string, body: { tag: string; lock: boolean }) =>
      api<
        BaseResp<{
          agent_key: string
          locked_skills: string[]
        }>
      >(adminApiPath(`/moe/runtimes/${encodeURIComponent(agentKey)}/brain/rpg/skills`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),

    forgetMoeBrainMemory: (agentKey: string, body: { memory_key: string }) =>
      api<
        BaseResp<{
          agent_key: string
          memory_key: string
          deleted: boolean
        }>
      >(adminApiPath(`/moe/runtimes/${encodeURIComponent(agentKey)}/brain/rpg/forget`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),

    getMoeBrainPresence: (agentKey: string) =>
      api<
        BaseResp<{
          agent_key: string
          display_name: string
          activity: string
          mood: string
          thought: string
          pipeline_step: string
          pipeline_running: boolean
          dream_enabled: boolean
          dream_cron: string
          next_dream_at: string
          dreaming: boolean
          autonomous_mind_enabled: boolean
          thought_source: string
        }>
      >(adminApiPath(`/moe/runtimes/${encodeURIComponent(agentKey)}/brain/presence`)),

    updateMoeBrainAutonomousMind: (agentKey: string, body: { autonomous_mind_enabled: boolean }) =>
      api<
        BaseResp<{
          agent_key: string
          autonomous_mind_enabled: boolean
        }>
      >(adminApiPath(`/moe/runtimes/${encodeURIComponent(agentKey)}/brain/rpg/autonomous-mind`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),

    generateMoeBrainThought: (agentKey: string) =>
      api<
        BaseResp<{
          agent_key: string
          thought: string
          thought_source: string
          generated_at: string
        }>
      >(adminApiPath(`/moe/runtimes/${encodeURIComponent(agentKey)}/brain/rpg/think`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),

    updateMoeBrainDreamSchedule: (
      agentKey: string,
      body: { dream_enabled: boolean; dream_cron?: string },
    ) =>
      api<
        BaseResp<{
          agent_key: string
          dream_enabled: boolean
          dream_cron: string
          next_dream_at: string
        }>
      >(adminApiPath(`/moe/runtimes/${encodeURIComponent(agentKey)}/brain/rpg/dream-schedule`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
  }
}
