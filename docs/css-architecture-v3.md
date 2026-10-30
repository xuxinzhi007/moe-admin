# Moe Admin CSS 架构 V3（拆分方案）

> 配套 [DESIGN.md](../DESIGN.md)。  
> 迁移期 monolith：`src/styles/legacy/moe-admin-theme.css`（Sprint D/E 已抽出组件 + brain/login/landing/analytics/data-map；约 **3032** 行剩余；**禁止再往该文件追加**）。

---

## 1. 为什么要拆

| 问题 | 现状 | 目标 |
|------|------|------|
| 单文件过大 | 4000 行，12+ 功能域混在一起 | 每文件 ≤300 行，按职责分 |
| 变量双源 | `:root` 在 theme.css；`src/index.css` 有 Vite 遗留变量（**未引用**） | 唯一 token 源 `tokens/` |
| 文档与实现脱节 | `admin-design-system.md` 写 24px 圆角；CSS 用 8px | token 驱动，DESIGN.md 为 SSOT |
| 页面域 CSS 污染全局 | platform / brain / rpc 样式在同一文件 | 页面样式进 `pages/` |
| AI 改样式难定位 | 无文件边界 | 路径即语义 |

---

## 2. 目标目录

```
moe-admin/src/styles/
├── index.css                 # 唯一入口（main.tsx 只 import 此文件）
├── tokens/
│   ├── colors.css            # 色板 + 语义色
│   ├── typography.css        # 字体、字号阶梯
│   ├── spacing.css           # 间距、圆角
│   └── motion.css            # 过渡、keyframes、reduced-motion
├── base/
│   ├── reset.css             # box-sizing、body、链接
│   └── utilities.css         # .cell-mono、.loading-hint 等通用工具
├── layout/
│   ├── app-shell.css         # .app-shell、.main、.content
│   ├── sidebar.css           # .sidebar、.nav-*、.brand
│   └── topbar.css            # .topbar、.conn-pill、.env-switch
├── components/
│   ├── buttons.css           # .btn*
│   ├── panels.css            # .panel*、.env-card*
│   ├── tables.css            # .table-wrap、table 样式
│   ├── forms.css             # .inline-form、input、select
│   ├── tags.css              # .tag*、.pill*
│   ├── tabs.css              # .page-tabs、.platform-tab-rail
│   ├── drawers.css           # settings drawer、form drawer
│   ├── metrics.css           # .page-insight-strip、指标卡
│   └── charts.css            # recharts 容器、图例
├── feature/                  # 跨页业务组件（非单页；勿用 domains/，Vite Windows ENOENT）
│   ├── brain.css             # brain-pipeline、memory-influence、inference
│   └── data-domain-map.css   # 数据星系地图
├── pages/                    # 仅该页使用的样式（可选 co-locate）
│   ├── platform.css
│   ├── data-catalog.css
│   ├── rpc.css
│   ├── analytics.css
│   ├── login.css
│   └── landing-feedback.css
└── legacy/
    └── moe-admin-theme.css   # 迁移期保留，逐段搬空后删除
```

---

## 3. 入口文件（index.css）

```css
/* Moe Admin styles — import order matters */
@import './tokens/colors.css';
@import './tokens/typography.css';
@import './tokens/spacing.css';
@import './tokens/motion.css';

@import './base/reset.css';
@import './base/utilities.css';

@import './layout/app-shell.css';
@import './layout/sidebar.css';
@import './layout/topbar.css';

@import './components/buttons.css';
@import './components/panels.css';
@import './components/tables.css';
@import './components/forms.css';
@import './components/tags.css';
@import './components/tabs.css';
@import './components/drawers.css';
@import './components/metrics.css';
@import './components/charts.css';

@import './feature/brain.css';
@import './feature/data-domain-map.css';

@import './pages/platform.css';
@import './pages/data-catalog.css';
@import './pages/rpc.css';
@import './pages/analytics.css';
@import './pages/login.css';
@import './pages/landing-feedback.css';

/* 迁移完成前：兜底未搬样式 */
@import './legacy/moe-admin-theme.css';
```

**main.tsx 改动**（P1 实施时）：
```ts
import './styles/index.css'   // 替换 moe-admin-theme.css
```

---

## 4. Monolith 切分映射

基于 `moe-admin-theme.css` 行号与注释块：

| 原文件区间（约） | 目标文件 | 内容 |
|-----------------|----------|------|
| 1–52 | `tokens/*.css` + `base/reset.css` | `:root`、body、a |
| 53–462 | `layout/*` | app-shell、sidebar、nav、topbar、content |
| 463–791 | `layout/app-shell.css` + `pages/rpc.css` | admin-page、content-rpc |
| 792–900 | `components/buttons.css` | .btn* |
| 843–1100 | `components/panels.css` | .panel、.env-card |
| 1100–1800 | `components/tables.css` + `components/forms.css` | 表格、表单、filter |
| 487–740 | `feature/brain.css` | brain、memory、inference |
| 1800–1963 | `pages/rpc.css` | rpc-log-* |
| 1964–2015 | `pages/landing-feedback.css` | Landing feedback |
| 2016–2336 | `pages/platform.css` | platform-*、tab-rail |
| 2337–3222 | `feature/data-domain-map.css` | 数据星系 |
| 3223–3399 | `pages/data-catalog.css` | 数据目录树 |
| 3400–3636 | `pages/` 或 `components/forms.css` | 应用配置 |
| 3637–3898 | `feature/` 或 `pages/` | Moe 工具调用 |
| 3899–4000 | `pages/analytics.css` | 分析、对话日志、标签 |

---

## 5. Token 迁移对照（V2 → V3）

| 旧变量 (theme.css) | 新变量 (V3) | 说明 |
|--------------------|-------------|------|
| `--bg` | `--canvas` | 内容区背景 |
| `--panel` | `--surface` | 卡片白底 |
| `--panel2` | `--surface-soft` | 次级面 |
| `--border` | `--hairline` | 边框 |
| `--accent` | `--brand-violet` | 主色微调 |
| `--accent2` | `--brand-violet-deep` | 渐变终点 |
| `--mint` | `--brand-cyan` | 对齐 DESIGN |
| `--text` | `--ink` | 正文 |
| `--muted` | `--ink-muted` | 辅助 |
| `--radius` | `--radius-sm` | 8px 保留，大面板用 md/lg |

**兼容层**（P1 可选，减少 TSX 改动）：
```css
/* tokens/colors.css 底部，迁移期 alias */
:root {
  --bg: var(--canvas);
  --panel: var(--surface);
  --accent: var(--brand-violet);
  /* ... */
}
```

---

## 6. 迁移策略（Strangler Fig）

不一次性重写 4000 行，按以下顺序：

### Step 1 — 冻结 monolith
- 禁止向 `moe-admin-theme.css` **新增**样式
- 新样式只写新文件，并在 `index.css` import

### Step 2 — 建立 token 层
- 创建 `tokens/colors.css`（含 V3 色 + 旧名 alias）
- `main.tsx` 改 import `index.css`
- `index.css` 先只 import tokens + legacy monolith

### Step 3 — 搬 layout（视觉变化最大）
- 侧栏/顶栏进 `layout/`，应用 V3 深色 Chrome
- 从 monolith **删除**已搬行，跑 `npm run build` 目视验收

### Step 4 — 搬 components
- buttons → panels → tables → forms → tags（用面最广）

### Step 5 — 搬 domains + pages
- 按上表映射逐块剪切

### Step 6 — 清理
- 删除 `legacy/moe-admin-theme.css`
- 删除未使用的 `src/index.css`、`src/App.css`
- 更新 `.cursor/rules/moe-admin-ai-spec.mdc` 指向 `styles/index.css`

---

## 7. 验收清单

每搬完一个模块：

```bash
cd moe-admin && npm run build
```

人工检查：
- [ ] AppShell 侧栏/顶栏正常
- [ ] Dashboard、Platform、Users 列表页
- [ ] Analytics 图表区
- [ ] Rpc 监控页
- [ ] Login、Settings drawer
- [ ] 无 CSS 变量 `undefined` 导致的透明/黑块

---

## 8. 与组件代码的关系（未来可选）

当前：**全局 CSS class**（零运行时成本，与现有 95 个 TSX 文件兼容）

Phase 3+ 可选：
- 高频组件（`AdminTag`、`PageTabs`）加 CSS Modules 或 co-located `.module.css`
- **不强制** CSS-in-JS，避免与 Flutter 管理台规范冲突

---

## 9. 样板页优先级（P3 视觉验收）

1. `DashboardPage` — 入口印象
2. `PlatformPage` — Tab + 多 panel
3. `UsersPage` — 标准 CRUD 表格
4. `AnalyticsPage` — 图表 + 指标
5. `RpcPage` — 高密度日志

---

## 10. 待删遗留

| 文件 | 原因 |
|------|------|
| `src/index.css` | Vite 模板，未被 import |
| `src/App.css` | 未被 import |
| `moe-admin-theme.css`（最终） | 迁移完成后整文件删除 |
| `.platform-hero` 等 class | DESIGN 已废弃，搬 pages 时不带走 |
