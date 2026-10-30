/**
 * adminClient.ts — 向后兼容 re-export
 *
 * 实际实现已按模块拆分为：
 *   request.ts        公共请求工具
 *   userClient.ts     用户管理
 *   postClient.ts     内容运营
 *   aiClient.ts       AI 与玩法
 *   commerceClient.ts 商业化（VIP / 礼物 / 订单）
 *   systemClient.ts   系统运维
 *
 * 本文件负责组装所有模块并 re-export，保证现有 import 路径不变。
 */

import { createAdminApi, type AdminClientOptions } from './request'
import { createUserMethods } from './userClient'
import { createPostMethods } from './postClient'
import { createAiMethods } from './aiClient'
import { createCommerceMethods } from './commerceClient'
import { createSystemMethods } from './systemClient'

// ── 组装 AdminClient ──────────────────────────────────────────────────

export function createAdminClient(opts: AdminClientOptions) {
  const api = createAdminApi(opts)
  return {
    ...createUserMethods(api),
    ...createPostMethods(api),
    ...createAiMethods(api, opts),
    ...createCommerceMethods(api),
    ...createSystemMethods(api),
  }
}

export type AdminClient = ReturnType<typeof createAdminClient>

// ── Re-export：request.ts 公共工具 ────────────────────────────────────
export {
  formatFetchError,
  isAdminUnauthorized,
  resolveAdminRequestUrl,
  type AdminClientOptions,
  type BaseResp,
} from './request'

// ── Re-export：userClient 类型 ───────────────────────────────────────
export type {
  AdminUserBehaviorScreenStat,
  AdminUserBehaviorSummary,
  AdminUserProfileData,
} from './userClient'

// ── Re-export：aiClient 类型 ─────────────────────────────────────────
export type {
  MoeBrainGenerationMeta,
  MoeInferenceStatusData,
  MoeInferenceModelInfoData,
  MoeInferenceCreateModelReq,
  MoeInferenceMutationData,
  MoeInferenceChatMessage,
  MoeInferenceChatReq,
  MoeInferenceChatData,
  MoePipelineStepItem,
  MoeGenAttemptItem,
  MoeHostMetrics,
  MoePipelineToolInvokeItem,
  MoeBrainPipelineData,
  MoeFlowNodeItem,
  MoeFlowEdgeItem,
  MoeBotFlowData,
} from './aiClient'
