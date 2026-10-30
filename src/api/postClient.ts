import type { AdminApiFn, BaseResp } from './request'
import { adminApiPath } from './request'

/** 内容管理相关 API */
export function createPostMethods(api: AdminApiFn) {
  return {
    // ── 动态 ──────────────────────────────────────────────
    listPosts: (params: {
      page?: number
      page_size?: number
      keyword?: string
      moderation_status?: string
      include_deleted?: boolean
    } = {}) => {
      const q = new URLSearchParams()
      if (params.page) q.set('page', String(params.page))
      if (params.page_size) q.set('page_size', String(params.page_size))
      if (params.keyword) q.set('keyword', params.keyword)
      if (params.moderation_status) q.set('moderation_status', params.moderation_status)
      if (params.include_deleted) q.set('include_deleted', 'true')
      const qs = q.toString()
      return api<
        BaseResp<{
          items: Array<{
            id: string
            user_id: string
            user_name: string
            content: string
            moderation_status?: string
            likes: number
            comments: number
            created_at: string
          }>
          total: number
        }>
      >(`${adminApiPath('/posts')}${qs ? `?${qs}` : ''}`)
    },

    deletePost: (postId: string) =>
      api<BaseResp<unknown>>(adminApiPath(`/posts/${postId}`), { method: 'DELETE' }),

    // ── 评论 ──────────────────────────────────────────────
    listComments: (params: {
      page?: number
      page_size?: number
      keyword?: string
      post_id?: string
    } = {}) => {
      const q = new URLSearchParams()
      if (params.page) q.set('page', String(params.page))
      if (params.page_size) q.set('page_size', String(params.page_size))
      if (params.keyword) q.set('keyword', params.keyword)
      if (params.post_id) q.set('post_id', params.post_id)
      const qs = q.toString()
      return api<
        BaseResp<{
          items: Array<{
            id: string
            post_id: string
            user_id: string
            user_name: string
            content: string
            created_at: string
          }>
          total: number
        }>
      >(`${adminApiPath('/comments')}${qs ? `?${qs}` : ''}`)
    },

    deleteComment: (commentId: string) =>
      api<BaseResp<unknown>>(adminApiPath(`/comments/${commentId}`), {
        method: 'DELETE',
      }),

    // ── 举报 ──────────────────────────────────────────────
    listPostReports: (params: { page?: number; page_size?: number } = {}) => {
      const q = new URLSearchParams()
      if (params.page) q.set('page', String(params.page))
      if (params.page_size) q.set('page_size', String(params.page_size))
      const qs = q.toString()
      return api<
        BaseResp<{
          items: Array<{
            id: string
            post_id: string
            reporter_user_id: string
            reporter_user_name?: string
            reporter_user_avatar?: string
            post_author_id?: string
            post_author_name?: string
            post_author_avatar?: string
            reason: string
            created_at: string
            post_content_preview: string
            post_content?: string
            post_images?: string[]
            hand_draw_thumb_url?: string
            has_hand_draw?: boolean
          }>
          total: number
        }>
      >(`${adminApiPath('/post-reports')}${qs ? `?${qs}` : ''}`)
    },

    // ── 社区 ──────────────────────────────────────────────
    listGroups: (params: {
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
            name: string
            description: string
            creator_name: string
            member_count: number
            status: string
            is_public: boolean
            created_at: string
          }>
          total: number
        }>
      >(`${adminApiPath('/community/groups')}${qs ? `?${qs}` : ''}`)
    },

    deleteGroup: (groupId: string) =>
      api<BaseResp<unknown>>(adminApiPath(`/community/groups/${groupId}`), {
        method: 'DELETE',
      }),

    // ── 公告 ──────────────────────────────────────────────
    listAnnouncements: (params: {
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
            title: string
            content: string
            status: string
            published_at?: string
            created_at: string
          }>
          total: number
        }>
      >(`${adminApiPath('/announcements')}${qs ? `?${qs}` : ''}`)
    },

    createAnnouncement: (body: { title: string; content: string }) =>
      api<BaseResp<{ id: string; title: string; content: string; status: string }>>(
        adminApiPath('/announcements'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      ),

    updateAnnouncement: (
      id: string,
      body: { title?: string; content?: string },
    ) =>
      api<BaseResp<Record<string, unknown>>>(adminApiPath(`/announcements/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),

    deleteAnnouncement: (id: string) =>
      api<BaseResp<unknown>>(adminApiPath(`/announcements/${id}`), { method: 'DELETE' }),

    publishAnnouncement: (id: string) =>
      api<
        BaseResp<{
          notifications_created?: number
          ws_sent?: number
        }>
      >(
        adminApiPath(`/announcements/${id}/publish`),
        { method: 'POST' },
      ),

    // ── 通知 ──────────────────────────────────────────────
    broadcastNotification: (body: { title: string; content: string }) =>
      api<
        BaseResp<{ notifications_created: number; ws_sent: number }>
      >(adminApiPath('/notifications/broadcast'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),

    sendNotification: (body: { user_id: string; title: string; content: string }) =>
      api<
        BaseResp<{ notification_id: string; ws_sent: boolean }>
      >(adminApiPath('/notifications/send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),

    // ── 标签中心 ──────────────────────────────────────────
    listTopicTags: (params: {
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
          items: Array<{ id: string; name: string; color: string; created_at: string }>
          total: number
        }>
      >(`${adminApiPath('/topic-tags')}${qs ? `?${qs}` : ''}`)
    },

    createTopicTag: (body: { name: string; color?: string }) =>
      api<BaseResp<{ id: string; name: string; color: string; created_at: string }>>(
        adminApiPath('/topic-tags'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      ),

    bootstrapTopicTags: () =>
      api<BaseResp<{ created: number }>>(adminApiPath('/topic-tags/bootstrap'), {
        method: 'POST',
      }),

    updateTopicTag: (tagId: string, body: { name?: string; color?: string }) =>
      api<BaseResp<{ id: string; name: string; color: string; created_at: string }>>(
        adminApiPath(`/topic-tags/${encodeURIComponent(tagId)}`),
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      ),

    deleteTopicTag: (tagId: string) =>
      api<BaseResp<unknown>>(adminApiPath(`/topic-tags/${encodeURIComponent(tagId)}`), {
        method: 'DELETE',
      }),

    listTagDictionary: (params: {
      page?: number
      page_size?: number
      category?: string
      keyword?: string
    } = {}) => {
      const q = new URLSearchParams()
      if (params.page) q.set('page', String(params.page))
      if (params.page_size) q.set('page_size', String(params.page_size))
      if (params.category) q.set('category', params.category)
      if (params.keyword) q.set('keyword', params.keyword)
      const qs = q.toString()
      return api<
        BaseResp<{
          items: Array<{
            id: string
            category: string
            tag: string
            label?: string
            note?: string
            sort_order: number
            enabled: boolean
            created_at: string
            updated_at: string
          }>
          total: number
        }>
      >(`${adminApiPath('/tag-dictionary')}${qs ? `?${qs}` : ''}`)
    },

    createTagDictionary: (body: {
      category: string
      tag: string
      label?: string
      note?: string
      sort_order?: number
      enabled?: boolean
    }) =>
      api<
        BaseResp<{
          id: string
          category: string
          tag: string
          label?: string
          note?: string
          sort_order: number
          enabled: boolean
          created_at: string
          updated_at: string
        }>
      >(adminApiPath('/tag-dictionary'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),

    updateTagDictionary: (
      entryId: string,
      body: {
        category?: string
        tag?: string
        label?: string
        note?: string
        sort_order?: number
        enabled?: boolean
        update_enabled?: boolean
      },
    ) =>
      api<
        BaseResp<{
          id: string
          category: string
          tag: string
          label?: string
          note?: string
          sort_order: number
          enabled: boolean
          created_at: string
          updated_at: string
        }>
      >(adminApiPath(`/tag-dictionary/${encodeURIComponent(entryId)}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),

    deleteTagDictionary: (entryId: string) =>
      api<BaseResp<unknown>>(
        adminApiPath(`/tag-dictionary/${encodeURIComponent(entryId)}`),
        { method: 'DELETE' },
      ),
  }
}
