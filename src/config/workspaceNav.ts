/**
 * 工作区 + 侧栏 + 旧链重定向 SSOT。
 * 禁止在 SidebarNav / App 再手写第二份菜单。
 * Legacy redirects: remove after 2026-12
 */

import type { AdminIconName } from '../components/AdminIcon'

export type WorkspaceId = 'biz' | 'ai' | 'infra'

export type NavItem = {
  kind: 'item'
  /** 路由 path（相对 basename=/ops），含工作区前缀 */
  to: string
  label: string
  end?: boolean
  /** AdminIcon 名，禁止 emoji */
  icon?: AdminIconName
  title?: string
}

export type NavGroup = {
  kind: 'group'
  id: string
  label: string
  icon?: AdminIconName
  caption?: string
  defaultOpen?: boolean
  children: NavItem[]
}

export type NavEntry = NavItem | NavGroup

export type WorkspaceMeta = {
  id: WorkspaceId
  label: string
  /** 点顶栏 Tab 时的落地 path */
  home: string
  caption: string
}

export const WORKSPACES: WorkspaceMeta[] = [
  { id: 'biz', label: '运营', home: '/biz', caption: '用户 · 内容 · 触达' },
  { id: 'ai', label: 'AI', home: '/ai/moe-brain', caption: 'Bot · 大脑 · 工具' },
  { id: 'infra', label: '运维', home: '/infra/deploy', caption: '后端发布 · 配置 · 审计' },
]

export const DEFAULT_WORKSPACE: WorkspaceId = 'biz'

export const NAV_BY_WORKSPACE: Record<WorkspaceId, NavEntry[]> = {
  biz: [
    {
      kind: 'item',
      to: '/biz',
      label: '工作台',
      icon: 'home',
      end: true,
      title: '运营工作台',
    },
    {
      kind: 'group',
      id: 'biz-users',
      label: 'App 用户',
      icon: 'users',
      caption: '账号 · 会员 · 成长',
      defaultOpen: true,
      children: [
        { kind: 'item', to: '/biz/users', label: '用户列表', title: '用户与账号管理' },
        { kind: 'item', to: '/biz/vip/plans', label: '会员与套餐', title: 'VIP 套餐管理' },
        { kind: 'item', to: '/biz/wallet/orders', label: '钱包与订单', title: '钱包与订单管理' },
        { kind: 'item', to: '/biz/growth', label: '签到 · 等级 · 成就', title: '成长体系管理' },
        { kind: 'item', to: '/biz/social', label: '好友与关注', title: '关系链管理' },
      ],
    },
    {
      kind: 'group',
      id: 'biz-pet-content',
      label: '养成内容',
      icon: 'content',
      caption: '角色 · 家具 · 装饰',
      defaultOpen: false,
      children: [
        {
          kind: 'item',
          to: '/biz/pet/content',
          label: '内容总览',
          title: '角色 / 家具 / 装饰官方包',
        },
        {
          kind: 'item',
          to: '/biz/pet/avatar',
           label: '序列帧工作台',
           title: 'AI 序列帧整理 · 网格 Sheet 导出',
        },
        {
          kind: 'item',
          to: '/biz/pet/furniture',
          label: '家具',
          title: '单品 PNG · 场景元数据',
        },
        {
          kind: 'item',
          to: '/biz/pet/decor',
          label: '装饰',
          title: '墙贴 / 挂饰（规划）',
        },
      ],
    },
    {
      kind: 'group',
      id: 'biz-content',
      label: '内容运营',
      icon: 'content',
      caption: '动态 · 社区 · 公告',
      defaultOpen: false,
      children: [
        { kind: 'item', to: '/biz/content/posts', label: '动态审核', title: '动态内容审核' },
        { kind: 'item', to: '/biz/content/comments', label: '评论管理', title: '评论内容审核' },
        { kind: 'item', to: '/biz/content/community', label: '兴趣社区', title: '社区与圈子管理' },
        { kind: 'item', to: '/biz/content/reports', label: '举报处理', title: '举报工单处理' },
        { kind: 'item', to: '/biz/announcements', label: '公告管理', title: 'App 公告管理' },
        { kind: 'item', to: '/biz/update', label: 'App 版本更新', title: 'Android 版本与强制更新' },
        { kind: 'item', to: '/biz/notify', label: '通知推送', title: '通知广播' },
      ],
    },
    {
      kind: 'group',
      id: 'biz-commerce',
      label: '商业与数据',
      icon: 'chart',
      caption: '礼物 · 标签 · 分析',
      defaultOpen: false,
      children: [
        { kind: 'item', to: '/biz/gifts/catalog', label: '礼物与扭蛋', title: '礼物与扭蛋管理' },
        { kind: 'item', to: '/biz/tags', label: '统一标签中心', title: '标签与分类' },
        { kind: 'item', to: '/biz/analytics', label: '数据分析看板', title: '分析看板' },
        { kind: 'item', to: '/biz/media-gallery', label: '云图库', title: '媒体资源管理' },
      ],
    },
  ],
  ai: [
    {
      kind: 'item',
      to: '/ai/moe-brain',
      label: 'AI 大脑',
      icon: 'brain',
      title: '脑图与推理监控',
    },
    {
      kind: 'item',
      to: '/ai/models',
      label: '模型与 Modelfile',
      icon: 'data',
      title: '小主机模型总览、拉取、定制与 Modelfile',
    },
    {
      kind: 'item',
      to: '/ai/playground',
      label: '模型与角色试聊',
      icon: 'bot',
      title: 'Ollama 模型与酒馆角色流式试聊台',
    },
    {
      kind: 'group',
      id: 'ai-bots',
      label: '角色与 Bot',
      icon: 'bot',
      caption: '酒馆 · 社区 Bot',
      defaultOpen: true,
      children: [
        { kind: 'item', to: '/ai/agents', label: 'AI 角色酒馆', title: 'AI 角色管理' },
        { kind: 'item', to: '/ai/moe-bots', label: '社区 AI Bot', title: 'Bot 配置' },
        { kind: 'item', to: '/ai/moe-flow', label: 'Bot 编排画布', title: 'Bot 流程编排' },
        { kind: 'item', to: '/ai/moe-tools', label: 'Moe 工具与 Bot', title: 'Moe 工具总览' },
        { kind: 'item', to: '/ai/chat-logs', label: 'AI 对话日志', title: 'AI 审计日志' },
      ],
    },
  ],
  infra: [
    {
      kind: 'item',
      to: '/infra/deploy',
      label: '运维总览',
      icon: 'antenna',
      title: '部署总览',
    },
    {
      kind: 'group',
      id: 'infra-platform',
      label: '平台治理',
      icon: 'settings',
      caption: '配置 · 账号 · 审计',
      defaultOpen: true,
      children: [
        { kind: 'item', to: '/infra/platform', label: '平台治理', title: '平台配置与数据地图' },
        { kind: 'item', to: '/infra/admins', label: '管理员账号', title: '管理员管理' },
        { kind: 'item', to: '/infra/audit', label: '操作日志', title: '后台操作日志' },
      ],
    },
    {
      kind: 'group',
      id: 'infra-release',
      label: '构建与发布',
      icon: 'rocket',
      caption: '后端 Docker · Agent',
      defaultOpen: false,
      children: [
        { kind: 'item', to: '/infra/docker', label: '云 Docker', title: 'VPS Docker / compose' },
        { kind: 'item', to: '/infra/build', label: '构建流水线', title: '本机交叉编译后端' },
        {
          kind: 'item',
          to: '/infra/release',
          label: 'GitHub APK 构建',
          title: '触发 flutter-release（不写 app_releases）',
        },
        { kind: 'item', to: '/infra/jobs', label: '任务审计', title: 'Deploy Agent 任务列表' },
      ],
    },
    {
      kind: 'group',
      id: 'infra-dev',
      label: '开发工具',
      icon: 'data',
      caption: 'CodeGraph · 只读导航',
      defaultOpen: false,
      children: [
        {
          kind: 'item',
          to: '/infra/dev/codegraph',
          label: 'CodeGraph',
          title: '跨栈依赖导航图谱（自动生成）',
        },
      ],
    },
  ],
}

/** 旧 path → 新 path（无动态段）。remove after 2026-12 */
export const LEGACY_REDIRECTS: Array<{ from: string; to: string }> = [
  { from: '/users', to: '/biz/users' },
  { from: '/vip/plans', to: '/biz/vip/plans' },
  { from: '/wallet/orders', to: '/biz/wallet/orders' },
  { from: '/gifts/catalog', to: '/biz/gifts/catalog' },
  { from: '/content/posts', to: '/biz/content/posts' },
  { from: '/content/comments', to: '/biz/content/comments' },
  { from: '/content/community', to: '/biz/content/community' },
  { from: '/content/reports', to: '/biz/content/reports' },
  { from: '/app/growth', to: '/biz/growth' },
  { from: '/biz/pet/lpc', to: '/biz/pet/avatar' },
  { from: '/app/announcements', to: '/biz/announcements' },
  { from: '/app/update', to: '/biz/update' },
  { from: '/app/notify', to: '/biz/notify' },
  { from: '/app/analytics', to: '/biz/analytics' },
  { from: '/app/tags', to: '/biz/tags' },
  { from: '/app/social', to: '/biz/social' },
  { from: '/system/media-gallery', to: '/biz/media-gallery' },
  { from: '/system/media', to: '/biz/media-gallery' },
  { from: '/app/ai', to: '/ai/agents' },
  { from: '/app/moe-bots', to: '/ai/moe-bots' },
  { from: '/app/moe-brain', to: '/ai/moe-brain' },
  { from: '/app/moe-flow', to: '/ai/moe-flow' },
  { from: '/app/moe', to: '/ai/moe-tools' },
  { from: '/app/ai/chat-logs', to: '/ai/chat-logs' },
  { from: '/app/moe-tools', to: '/ai/moe-tools' },
  { from: '/system/platform', to: '/infra/platform' },
  { from: '/system/data', to: '/infra/platform?tab=data' },
  { from: '/system/app-config', to: '/infra/platform?tab=config' },
  { from: '/system/admins', to: '/infra/admins' },
  { from: '/system/audit', to: '/infra/audit' },
  { from: '/deploy', to: '/infra/deploy' },
  { from: '/docker', to: '/infra/docker' },
  { from: '/build', to: '/infra/build' },
  { from: '/release', to: '/infra/release' },
  { from: '/jobs', to: '/infra/jobs' },
]

const LEGACY_PREFIX_RULES: Array<{ prefix: string; to: string | ((rest: string) => string) }> = [
  {
    prefix: '/app/moe-bots/',
    to: (rest) => {
      // :agentKey/brain
      const m = rest.match(/^([^/]+)\/brain\/?$/)
      if (m) return `/ai/moe-bots/${m[1]}/brain`
      return `/ai/moe-bots/${rest}`
    },
  },
  { prefix: '/users/', to: () => '/biz/users' },
]

export function workspaceMeta(id: WorkspaceId): WorkspaceMeta {
  return WORKSPACES.find((w) => w.id === id) ?? WORKSPACES[0]
}

export function detectWorkspace(pathname: string): WorkspaceId {
  const p = stripOpsBasename(pathname)
  if (p === '/ai' || p.startsWith('/ai/')) return 'ai'
  if (p === '/infra' || p.startsWith('/infra/')) return 'infra'
  if (p === '/biz' || p.startsWith('/biz/')) return 'biz'
  // legacy path → 推断所属区（重定向前）
  const resolved = resolveAdminPath(p)
  if (resolved.startsWith('/ai')) return 'ai'
  if (resolved.startsWith('/infra')) return 'infra'
  return 'biz'
}

/** 把旧/新/带 basename 的管理台 path 归一到当前路由 path */
export function resolveAdminPath(input: string): string {
  if (!input || input === '/') return '/biz'
  let path = stripOpsBasename(input.trim())
  if (!path.startsWith('/')) path = `/${path}`

  const hashIdx = path.indexOf('#')
  if (hashIdx >= 0) path = path.slice(0, hashIdx)

  const qIdx = path.indexOf('?')
  const query = qIdx >= 0 ? path.slice(qIdx) : ''
  const pathname = qIdx >= 0 ? path.slice(0, qIdx) : path

  if (/^\/(biz|ai|infra)(\/|$)/.test(pathname)) {
    return `${pathname}${query}`
  }

  for (const rule of LEGACY_PREFIX_RULES) {
    if (pathname.startsWith(rule.prefix)) {
      const rest = pathname.slice(rule.prefix.length)
      const to = typeof rule.to === 'function' ? rule.to(rest) : rule.to
      return `${to}${query}`
    }
  }

  // 长 path 优先匹配（如 /app/ai/chat-logs 先于 /app/ai）
  const sorted = [...LEGACY_REDIRECTS].sort((a, b) => b.from.length - a.from.length)
  for (const { from, to } of sorted) {
    if (pathname === from) {
      if (to.includes('?')) {
        // 目标自带 query 时合并：目标 query 优先，再附带原 query 中未覆盖的键（简化为：有原 query 则拼在后）
        if (!query) return to
        const [toPath, toQ] = to.split('?')
        return `${toPath}?${toQ}${query.startsWith('?') ? `&${query.slice(1)}` : ''}`
      }
      return `${to}${query}`
    }
  }

  return `/biz${pathname === '/' ? '' : pathname}${query}`
}

function stripOpsBasename(pathname: string): string {
  if (pathname.startsWith('/ops/')) return pathname.slice(4)
  if (pathname === '/ops') return '/'
  return pathname
}
