export type PlaceholderMeta = {
  title: string
  phase: 'P1' | 'P2'
  appDomain: string
  summary: string
  apis: string[]
}

/** 占位页元数据（路径 key 对应 Route path 去掉前导 /） */
export const PLACEHOLDER_PAGES: Record<string, PlaceholderMeta> = {
  'app/vip': {
    title: '会员与套餐',
    phase: 'P1',
    appDomain: 'lib/pages/commerce、VIP 相关',
    summary: '管理 VIP 套餐、用户会员状态；当前可在「用户列表」中改 is_vip。',
    apis: ['GET /api/vip/plans（用户端）', 'PUT /api/admin/users/:id（部分）'],
  },
  'app/wallet': {
    title: '钱包与订单',
    phase: 'P2',
    appDomain: 'lib/pages/commerce、wallet',
    summary: '查看充值/消费流水、订单列表与异常单处理。',
    apis: ['待新增 /api/admin/wallet/*'],
  },
  'app/growth': {
    title: '签到 · 等级 · 成就',
    phase: 'P2',
    appDomain: 'checkin、level、achievements',
    summary: '运营查看签到统计、等级分布、成就发放记录。',
    apis: ['待新增 /api/admin/growth/*'],
  },
  'app/feed': {
    title: '动态审核',
    phase: 'P2',
    appDomain: 'lib/pages/feed',
    summary: '帖子列表、隐藏/删除、违规内容处理。',
    apis: ['待封装 /api/admin/posts/*'],
  },
  'app/comments': {
    title: '评论管理',
    phase: 'P2',
    appDomain: 'feed 评论流',
    summary: '评论检索与下架。',
    apis: ['待新增 /api/admin/comments/*'],
  },
  'app/community': {
    title: '兴趣社区',
    phase: 'P2',
    appDomain: 'lib/pages/community',
    summary: '圈子/话题管理、成员与内容治理。',
    apis: ['待封装 /api/admin/community/*'],
  },
  'app/reports': {
    title: '举报处理',
    phase: 'P2',
    appDomain: '举报、审核',
    summary: '用户举报工单、处理结果与封禁联动。',
    apis: ['待新增 /api/admin/reports/*'],
  },
  'app/announcements': {
    title: '公告管理',
    phase: 'P1',
    appDomain: 'App 内公告位（待接）',
    summary: '富文本公告、上下线、置顶；App 侧后续接 public API。',
    apis: ['待新增 /api/admin/announcements/*'],
  },
  'app/notify': {
    title: '通知推送',
    phase: 'P1',
    appDomain: 'notification',
    summary: '全员或指定用户广播；封装现有 notification RPC。',
    apis: ['待新增 POST /api/admin/notifications/broadcast'],
  },
  'app/ai': {
    title: 'AI 角色酒馆',
    phase: 'P2',
    appDomain: 'lib/pages/ai',
    summary: '公开 Agent、酒馆配置与内容审核。',
    apis: ['待新增 /api/admin/ai/*'],
  },
  'app/gifts': {
    title: '礼物与扭蛋',
    phase: 'P2',
    appDomain: 'gacha、gifts',
    summary: '礼物 catalog、扭蛋池与发放记录。',
    apis: ['待封装 /api/admin/gifts/*'],
  },
  'app/social': {
    title: '好友与关注',
    phase: 'P2',
    appDomain: 'discover、friend',
    summary: '关系链查询与异常账号处理（只读为主）。',
    apis: ['待新增 /api/admin/social/*'],
  },
  'system/admins': {
    title: '管理员账号',
    phase: 'P1',
    appDomain: 'admin_accounts 表',
    summary: 'CRUD 管理员、改密、角色 super_admin / admin。',
    apis: ['已有登录；待增 /api/admin/accounts/*'],
  },
  'system/audit': {
    title: '操作日志',
    phase: 'P1',
    appDomain: 'admin_audit_log',
    summary: '记录管理员关键操作便于追溯。',
    apis: ['GET /api/admin/audit-logs'],
  },
}
