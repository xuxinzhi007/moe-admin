# Moe Admin — DESIGN.md (V3)

> **SSOT**：管理台视觉与 CSS 架构以本文件为准。  
> **参考**：[VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md)（Sentry 紫系运维台 + Supabase 控制台密度 + PostHog 分析页布局）  
> **CSS 拆分**：[docs/css-architecture-v3.md](./docs/css-architecture-v3.md)  
> **组件骨架（一套复用）**：[docs/ui-skeleton-v3.md](./docs/ui-skeleton-v3.md)

---

## 1. Visual Theme & Atmosphere

**名称**：Moe Ops Console V3 — *Soft Violet Console*

**关键词**：运维控制台、开发者友好、信息密度高、品牌可识别、克制动效

**气质**：
- **浅色 Chrome**（侧栏 + 顶栏）与 **Workbench** 同系，避免深色侧栏与浅内容区割裂
- 品牌信号：紫罗兰强调 + 薄荷在线态；侧栏滚动条细轨、低对比
- 不做大面积 marketing hero

**禁止**：
- 系统级图标使用 emoji（用 `AdminIcon`）
- 新页面引入 `platform-hero` / `content-hero` 大块渐变横幅
- 单页临时发明独立色系或按钮风格
- 在页面 TSX 内联大段样式
- 侧栏使用系统默认粗滚动条（必须走 `chrome-v3.css` 定制）

---

## 2. Color Palette & Roles

| Token | Hex | 角色 |
|-------|-----|------|
| `--brand-violet` | `#6b5fc1` | 主强调、激活导航、主按钮渐变起点 |
| `--brand-violet-deep` | `#5548a8` | 按下态、深色 hover |
| `--brand-cyan` | `#34d3c8` | 次强调、在线/成功信号、图表系列 |
| `--brand-gold` | `#f3b74f` | VIP、警告点缀、特殊指标 |
| `--chrome-bg` | `#eef1f8` | 侧栏背景（浅，与 canvas 同系） |
| `--chrome-surface` | `#ffffff` | 侧栏底 / 顶栏 |
| `--chrome-border` | `#e2e6f0` | Chrome 分隔线 |
| `--chrome-text` | `#1a1d26` | 侧栏主文字 |
| `--chrome-muted` | `#6b7280` | 侧栏次要文字 |
| `--canvas` | `#f4f6fb` | 内容区背景 |
| `--surface` | `#ffffff` | 卡片、面板 |
| `--surface-soft` | `#f8f9fc` | 表格斑马纹、输入背景 |
| `--ink` | `#1a1d26` | 正文标题 |
| `--ink-muted` | `#6b7280` | 辅助说明 |
| `--hairline` | `#e5e7ef` | 卡片边框、表格线 |
| `--ok` | `#34c38f` | 成功、可达 |
| `--warn` | `#ffb648` | 警告 |
| `--danger` | `#ff6b6b` | 错误、危险操作 |
| `--info` | `#3d8bfd` | 信息、链接 |

**图表序列**（Recharts 等）：  
`#6b5fc1` → `#34d3c8` → `#86a8e7` → `#f3b74f` → `#c9b6ff` → `#a8d8ea`

---

## 3. Typography

| 层级 | 字号 | 字重 | 用途 |
|------|------|------|------|
| Page title | 22px | 600 | `page-head h2` |
| Section title | 16px | 600 | `panel-head h3` |
| Body | 14px | 400 | 表格、表单、正文 |
| Caption | 12px | 400 | 辅助、时间戳 |
| Micro | 11px | 500 | Badge、标签 |
| Mono | 12–13px | 400 | ID、URL、日志（`ui-monospace`） |

**字体栈**：
```css
--font-ui: "Inter", "PingFang SC", "Helvetica Neue", system-ui, sans-serif;
--font-mono: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;
```

---

## 4. Spacing & Radius

**间距尺度**：4 · 8 · 12 · 16 · 24 · 32 · 48（px）

| Token | 值 | 用途 |
|-------|-----|------|
| `--radius-sm` | 8px | 按钮、输入、tag |
| `--radius-md` | 12px | 卡片、面板 |
| `--radius-lg` | 16px | 大面板、指标卡 |
| `--radius-xl` | 20px | 抽屉、模态 |

**阴影**：
```css
--shadow-card: 0 1px 3px rgba(15,23,42,.06), 0 8px 24px rgba(15,23,42,.04);
--shadow-lift: 0 4px 16px rgba(107,95,193,.12);
```

---

## 5. Layout Principles

### 5.1 AppShell

```
┌──────────┬────────────────────────────────────┐
│ Sidebar  │ Topbar（Agent · 环境 · 用户）        │
│ 260px    ├────────────────────────────────────┤
│ 浅色     │ .content > .admin-page              │
│ Chrome   │   PageHead → InsightStrip → Body    │
└──────────┴────────────────────────────────────┘
```

- 侧栏固定 260px，内容区 `flex:1; overflow:auto`
- 所有业务页根节点使用 `.admin-page`
- 标题行使用 `.page-head-row`（左标题 + 右操作）

### 5.2 页面模板

1. **PageHead** — 标题、描述、环境 code、主操作
2. **InsightStrip** — 3–4 个指标卡（`PageInsightStrip` / `.page-insight-strip`）
3. **Workbench** — 表格、Tab 工作台、图表
4. **Secondary** — 快捷入口、时间线（可选）

### 5.3 密度

- 表格行高：44–48px
- 面板内边距：14–16px
- 列表页全宽，避免内容簇在左侧

---

## 6. Component Stylings

### 6.1 导航（Sidebar）

- 背景 `--chrome-bg` → `--chrome-surface` 浅渐变，与 `--canvas` 协调
- 激活项：左侧 3px `--brand-violet` 条 + 浅紫底 `rgba(107,95,193,.12)`
- 滚动条：宽 5px、thumb `rgba(107,95,193,.22)`、track 透明（见 `layout/chrome-v3.css`）

### 6.2 按钮（`.btn` 系列）

| 类 | 样式 |
|----|------|
| `.btn` | 描边 + `--surface-soft` 底 |
| `.btn-primary` | 渐变 `brand-violet → brand-cyan`，白字 |
| `.btn-ghost` | 透明底 |
| `.btn-danger` / `.btn-warn` | 语义色描边 |

### 6.3 面板（`.panel`）

- 白底 + `--hairline` 边框 + `--radius-md`
- `.panel-head` 下分隔线，标题 16px/600

### 6.4 表格（`.table-wrap`）

- 表头 `--surface-soft`，字号 12px uppercase optional
- 行 hover：`--surface-soft`
- ID/时间列用 `.cell-mono`

### 6.5 标签（`.tag` / `AdminTag`）

- 成功/失败/警告/中性 四态，浅底 + 语义色字
- 圆角 `--radius-sm`，padding 2–8px

### 6.6 抽屉

- 宽 480px（表单）/ 560px（详情）
- 右侧滑入，蒙层 `rgba(15,18,31,.45)`

---

## 7. Motion

- 页面进入：`fade + translateY(8px)`，300ms
- 指标卡：stagger 50ms
- 导航 hover：150ms background
- 必须支持 `prefers-reduced-motion: reduce` → 动画归零

---

## 8. Do's and Don'ts

**Do**
- 新样式写入 `src/styles/` 对应模块文件
- 改 token 优先于改组件 class
- 复用 `PageTabs`、`DataEnvBar`、`AdminFormDrawer`

**Don't**
- 不要继续往 `styles/legacy/moe-admin-theme.css` 追加
- 不要引入第二套 `:root` 变量（`src/index.css` 为 Vite 遗留，待删）
- 不要全页深色（仅 Chrome 深色，Workbench 保持浅底）

---

## 9. Responsive

| 断点 | 行为 |
|------|------|
| `<960px` | 双栏 grid 改单栏 |
| `<768px` | 侧栏可折叠（Phase 2） |

---

## 10. Agent Prompt Guide

**改页面时**：
> 阅读 `moe-admin/DESIGN.md` 与 `docs/css-architecture-v3.md`。使用 `.admin-page` + `.page-head-row` 模板，颜色只用 DESIGN token，样式写入对应 CSS 模块，禁止 inline style 和大段新 class。

**改壳层时**：
> 只改 `layout/app-shell.css`、`layout/sidebar.css`、`layout/topbar.css` 与 `tokens/*.css`。

**快速色参考**：Chrome `#15121f` · Canvas `#f4f6fb` · Violet `#6b5fc1` · Cyan `#34d3c8`

---

## 11. Migration Phases

| 阶段 | 目标 | 产出 |
|------|------|------|
| **P0 设计** | 方案冻结 | 本文件 + css-architecture-v3.md |
| **P1 基础** | Token + 入口 + 壳层 | `styles/index.css` + tokens + layout |
| **P2 组件** | 按钮/面板/表格/标签 | `components/*.css` |
| **P3 样板页** | Dashboard / Platform / Analytics | 视觉验收 |
| **P4 扫尾** | 其余页面 + 删 monolith | `legacy/moe-admin-theme.css` 清空删除 |
| **Sprint A（2026-08）** | 像控制台 | 单体迁 `styles/legacy/`；侧栏 `AdminIcon`；运维 4 页 `MonitorPageLayout` |
| **Sprint D（2026-08）** | CSS 模块化 | 抽出 `reset/buttons/panels/tags/drawers`；legacy ≈4666→4171 行 |
| **Sprint E（2026-08）** | CSS 域拆分 | brain / data-map / login / landing / analytics；legacy →≈3032 行 |
