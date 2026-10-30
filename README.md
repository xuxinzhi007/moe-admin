# Moe Admin（React 管理后台）

Moe Social 专属管理台：浅色 Element 风格布局 + 现有 Admin API / Deploy Agent。

独立仓库，暂时放在 `moe_social/moe-admin/` 里方便和后端一起联调。提交走本目录自己的 git，不要提交进外层 `moe_social`。

## 开发启动

| 终端 | 命令 |
|------|------|
| backend | `make moe-social`（`:8888`）；需要运维页再另开 `make deploy-agent`（`:19010`） |
| **本目录** | `npm install` → **`npm run dev`** |

`make moe-social` = `go run ./cmd/moe-social`，**不带** deploy-agent。`make moe-social-dev` 也一样（它跑的是 `cmd/moe-social-stack -agent=false`）。  
要 Agent：`make deploy-agent`（首次运行会从 `deploy/config.example.yaml` 生成 `deploy/config.yaml`）。  
要 API + Agent 一起：`go run ./cmd/moe-social-stack -agent=true`。

浏览器：**http://127.0.0.1:5173/ops/**（登录 `/ops/login`）

生产构建（按需）：`npm run build` → `dist/`，由 CI 或静态服务器发布（Agent 不再托管 `/ops/`）

## 联调（本机）

后端先改契约，管理台再跟：

1. `backend/api/**` proto → `cd backend && make gen`
2. `cd backend && make moe-social`（`:8888`，需要运维页再带 Agent `:19010`）
3. `cd moe-admin && npm run dev` → http://127.0.0.1:5173/ops/
4. Vite 已把 `/api/admin` 代理到本机 `:8888`

小主机上的页面不会热更新，联调不要对着局域网包改。

## 局域网发布（小主机）

地址：http://192.168.124.77/ops/
静态文件：`/var/www/html/ops` · nginx：`/etc/nginx/sites-available/moe-admin`

本机开发完成后再同步，不会自动更新：

```powershell
cd moe-admin
npm run deploy:lan
```

或手动：`npm run build`，把 `dist/` 覆盖到小主机 `/var/www/html/ops`。配置见 `deploy/nginx-lan.conf`。

## 目录说明

由原 `ops-console/` 演进并重命名。若仓库中仍存在 `ops-console/`，可停掉占用进程后删除，统一使用本目录。

## 功能模块（工作区）

顶栏切换 **运营 | AI | 运维**（默认运营）：

| 工作区 | URL 前缀 | 内容 |
|--------|----------|------|
| 运营 | `/ops/biz/...` | 用户、内容、公告、分析、云图库… |
| AI | `/ops/ai/...` | 酒馆、模型与试聊、Bot、大脑、编排、工具… |
| 运维 | `/ops/infra/...` | 平台治理、发布、Docker、审计… |

菜单 SSOT：`src/config/workspaceNav.ts` · 结构说明：`docs/dev/moe-admin.md`（工作区与导航 / 模块索引）

文档：

- [docs/dev/moe-admin.md](../docs/dev/moe-admin.md) — 选型与分工  
- [docs/dev/admin-rpc-runtime-guide.md](../docs/dev/admin-rpc-runtime-guide.md) — **启动、RPC 监控、进程内存（标注 SSOT）**
