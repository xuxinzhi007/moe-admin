# Moe Admin（React 管理后台）

Moe Social 专属管理台：浅色 Element 风格布局 + 现有 go-zero Admin API / Deploy Agent。

## 开发启动

| 终端 | 命令 |
|------|------|
| backend | `make moe-social` 或 `make dev`（**默认含** deploy-agent `:19010`） |
| **本目录** | `npm install` → **`npm run dev`** |

`make moe-social` / `make dev` 会顺带拉起 deploy-agent（首次运行会从 `deploy/config.example.yaml` 生成 `deploy/config.yaml`）。  
仅需 API 时不要 Agent：`go run ./cmd/moe-social-stack -agent=false` 或 `go run ./cmd/dev -agent=false`。  
单独补 Agent：`make deploy-agent`。

浏览器：**http://127.0.0.1:5173/ops/**（登录 `/ops/login`）

生产构建（按需）：`npm run build` → `dist/`，由 CI 或静态服务器发布（Agent 不再托管 `/ops/`）

## 目录说明

由原 `ops-console/` 演进并重命名。若仓库中仍存在 `ops-console/`，可停掉占用进程后删除，统一使用本目录。

## 功能模块（工作区）

顶栏切换 **运营 | AI | 运维**（默认运营）：

| 工作区 | URL 前缀 | 内容 |
|--------|----------|------|
| 运营 | `/ops/biz/...` | 用户、内容、公告、分析、云图库… |
| AI | `/ops/ai/...` | 酒馆、Bot、大脑、编排、工具… |
| 运维 | `/ops/infra/...` | 平台治理、发布、Docker、审计… |

菜单 SSOT：`src/config/workspaceNav.ts` · 方案：`docs/dev/moe-admin-workspaces.md`

文档：

- [docs/dev/moe-admin.md](../docs/dev/moe-admin.md) — 选型与分工  
- [docs/dev/admin-rpc-runtime-guide.md](../docs/dev/admin-rpc-runtime-guide.md) — **启动、RPC 监控、进程内存（标注 SSOT）**
