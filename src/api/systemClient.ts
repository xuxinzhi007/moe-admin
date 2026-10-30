import type { AdminApiFn, BaseResp } from './request'
import { adminApiPath } from './request'

/** 系统运维相关 API */
export function createSystemMethods(api: AdminApiFn) {
  return {
    // ── 登录 / 鉴权 ──────────────────────────────────────
    login: (username: string, password: string) =>
      api<BaseResp<{
        token: string
        admin_id: number
        username: string
        role: string
        expire_at: number
      }>>(adminApiPath('/login'), {
        method: 'POST',
        auth: false,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      }),

    me: () =>
      api<BaseResp<{ admin_id: number; username: string; role: string }>>(
        adminApiPath('/me'),
      ),

    dashboard: () =>
      api<
        BaseResp<{
          user_total: number
          landing_feedback_total?: number
          server_time: string
          feishu_enabled: boolean
        }>
      >(adminApiPath('/dashboard')),

    // ── 管理员账号 ────────────────────────────────────────
    listAccounts: (params: {
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
            username: string
            role: string
            last_login_at?: string
            created_at: string
          }>
          total: number
        }>
      >(`${adminApiPath('/accounts')}${qs ? `?${qs}` : ''}`)
    },

    createAccount: (body: { username: string; password: string; role?: string }) =>
      api<BaseResp<{ id: string; username: string; role: string }>>(
        adminApiPath('/accounts'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      ),

    updateAccount: (
      id: string,
      body: { username?: string; password?: string; role?: string },
    ) =>
      api<BaseResp<Record<string, unknown>>>(adminApiPath(`/accounts/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),

    deleteAccount: (id: string) =>
      api<BaseResp<unknown>>(adminApiPath(`/accounts/${id}`), { method: 'DELETE' }),

    // ── 审计日志 ─────────────────────────────────────────
    listAuditLogs: (params: {
      page?: number
      page_size?: number
      action?: string
      resource?: string
      admin_id?: string
    } = {}) => {
      const q = new URLSearchParams()
      if (params.page) q.set('page', String(params.page))
      if (params.page_size) q.set('page_size', String(params.page_size))
      if (params.action) q.set('action', params.action)
      if (params.resource) q.set('resource', params.resource)
      if (params.admin_id) q.set('admin_id', params.admin_id)
      const qs = q.toString()
      return api<
        BaseResp<{
          items: Array<{
            id: string
            admin_id: string
            admin_name: string
            action: string
            resource: string
            resource_id: string
            detail: string
            ip: string
            created_at: string
          }>
          total: number
        }>
      >(`${adminApiPath('/audit-logs')}${qs ? `?${qs}` : ''}`)
    },

    // ── 数据字典 / 配置 ─────────────────────────────────
    getSchemaCatalog: () =>
      api<
        BaseResp<{
          summary: {
            total_tables: number
            managed_full: number
            managed_partial: number
            unmanaged: number
            total_rows: number
          }
          items: Array<{
            key: string
            table_name: string
            label: string
            domain: string
            coverage: string
            capabilities: string[]
            admin_route?: string
            bootstrap_key?: string
            row_count: number
            note?: string
          }>
        }>
      >(adminApiPath('/schema/catalog')),

    getAppRelease: (platform = 'android') => {
      const q = new URLSearchParams({ platform })
      return api<
        BaseResp<{
          configured: boolean
          release?: {
            platform: string
            version_name: string
            version_code: number
            apk_url: string
            changelog: string
            force_update: boolean
            enabled: boolean
            updated_at: string
            updated_by: string
          }
        }>
      >(`${adminApiPath('/app-release')}?${q}`)
    },

    upsertAppRelease: (body: {
      platform: string
      version_name: string
      version_code: number
      apk_url: string
      changelog: string
      force_update: boolean
      enabled: boolean
    }) =>
      api<
        BaseResp<{
          release: {
            platform: string
            version_name: string
            version_code: number
            apk_url: string
            changelog: string
            force_update: boolean
            enabled: boolean
            updated_at: string
            updated_by: string
          }
        }>
      >(adminApiPath('/app-release'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),

    getRuntimeConfig: () =>
      api<
        BaseResp<{
          public_api_base_url: string
          api_public_base_url: string
          image_public_base_url: string
          image_local_dir: string
          image_max_bytes: number
          config_file: string
          requires_restart: boolean
        }>
      >(adminApiPath('/runtime-config')),

    updateRuntimeConfig: (body: {
      public_api_base_url?: string
      update_public_api_base_url?: boolean
      api_public_base_url?: string
      update_api_public_base_url?: boolean
      image_public_base_url?: string
      update_image_public_base_url?: boolean
      image_local_dir?: string
      update_image_local_dir?: boolean
      image_max_bytes?: number
      update_image_max_bytes?: boolean
    }) =>
      api<
        BaseResp<{
          public_api_base_url: string
          api_public_base_url: string
          image_public_base_url: string
          image_local_dir: string
          image_max_bytes: number
          config_file: string
          requires_restart: boolean
        }>
      >(adminApiPath('/runtime-config'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),

    // ── 媒体图库 ─────────────────────────────────────────
    listMediaImages: (params: {
      page?: number
      page_size?: number
      keyword?: string
      owner_folder?: string
      media_kind?: string
    } = {}) => {
      const q = new URLSearchParams()
      if (params.page) q.set('page', String(params.page))
      if (params.page_size) q.set('page_size', String(params.page_size))
      if (params.keyword) q.set('keyword', params.keyword)
      if (params.owner_folder) q.set('owner_folder', params.owner_folder)
      if (params.media_kind) q.set('media_kind', params.media_kind)
      const qs = q.toString()
      return api<
        BaseResp<{
          items: Array<{
            filename: string
            file_name: string
            owner_folder: string
            media_kind: string
            url: string
            size: number
            created_at: string
            owner_hint?: string
          }>
          total: number
          owners: Array<{
            owner_folder: string
            user_id?: string
            username_hint?: string
            file_count: number
            total_bytes: number
          }>
        }>
      >(`${adminApiPath('/media/images')}${qs ? `?${qs}` : ''}`)
    },

    deleteMediaImage: (filename: string) =>
      api<BaseResp<unknown>>(
        adminApiPath(`/media/images/${encodeURIComponent(filename)}`),
        { method: 'DELETE' },
      ),

    // ── 成长体系（签到·等级·成就）────────────────────────
    listAchievements: (params: {
      page?: number
      page_size?: number
      keyword?: string
      category?: string
    } = {}) => {
      const q = new URLSearchParams()
      if (params.page) q.set('page', String(params.page))
      if (params.page_size) q.set('page_size', String(params.page_size))
      if (params.keyword) q.set('keyword', params.keyword)
      if (params.category) q.set('category', params.category)
      const qs = q.toString()
      return api<
        BaseResp<{
          items: Array<{
            id: string
            name: string
            description: string
            category: string
            rarity: string
            enabled: boolean
            sort_order: number
          }>
          total: number
        }>
      >(`${adminApiPath('/growth/achievements')}${qs ? `?${qs}` : ''}`)
    },

    bootstrapAchievements: () =>
      api<BaseResp<{ created: number }>>(adminApiPath('/achievements/bootstrap'), {
        method: 'POST',
      }),

    bootstrapLevels: () =>
      api<
        BaseResp<{
          level_configs_created: number
          check_in_rewards_created: number
        }>
      >(adminApiPath('/growth/levels/bootstrap'), { method: 'POST' }),

    getGrowthStats: () =>
      api<
        BaseResp<{
          achievement_definitions: number
          unlocked_progress_records: number
          level_configs: number
          check_in_rewards: number
          user_levels: number
          check_ins_today: number
          total_check_ins: number
        }>
      >(adminApiPath('/growth/stats')),

    listLevelConfigs: () =>
      api<
        BaseResp<{
          items: Array<{
            id: string
            level: number
            title: string
            min_exp: number
            max_exp: number
            privileges: string
            badge_url: string
          }>
        }>
      >(adminApiPath('/growth/levels')),

    updateLevelConfig: (
      levelId: string | number,
      body: {
        title?: string
        min_exp?: number
        max_exp?: number
        privileges?: string
        badge_url?: string
        update_title?: boolean
        update_min_exp?: boolean
        update_max_exp?: boolean
        update_privileges?: boolean
        update_badge_url?: boolean
      },
    ) =>
      api<
        BaseResp<{
          id: string
          level: number
          title: string
          min_exp: number
          max_exp: number
          privileges: string
          badge_url: string
        }>
      >(adminApiPath(`/growth/levels/${levelId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),

    listCheckInRewards: () =>
      api<
        BaseResp<{
          items: Array<{
            id: string
            consecutive_days: number
            exp_reward: number
            extra_reward: string
          }>
        }>
      >(adminApiPath('/growth/check-in-rewards')),

    updateCheckInReward: (
      rewardId: string | number,
      body: {
        consecutive_days?: number
        exp_reward?: number
        extra_reward?: string
        update_consecutive_days?: boolean
        update_exp_reward?: boolean
        update_extra_reward?: boolean
      },
    ) =>
      api<
        BaseResp<{
          id: string
          consecutive_days: number
          exp_reward: number
          extra_reward: string
        }>
      >(adminApiPath(`/growth/check-in-rewards/${rewardId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),

    updateAchievement: (
      achievementId: string,
      body: {
        name?: string
        description?: string
        enabled?: boolean
        exp_reward?: number
        sort_order?: number
        update_name?: boolean
        update_description?: boolean
        update_enabled?: boolean
        update_exp_reward?: boolean
        update_sort_order?: boolean
      },
    ) =>
      api<
        BaseResp<{
          id: string
          name: string
          description: string
          category: string
          rarity: string
          enabled: boolean
          sort_order: number
          exp_reward: number
        }>
      >(adminApiPath(`/growth/achievements/${achievementId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),

    // ── 运维 / 运行时 ────────────────────────────────────
    getRuntimeOverview: () =>
      api<
        BaseResp<{
          layout: string
          processes_note: string
          estimated_rss_mb: number
          rpc_monitor_online: boolean
          api_process: {
            role: string
            pid: number
            go_alloc_mb: number
            go_sys_mb: number
            rss_mb: number
            goroutines: number
            num_cpu: number
            reachable: boolean
            same_process?: boolean
          }
          rpc_process: {
            role: string
            pid: number
            go_alloc_mb: number
            go_sys_mb: number
            rss_mb: number
            goroutines: number
            num_cpu: number
            reachable: boolean
            same_process?: boolean
          }
        }>
      >(adminApiPath('/runtime/overview')),

    getAnalyticsOverview: () =>
      api<
        BaseResp<{
          user_total: number
          users_new_7d: number
          users_by_day: Array<{ date: string; count: number }>
          memory_total: number
          memory_users: number
          memories_by_day: Array<{ date: string; count: number }>
          memory_by_type: Array<{ memory_type: string; count: number }>
          moe_tool_calls_7d: number
          moe_tool_success_rate: number
          moe_tools_by_day: Array<{ date: string; count: number }>
          chat_sessions_total: number
          chat_messages_7d: number
          chat_messages_by_day: Array<{ date: string; count: number }>
        }>
      >(adminApiPath('/analytics/overview')),

    // ── Moe 运行时（调度/配额）───────────────────────────
    listMoeRuntimes: () =>
      api<
        BaseResp<{
          items: Array<{
            agent_key: string
            display_name: string
            bot_user_id: string
            capability_tier: string
            model_name: string
            tools_enabled: boolean
            post_quota_daily: number
            posts_today: number
            enabled: boolean
            last_run_at?: string
            last_post_id?: string
            post_schedule_mode?: string
            schedule_cron?: string
            next_run_at?: string
            system_prompt?: string
            post_rules?: string
          }>
        }>
      >(adminApiPath('/moe/runtimes')),

    upsertMoeRuntime: (body: {
      agent_key: string
      display_name: string
      bot_user_id: string
      capability_tier?: string
      model_name?: string
      tools_enabled?: boolean
      post_quota_daily?: number
      enabled?: boolean
      system_prompt?: string
      post_rules?: string
      post_schedule_mode?: string
      schedule_cron?: string
    }) =>
      api<BaseResp<unknown>>(adminApiPath('/moe/runtimes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),

    runMoeAgentOnce: (agentKey: string, opts?: { async?: boolean }) => {
      const asyncQ = opts?.async ? '?async=true' : ''
      return api<
        BaseResp<{
          agent_key: string
          ok: boolean
          detail: string
          post_id?: string
          accepted?: boolean
          already_running?: boolean
        }>
      >(adminApiPath(`/moe/runtimes/${encodeURIComponent(agentKey)}/run-once${asyncQ}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    },
  }
}
