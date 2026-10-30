import type { AdminApiFn, BaseResp } from './request'
import { adminApiPath } from './request'

export type AdminUserBehaviorScreenStat = {
  screen: string
  label: string
  visit_count: number
  total_duration_ms: number
}

export type AdminUserBehaviorSummary = {
  tags?: string[]
  last_active_at?: string
  total_events_7d?: number
  top_screens?: AdminUserBehaviorScreenStat[]
}

export type AdminUserProfileData = {
  user: {
    id: string
    username: string
    email: string
    moe_no?: string
    avatar?: string
    signature?: string
    role?: string
    is_vip: boolean
    created_at: string
  }
  counts: {
    posts: number
    comments: number
    following: number
    followers: number
    check_ins: number
    achievements_unlocked: number
    vip_orders: number
    gift_sent: number
    gift_received: number
    gift_stocks: number
    transactions: number
    ai_agents: number
    groups_joined: number
  }
  level?: {
    level: number
    experience: number
    total_exp: number
    level_title?: string
  }
  links: Array<{
    label: string
    admin_route: string
    hint?: string
  }>
  behavior?: AdminUserBehaviorSummary
}

/** 用户管理相关 API */
export function createUserMethods(api: AdminApiFn) {
  return {
    listUsers: (params: {
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
            email: string
            moe_no?: string
            avatar?: string
            signature?: string
            role?: string
            is_vip: boolean
            created_at: string
          }>
          total: number
        }>
      >(`${adminApiPath('/users')}${qs ? `?${qs}` : ''}`)
    },

    getUser: (userId: string | number) =>
      api<
        BaseResp<{
          id: string
          username: string
          email: string
          moe_no?: string
          role?: string
          is_vip: boolean
          signature?: string
          created_at: string
        }>
      >(adminApiPath(`/users/${userId}`)),

    updateUser: (
      userId: string | number,
      body: {
        role?: string
        is_vip?: boolean
        update_is_vip?: boolean
        signature?: string
        update_signature?: boolean
        avatar?: string
        update_avatar?: boolean
      },
    ) =>
      api<BaseResp<Record<string, unknown>>>(adminApiPath(`/users/${userId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),

    getUserProfile: (userId: string | number) =>
      api<BaseResp<AdminUserProfileData>>(adminApiPath(`/users/${userId}/profile`)),

    listFollows: (params: {
      page?: number
      page_size?: number
      keyword?: string
      user_id?: string
    } = {}) => {
      const q = new URLSearchParams()
      if (params.page) q.set('page', String(params.page))
      if (params.page_size) q.set('page_size', String(params.page_size))
      if (params.keyword) q.set('keyword', params.keyword)
      if (params.user_id) q.set('user_id', params.user_id)
      const qs = q.toString()
      return api<
        BaseResp<{
          items: Array<{
            id: string
            follower_id: string
            follower_name: string
            following_id: string
            following_name: string
            created_at: string
          }>
          total: number
        }>
      >(`${adminApiPath('/social/follows')}${qs ? `?${qs}` : ''}`)
    },

    listFriendRequests: (params: {
      page?: number
      page_size?: number
      keyword?: string
      status?: string
    } = {}) => {
      const q = new URLSearchParams()
      if (params.page) q.set('page', String(params.page))
      if (params.page_size) q.set('page_size', String(params.page_size))
      if (params.keyword) q.set('keyword', params.keyword)
      if (params.status) q.set('status', params.status)
      const qs = q.toString()
      return api<
        BaseResp<{
          items: Array<{
            id: string
            from_user_id: string
            from_user_name: string
            to_user_id: string
            to_user_name: string
            status: string
            created_at: string
          }>
          total: number
        }>
      >(`${adminApiPath('/social/friend-requests')}${qs ? `?${qs}` : ''}`)
    },

    deleteFollow: (followId: string) =>
      api<BaseResp<unknown>>(adminApiPath(`/social/follows/${followId}`), {
        method: 'DELETE',
      }),
  }
}
