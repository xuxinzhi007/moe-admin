import type { AdminApiFn, BaseResp } from './request'
import { adminApiPath } from './request'

/** 商业化相关 API */
export function createCommerceMethods(api: AdminApiFn) {
  return {
    // ── VIP 套餐 ─────────────────────────────────────────
    listVipPlans: (params: {
      page?: number
      page_size?: number
      keyword?: string
      include_deleted?: boolean
    } = {}) => {
      const q = new URLSearchParams()
      if (params.page) q.set('page', String(params.page))
      if (params.page_size) q.set('page_size', String(params.page_size))
      if (params.keyword) q.set('keyword', params.keyword)
      if (params.include_deleted) q.set('include_deleted', 'true')
      const qs = q.toString()
      return api<
        BaseResp<{
          items: Array<{
            id: string
            name: string
            description: string
            price: number
            duration_days: number
            created_at: string
            updated_at: string
          }>
          total: number
        }>
      >(`${adminApiPath('/vip/plans')}${qs ? `?${qs}` : ''}`)
    },

    getVipPlan: (planId: string | number) =>
      api<
        BaseResp<{
          id: string
          name: string
          description: string
          price: number
          duration_days: number
          created_at: string
          updated_at: string
        }>
      >(adminApiPath(`/vip/plans/${planId}`)),

    createVipPlan: (body: {
      name: string
      description?: string
      price: number
      duration_days: number
    }) =>
      api<
        BaseResp<{
          id: string
          name: string
          description: string
          price: number
          duration_days: number
        }>
      >(adminApiPath('/vip/plans'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),

    updateVipPlan: (
      planId: string | number,
      body: {
        name?: string
        description?: string
        price?: number
        duration_days?: number
        update_name?: boolean
        update_description?: boolean
        update_price?: boolean
        update_duration_days?: boolean
      },
    ) =>
      api<BaseResp<Record<string, unknown>>>(adminApiPath(`/vip/plans/${planId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),

    deleteVipPlan: (planId: string | number) =>
      api<BaseResp<unknown>>(adminApiPath(`/vip/plans/${planId}`), {
        method: 'DELETE',
      }),

    bootstrapVipPlans: () =>
      api<BaseResp<{ created: number }>>(adminApiPath('/vip/plans/bootstrap'), {
        method: 'POST',
      }),

    // ── 礼物 ─────────────────────────────────────────────
    listGifts: (params: {
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
            price: number
            icon: string
            description: string
            category: string
            sort_order: number
            created_at: string
            updated_at: string
          }>
          total: number
        }>
      >(`${adminApiPath('/gifts')}${qs ? `?${qs}` : ''}`)
    },

    createGift: (body: {
      name: string
      price: number
      icon?: string
      description?: string
      category?: string
      sort_order?: number
    }) =>
      api<BaseResp<Record<string, unknown>>>(adminApiPath('/gifts'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),

    updateGift: (
      giftId: string,
      body: Record<string, unknown>,
    ) =>
      api<BaseResp<Record<string, unknown>>>(adminApiPath(`/gifts/${giftId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),

    deleteGift: (giftId: string) =>
      api<BaseResp<unknown>>(adminApiPath(`/gifts/${giftId}`), { method: 'DELETE' }),

    bootstrapGifts: () =>
      api<BaseResp<{ created: number }>>(adminApiPath('/gifts/bootstrap'), {
        method: 'POST',
      }),

    dedupeGifts: () =>
      api<BaseResp<{ removed: number }>>(adminApiPath('/gifts/dedupe'), {
        method: 'POST',
      }),

    // ── 订单 ─────────────────────────────────────────────
    listVipOrders: (params: {
      page?: number
      page_size?: number
      user_id?: string
      keyword?: string
      status?: string
    } = {}) => {
      const q = new URLSearchParams()
      if (params.page) q.set('page', String(params.page))
      if (params.page_size) q.set('page_size', String(params.page_size))
      if (params.user_id) q.set('user_id', params.user_id)
      if (params.keyword) q.set('keyword', params.keyword)
      if (params.status) q.set('status', params.status)
      const qs = q.toString()
      return api<
        BaseResp<{
          items: Array<{
            id: string
            user_id: string
            plan_id: string
            plan_name: string
            amount: number
            status: string
            order_no: string
            created_at: string
            paid_at?: string
          }>
          total: number
        }>
      >(`${adminApiPath('/orders/vip')}${qs ? `?${qs}` : ''}`)
    },

    listGiftPurchaseOrders: (params: {
      page?: number
      page_size?: number
      user_id?: string
      keyword?: string
      status?: string
    } = {}) => {
      const q = new URLSearchParams()
      if (params.page) q.set('page', String(params.page))
      if (params.page_size) q.set('page_size', String(params.page_size))
      if (params.user_id) q.set('user_id', params.user_id)
      if (params.keyword) q.set('keyword', params.keyword)
      if (params.status) q.set('status', params.status)
      const qs = q.toString()
      return api<
        BaseResp<{
          items: Array<{
            id: string
            user_id: string
            order_no: string
            gift_id: string
            gift_name: string
            quantity: number
            total_amount: number
            status: string
            created_at: string
          }>
          total: number
        }>
      >(`${adminApiPath('/orders/gift-purchase')}${qs ? `?${qs}` : ''}`)
    },
  }
}
