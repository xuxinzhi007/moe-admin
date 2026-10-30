import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { RequireAdmin } from './components/RequireAdmin'
import { RequireWorkspace } from './components/RequireWorkspace'
import { AdminAuthProvider } from './context/AdminAuthContext'
import { DeployProvider } from './context/DeployContext'
import { PlatformProvider } from './context/PlatformContext'
import { LEGACY_REDIRECTS } from './config/workspaceNav'
import { AppShell } from './layout/AppShell'
import { BuildPage } from './pages/BuildPage'
import { DashboardPage } from './pages/DashboardPage'
import { DockerPage } from './pages/DockerPage'
import { JobsPage } from './pages/JobsPage'
import { LoginPage } from './pages/LoginPage'
import { OverviewPage } from './pages/OverviewPage'
import { ReleasePage } from './pages/ReleasePage'
import { UsersPage } from './pages/UsersPage'
import { VipPlansPage } from './pages/VipPlansPage'
import { GiftsPage } from './pages/GiftsPage'
import { WalletOrdersPage } from './pages/WalletOrdersPage'
import { PostsPage } from './pages/PostsPage'
import { CommentsPage } from './pages/CommentsPage'
import { CommunityGroupsPage } from './pages/CommunityGroupsPage'
import { ReportsPage } from './pages/ReportsPage'
import { GrowthPage } from './pages/GrowthPage'
import { AnnouncementsPage } from './pages/AnnouncementsPage'
import { AppReleasePage } from './pages/AppReleasePage'
import { NotifyPage } from './pages/NotifyPage'
import { AiAgentsPage } from './pages/AiAgentsPage'
import { AiModelsPage } from './pages/AiModelsPage'
import { AiPlaygroundPage } from './pages/AiPlaygroundPage'
import { MoeBotsPage } from './pages/MoeBotsPage'
import { MoeBrainPage } from './pages/MoeBrainPage'
import { MoeBotFlowPage } from './pages/MoeBotFlowPage'
import { MoeToolsPage } from './pages/MoeToolsPage'
import { AiChatLogsPage } from './pages/AiChatLogsPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { TagsCenterPage } from './pages/TagsCenterPage'
import { SocialPage } from './pages/SocialPage'
import { AdminAccountsPage } from './pages/AdminAccountsPage'
import { AuditLogsPage } from './pages/AuditLogsPage'
import { MediaGalleryPage } from './pages/MediaGalleryPage'
import { PlatformPage } from './pages/PlatformPage'
import { PetContentHubPage, PetDecorEditorPage } from './pages/PetContentHubPage'
import { PetFurnitureEditorPage } from './pages/PetFurnitureEditorPage'
import { CodeGraphPage } from './pages/CodeGraphPage'
import { SpriteStudioPage } from './features/sprite-studio/SpriteStudioPage'

function PlatformTabRedirect({ tab }: { tab: string }) {
  return <Navigate to={`/infra/platform?tab=${tab}`} replace />
}

/** Legacy: /app/moe-bots/:agentKey/brain → /ai/moe-bots/:agentKey/brain — remove after 2026-12 */
function LegacyMoeBotBrainRedirect() {
  const { agentKey } = useParams<{ agentKey: string }>()
  return <Navigate to={`/ai/moe-bots/${encodeURIComponent(agentKey || '')}/brain`} replace />
}

/** Legacy: /users/:id → /biz/users — remove after 2026-12 */
function LegacyUserDetailRedirect() {
  return <Navigate to="/biz/users" replace />
}

export default function App() {
  return (
    <ErrorBoundary>
      <AdminAuthProvider>
        <BrowserRouter basename="/ops">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireAdmin />}>
              <Route
                element={
                  <DeployProvider>
                    <PlatformProvider>
                      <RequireWorkspace>
                        <AppShell />
                      </RequireWorkspace>
                    </PlatformProvider>
                  </DeployProvider>
                }
              >
                <Route index element={<Navigate to="/biz" replace />} />

                {/* 运营 /biz */}
                <Route path="biz" element={<DashboardPage />} />
                <Route path="biz/users" element={<UsersPage />} />
                <Route path="biz/vip/plans" element={<VipPlansPage />} />
                <Route path="biz/wallet/orders" element={<WalletOrdersPage />} />
                <Route path="biz/gifts/catalog" element={<GiftsPage />} />
                <Route path="biz/content/posts" element={<PostsPage />} />
                <Route path="biz/content/comments" element={<CommentsPage />} />
                <Route path="biz/content/community" element={<CommunityGroupsPage />} />
                <Route path="biz/content/reports" element={<ReportsPage />} />
                <Route path="biz/growth" element={<GrowthPage />} />
                <Route path="biz/pet/content" element={<PetContentHubPage />} />
                <Route path="biz/pet/avatar" element={<SpriteStudioPage />} />
                <Route path="biz/pet/sprites" element={<Navigate to="/biz/pet/avatar" replace />} />
                <Route path="biz/pet/furniture" element={<PetFurnitureEditorPage />} />
                <Route path="biz/pet/decor" element={<PetDecorEditorPage />} />
                <Route path="biz/pet/lpc" element={<Navigate to="/biz/pet/avatar" replace />} />
                <Route path="biz/announcements" element={<AnnouncementsPage />} />
                <Route path="biz/update" element={<AppReleasePage />} />
                <Route path="biz/notify" element={<NotifyPage />} />
                <Route path="biz/analytics" element={<AnalyticsPage />} />
                <Route path="biz/tags" element={<TagsCenterPage />} />
                <Route path="biz/social" element={<SocialPage />} />
                <Route path="biz/media-gallery" element={<MediaGalleryPage />} />

                {/* AI /ai */}
                <Route path="ai/models" element={<AiModelsPage />} />
                <Route path="ai/playground" element={<AiPlaygroundPage />} />
                <Route path="ai/agents" element={<AiAgentsPage />} />
                <Route path="ai/moe-bots" element={<MoeBotsPage />} />
                <Route path="ai/moe-bots/:agentKey/brain" element={<MoeBrainPage />} />
                <Route path="ai/moe-brain" element={<MoeBrainPage />} />
                <Route path="ai/moe-flow" element={<MoeBotFlowPage />} />
                <Route path="ai/moe-tools" element={<MoeToolsPage />} />
                <Route path="ai/chat-logs" element={<AiChatLogsPage />} />

                {/* 运维 /infra */}
                <Route path="infra/platform" element={<PlatformPage />} />
                <Route path="infra/admins" element={<AdminAccountsPage />} />
                <Route path="infra/audit" element={<AuditLogsPage />} />
                <Route path="infra/deploy" element={<OverviewPage />} />
                <Route path="infra/docker" element={<DockerPage />} />
                <Route path="infra/build" element={<BuildPage />} />
                <Route path="infra/release" element={<ReleasePage />} />
                <Route path="infra/jobs" element={<JobsPage />} />
                <Route path="infra/dev/codegraph" element={<CodeGraphPage />} />
                <Route path="infra/data" element={<PlatformTabRedirect tab="data" />} />
                <Route path="infra/app-config" element={<PlatformTabRedirect tab="config" />} />

                {/* Legacy redirects — remove after 2026-12 */}
                {LEGACY_REDIRECTS.map(({ from, to }) => (
                  <Route
                    key={from}
                    path={from.replace(/^\//, '')}
                    element={<Navigate to={to} replace />}
                  />
                ))}
                <Route path="app/moe-bots/:agentKey/brain" element={<LegacyMoeBotBrainRedirect />} />
                <Route path="users/:userId" element={<LegacyUserDetailRedirect />} />

                <Route path="*" element={<Navigate to="/biz" replace />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AdminAuthProvider>
    </ErrorBoundary>
  )
}
