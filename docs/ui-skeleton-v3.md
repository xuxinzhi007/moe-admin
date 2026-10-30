# Moe Admin UI 骨架 V3（一套复用，禁止多套并行）

> 配套 [DESIGN.md](../DESIGN.md) · [css-architecture-v3.md](./css-architecture-v3.md)  
> **原则**：React 组件骨架 + CSS Token **各只有一套**；页面只组合、不发明布局。

---

## 1. 现状：已经有什么、缺什么

### 1.1 已有可复用（保留，V3 只改 class/token）

| 层 | 组件 | 用途 | 覆盖页数（约） |
|----|------|------|----------------|
| 布局 | `AppShell` / `SidebarNav` | 壳层 | 全站 |
| 环境 | `DataEnvBar` | 数据环境提示 | 25+ |
| 指标 | `PageInsightStrip` | 顶部摘要卡 | 20+ |
| 导航 | `PageTabs` | Tab 工作台 | Platform、Tools 等 |
| 表单 | `FormField` / `AdminFormDrawer` | 抽屉 CRUD | 15+ |
| 单元格 | `IdCell` / `UserCell` / `UserAvatar` | 表格列 | 10+ |
| 标签 | `AdminTag` | 语义 tag | 10+ |
| 图表 | `DayTrendChart` | 日趋势 | Analytics 等 |
| 域面板 | `BrainPipelinePanel` 等 | Moe 专属 | 3–5 |

### 1.2 重复严重（V3 要收拢）

| 问题 | 表现 | 目标 |
|------|------|------|
| **页面头** | 每页手写 `page-head-row` + `h2` + `p` | 统一 `PageHead` |
| **列表页** | 20+ 页复制 load/error/search/pagination/table | 统一 `ListPage` 模板 + `AdminTable` |
| **双 Tag** | `AdminTag` + `StatusTag` 两套 API，共用 `.tag` | 合并为 `AdminTag` + preset |
| **双 Hero** | `platform-hero`（废弃） vs `page-head-row` | 只保留 `PageHead` |
| **CSS 三套 token** | theme.css / index.css(遗留) / deploy-ops.html 内联 | 单一 `tokens/colors.css` |
| **Deploy 静态页** | deploy-ops、devtools、rpc-monitor 各自 `:root` | 引用同一份 token 文件 |

### 1.3 不引入第二套 UI 库

当前 **无** Ant Design / MUI / shadcn。V3 继续：

- **骨架**：轻量 React 组合组件（`src/ui/`）
- **皮肤**：CSS Token + 拆分后的 global modules
- **不**为改版单独加重量级组件库（避免 bundle 与风格分裂）

---

## 2. 三层架构（唯一 SSOT）

```
┌─────────────────────────────────────────────────────────┐
│ L0  Token   styles/tokens/*.css                          │
│             色 / 字 / 间距 / 动效 — 全站 + 静态页共用     │
├─────────────────────────────────────────────────────────┤
│ L1  UI 骨架  src/ui/*          ← 布局与交互模式，无业务 API │
│             PageHead / AdminTable / ListPage …           │
├─────────────────────────────────────────────────────────┤
│ L2  业务组件  src/components/*  ← 带领域语义，可复用       │
│             UserCell / BrainPipelinePanel …            │
├─────────────────────────────────────────────────────────┤
│ L3  页面      src/pages/*       ← 只拼 L1+L2 + 调 API    │
└─────────────────────────────────────────────────────────┘
```

**禁止**：
- 页面内联大段 layout JSX 模板
- 页面内新建 `.panel` 变体 class
- 在 `deploy-ops.html` 再写一套 `--accent`

---

## 3. L1 骨架组件规划（新建 `src/ui/`）

### 3.1 目录

```
moe-admin/src/ui/
├── AdminPage.tsx       # 根容器 .admin-page
├── PageHead.tsx        # 标题 + 描述 + actions 槽
├── AdminToolbar.tsx    # 搜索框 + 主/次按钮行
├── AdminPanel.tsx      # panel + panel-head + panel-body 槽
├── AdminTable.tsx      # 表格 + loading/empty + 可选分页
├── AdminPagination.tsx
├── AdminMessage.tsx    # 统一 error/success（包装 PageMessage）
├── ListPageLayout.tsx  # 列表页标准组合（见下）
└── index.ts            # barrel export
```

### 3.2 `ListPageLayout` — 80% 页面的唯一模板

列表 CRUD 页（Users、Gifts、Posts、Comments…）统一结构：

```tsx
<ListPageLayout
  title="App 用户"
  description="管理 App 注册用户…"
  envNote="用户数据来自当前所选业务 API"
  metrics={[{ label: '匹配用户', value: total }]}
  toolbar={
    <AdminToolbar
      search={{ value, onChange, onSubmit, placeholder: '…' }}
      actions={<button className="btn btn-primary">新建</button>}
    />
  }
  error={error}
  pagination={{ page, totalPages, onPageChange }}
>
  <AdminTable columns={…} rows={…} loading={loading} />
</ListPageLayout>
```

**等价于今天每页重复的**：

```
page-head-row → DataEnvBar → PageInsightStrip → panel → inline-form → table-wrap → 分页
```

### 3.3 四种页面原型（全站只认这四种）

| 原型 | 组件组合 | 代表页 |
|------|----------|--------|
| **A. ListCrud** | `ListPageLayout` + `AdminFormDrawer` | Users, Gifts, Posts, VIP… |
| **B. TabbedWorkbench** | `AdminPage` + `PageHead` + `PageTabs` + slot | Platform, MoeTools |
| **C. Monitor** | `AdminPage` + `PageHead` + charts/logs 域组件 | Analytics, Rpc |
| **D. Ops** | `AdminPage` + _deploy 子页现有结构_ | Build, Docker, Release |

新页面 **必须先选 A/B/C/D**，不允许第五种壳。

### 3.4 Tag 合并

```tsx
// 删除 StatusTag，统一 AdminTag
<AdminTag spec={jobStatusSpec(status)} />   // deploy 任务
<AdminTag spec={vipTag(row)} />             // 业务
```

`adminLabels.ts` 已有 `TagSpec`，扩展 job/deploy preset 即可。

---

## 4. L0 Token 跨项目复用

### 4.1 单一 token 文件

```
moe-admin/src/styles/tokens/colors.css   ← SSOT
```

### 4.2 静态 HTML 工具（deploy-agent 托管）

| 文件 | 现状 | V3 |
|------|------|-----|
| `docs/dev/tools/deploy-ops.html` | 内联 `:root` 深色 | `<link>` 或构建时注入同 token |
| `docs/dev/devtools.html` | 独立样式 | 同上 |
| `docs/dev/tools/rpc-monitor.html` | 独立样式 | 同上 |

**策略（二选一，P2 定）**：

1. **软共享**：token 文件复制脚本 `scripts/sync-ops-tokens.sh`（简单）
2. **硬共享**：deploy-agent 静态服务 `GET /ops-assets/tokens.css` 指向 moe-admin 构建产物

**不追求**与 Flutter `lib/` 共用 CSS（平台不同），只对齐 **品牌色数值**（DESIGN.md 色板 → 产品文档一行表）。

---

## 5. CSS 与组件的对应关系

| CSS 模块 | 服务哪些 L1 组件 |
|----------|------------------|
| `layout/sidebar.css` | AppShell |
| `layout/topbar.css` | AppShell |
| `components/buttons.css` | AdminToolbar, drawers |
| `components/panels.css` | AdminPanel, ListPageLayout |
| `components/tables.css` | AdminTable |
| `components/metrics.css` | PageInsightStrip |
| `components/tabs.css` | PageTabs |
| `components/drawers.css` | AdminFormDrawer |

**规则**：L1 组件 **只使用** 上表中的 class 名；新 class 必须先加到 components/ 再在 ui/ 引用。

---

## 6. 迁移顺序（组件 + CSS 联动）

| 步 | 动作 | 验收 |
|----|------|------|
| 1 | 冻结 monolith；启用 `tokens/colors.css` | build 通过 |
| 2 | 实现 `PageHead` + `AdminPage` | 改 1 页目视 |
| 3 | 实现 `ListPageLayout` + `AdminTable` | **UsersPage** 样板 |
| 4 | 批量改 ListCrud 页（按域分批） | 每批 5 页 build |
| 5 | 合并 `StatusTag` → `AdminTag` | Deploy 子页 |
| 6 | Tabbed / Monitor 原型收拢 | Platform, Analytics |
| 7 | sync deploy HTML tokens | deploy-ops 色一致 |

---

## 7. 页面改造优先级

**第一批（验证 ListCrud 骨架）**  
UsersPage → GiftsPage → PostsPage → AuditLogsPage → AnnouncementsPage

**第二批（Tabbed + Monitor）**  
PlatformPage → AnalyticsPage → RpcPage

**第三批（其余 ListCrud）**  
Comments, VIP, Wallet, Reports, …

**第四批（Ops + 特殊域）**  
Build/Docker/Release；Brain/Tools 域面板保持 L2 不动

---

## 8. 给 Agent 的硬性规则

1. 新列表页 **必须** 用 `ListPageLayout`，禁止复制 UsersPage 整段 JSX。
2. 新样式写 `styles/components/` 或 `styles/layout/`，**禁止** 写进 `moe-admin-theme.css`。
3. 颜色 **只** 用 `tokens/colors.css` 变量名。
4. 标签 **只** 用 `AdminTag` + `adminLabels` preset。
5. 静态运维 HTML **禁止** 新增内联 `:root` 色值。

---

## 9. 与 Flutter 的边界

| 项目 | 共用 | 不共用 |
|------|------|--------|
| moe-admin | L0 token 数值、品牌名 | CSS / React 组件 |
| Flutter App | 品牌色、产品术语 | Widget 实现 |
| deploy HTML | L0 token（复制或 link） | 页面结构 |

避免「Flutter 管理页」与 `moe-admin` 并行开发同一功能——管理台 **只有** `moe-admin` 一套。
