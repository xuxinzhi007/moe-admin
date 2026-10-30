import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminFormDrawer } from '../components/AdminFormDrawer'
import { AdminTag, TagRow } from '../components/AdminTag'
import { FormField } from '../components/FormField'
import { IdCell } from '../components/IdCell'
import { UserCell } from '../components/UserCell'
import { UserProfileCard, type UserProfile } from '../components/UserProfileCard'
import { resolveAdminPath } from '../config/workspaceNav'
import { useAdminAuth } from '../context/AdminAuthContext'
import { botTag, roleTag, vipTag } from '../lib/adminLabels'
import { formatDateTime } from '../lib/format'
import { DeployApiError } from '../api/deployClient'
import type { AdminUserBehaviorSummary } from '../api/adminClient'
import { AdminTable, ListPageLayout, AdminToolbar } from '../ui'

type UserRow = UserProfile

export function UsersPage() {
  const { client } = useAdminAuth()
  const [items, setItems] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<UserRow | null>(null)
  const [role, setRole] = useState('user')
  const [isVip, setIsVip] = useState(false)
  const [avatar, setAvatar] = useState('')
  const [signature, setSignature] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profile, setProfile] = useState<{
    counts: Record<string, number>
    level?: { level: number; experience: number; total_exp: number; level_title?: string }
    links: Array<{ label: string; admin_route: string; hint?: string }>
    behavior?: AdminUserBehaviorSummary
  } | null>(null)
  const pageSize = 20

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await client.listUsers({
        page,
        page_size: pageSize,
        keyword: search || undefined,
      })
      if (!res.success || !res.data) {
        setError(res.message || '加载失败')
        setItems([])
        setTotal(0)
        return
      }
      setItems((res.data.items || []) as UserRow[])
      setTotal(res.data.total || 0)
    } catch (e) {
      setError(e instanceof DeployApiError ? e.message : '加载失败')
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [client, page, search])

  useEffect(() => {
    void load()
  }, [load])

  function openUser(row: UserRow) {
    setSelected(row)
    setRole(row.role || 'user')
    setIsVip(row.is_vip)
    setAvatar(row.avatar || '')
    setSignature(row.signature || '')
    setFormError('')
    setProfile(null)
    void loadProfile(row.id)
  }

  async function loadProfile(userId: string) {
    setProfileLoading(true)
    try {
      const res = await client.getUserProfile(userId)
      if (res.success && res.data) {
        const raw = res.data as Partial<typeof res.data> & Record<string, unknown>
        setProfile({
          counts: (raw.counts && typeof raw.counts === 'object' ? raw.counts : {}) as Record<
            string,
            number
          >,
          level: raw.level,
          links: Array.isArray(raw.links) ? raw.links : [],
          behavior: raw.behavior
            ? {
                ...raw.behavior,
                tags: Array.isArray(raw.behavior.tags) ? raw.behavior.tags : [],
                top_screens: Array.isArray(raw.behavior.top_screens)
                  ? raw.behavior.top_screens
                  : [],
              }
            : undefined,
        })
      }
    } catch {
      setProfile(null)
    } finally {
      setProfileLoading(false)
    }
  }

  async function saveUser() {
    if (!selected) return
    setSaving(true)
    setFormError('')
    try {
      const res = await client.updateUser(selected.id, {
        role,
        is_vip: isVip,
        update_is_vip: true,
        avatar: avatar.trim(),
        update_avatar: true,
        signature: signature.trim(),
        update_signature: true,
      })
      if (!res.success) {
        setFormError(res.message || '保存失败')
        return
      }
      setSelected(null)
      await load()
    } catch (e) {
      setFormError(e instanceof DeployApiError ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const columns = useMemo(
    () => [
      {
        key: 'user',
        header: '用户',
        render: (row: UserRow) => (
          <UserCell
            name={row.username}
            avatar={row.avatar}
            sub={row.moe_no ? `Moe ${row.moe_no}` : undefined}
            meta={row.email}
          />
        ),
      },
      {
        key: 'id',
        header: 'ID',
        render: (row: UserRow) => <IdCell id={row.id} />,
      },
      {
        key: 'email',
        header: '邮箱',
        cellClassName: 'muted',
        render: (row: UserRow) => row.email || '—',
      },
      {
        key: 'role',
        header: '角色',
        render: (row: UserRow) => <AdminTag spec={roleTag(row.role)} />,
      },
      {
        key: 'bot',
        header: 'AI',
        render: (row: UserRow) => {
          const spec = botTag(row.is_bot ?? false, row.bot_agent_key)
          return spec ? <AdminTag spec={spec} /> : <span className="muted">—</span>
        },
      },
      {
        key: 'vip',
        header: '会员',
        render: (row: UserRow) => <AdminTag spec={vipTag(row.is_vip)} />,
      },
      {
        key: 'created',
        header: '注册时间',
        cellClassName: 'muted',
        render: (row: UserRow) => formatDateTime(row.created_at),
      },
      {
        key: 'actions',
        header: '',
        render: (row: UserRow) => (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => openUser(row)}>
            编辑
          </button>
        ),
      },
    ],
    [],
  )

  return (
    <>
      <ListPageLayout
        title="App 用户"
        description="管理 App 注册用户，含头像、角色与 VIP 标记"
        envNote="用户数据来自当前所选业务 API"
        metrics={[{ label: '匹配用户', value: loading ? '…' : total }]}
        toolbar={
          <AdminToolbar
            search={{
              value: keyword,
              onChange: setKeyword,
              onSubmit: () => {
                setPage(1)
                setSearch(keyword.trim())
              },
              placeholder: '搜索用户名 / 邮箱 / Moe 号',
            }}
          />
        }
        error={error}
        pagination={{
          page,
          totalPages,
          total,
          onPageChange: setPage,
        }}
      >
        <AdminTable columns={columns} rows={items} rowKey={(row) => row.id} loading={loading} />
      </ListPageLayout>

      <AdminFormDrawer
        open={selected !== null}
        title={selected ? `编辑用户 · ${selected.username}` : '编辑用户'}
        subtitle={selected ? `UID ${selected.id} · 账号资料、关联资产与角色权限治理` : undefined}
        wide
        error={formError}
        saving={saving}
        onClose={() => {
          setSelected(null)
          setFormError('')
        }}
        onSave={() => void saveUser()}
        saveLabel="保存用户设置"
      >
        {selected ? <UserProfileCard user={selected} /> : null}

        <section className="drawer-section">
          <div className="drawer-section-head">
            <div>
              <div className="drawer-section-title">1. 账号资料与权限治理</div>
              <div className="drawer-section-desc">修改头像路径、签名、后台角色与 VIP 权益状态</div>
            </div>
            {selected ? (
              <TagRow>
                <AdminTag spec={roleTag(role)} />
                <AdminTag spec={vipTag(isVip)} />
              </TagRow>
            ) : null}
          </div>

          <div className="drawer-grid-2">
            <FormField label="App 角色权限">
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="user">user（普通用户）</option>
                <option value="admin">admin（管理员）</option>
                <option value="super_admin">super_admin（超级管理员）</option>
              </select>
            </FormField>

            <FormField label="会员权益状态">
              <label className="ai-switch-row" style={{ background: 'var(--surface)' }}>
                <span>开通 VIP 会员标识</span>
                <input
                  type="checkbox"
                  checked={isVip}
                  onChange={(e) => setIsVip(e.target.checked)}
                />
              </label>
            </FormField>
          </div>

          <FormField
            label="头像 URL / 云图库路径"
            hint="支持相对路径（/api/images/…）或外链；换域名后可在「应用配置」改 PublicBaseUrl。"
          >
            <input
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="/api/images/xxx 或完整 http(s) URL"
              spellCheck={false}
            />
          </FormField>

          <FormField label="个性签名">
            <input
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="可选，展示在用户个人主页"
            />
          </FormField>
        </section>

        <section className="drawer-section">
          <div className="drawer-section-head">
            <div>
              <div className="drawer-section-title">2. 社区资产与近 7 日行为画像</div>
              <div className="drawer-section-desc">实时汇总该用户的发帖、互动、成长等级与高频访问页面</div>
            </div>
            {profile?.level ? (
              <AdminTag
                label={`Lv.${profile.level.level} ${profile.level.level_title || ''} (${profile.level.experience}/${profile.level.total_exp})`}
                tone="purple"
              />
            ) : null}
          </div>

          {profileLoading ? (
            <p className="muted" style={{ fontSize: 12, margin: 0 }}>
              正在加载用户关联数据与行为画像…
            </p>
          ) : profile ? (
            <>
              <div className="admin-metrics" style={{ marginBottom: 4 }}>
                {[
                  ['动态', profile.counts?.posts],
                  ['评论', profile.counts?.comments],
                  ['粉丝', profile.counts?.followers],
                  ['关注', profile.counts?.following],
                  ['签到', profile.counts?.check_ins],
                  ['成就', profile.counts?.achievements_unlocked],
                  ['VIP 订单', profile.counts?.vip_orders],
                  ['送礼', profile.counts?.gift_sent],
                  ['收礼', profile.counts?.gift_received],
                  ['AI 分身', profile.counts?.ai_agents],
                ].map(([label, value]) => (
                  <div className="metric" key={String(label)}>
                    <div className="label">{label}</div>
                    <div className="value">{value ?? 0}</div>
                  </div>
                ))}
              </div>

              {(profile.links?.length ?? 0) > 0 ? (
                <div className="drawer-pill-row">
                  {(profile.links ?? []).map((link) => (
                    <Link
                      key={link.admin_route}
                      to={resolveAdminPath(link.admin_route)}
                      className="btn btn-ghost btn-sm"
                    >
                      {link.label} →
                    </Link>
                  ))}
                </div>
              ) : null}

              {profile.behavior ? (
                <div style={{ marginTop: 4 }}>
                  <div className="btn-row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                    <strong style={{ fontSize: 12 }}>行为画像（近 7 日）</strong>
                    <span className="muted" style={{ fontSize: 12 }}>
                      事件 {profile.behavior.total_events_7d ?? 0} 条
                      {profile.behavior.last_active_at
                        ? ` · 最近活跃 ${formatDateTime(profile.behavior.last_active_at)}`
                        : ''}
                    </span>
                  </div>
                  {profile.behavior.tags && profile.behavior.tags.length > 0 ? (
                    <div className="drawer-pill-row" style={{ marginBottom: 8 }}>
                      {profile.behavior.tags.map((tag) => (
                        <span key={tag} className="admin-tag admin-tag-mint">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {(profile.behavior.top_screens || []).length > 0 ? (
                    <AdminTable
                      compact
                      columns={[
                        {
                          key: 'screen',
                          header: '页面',
                          render: (row) => row.label || row.screen,
                        },
                        {
                          key: 'visits',
                          header: '访问',
                          render: (row) => row.visit_count,
                        },
                        {
                          key: 'duration',
                          header: '停留(ms)',
                          render: (row) => row.total_duration_ms,
                        },
                      ]}
                      rows={profile.behavior.top_screens!}
                      rowKey={(row) => row.screen}
                    />
                  ) : (
                    <p className="muted" style={{ fontSize: 12, margin: 0 }}>
                      近 7 日暂无页面浏览埋点数据
                    </p>
                  )}
                </div>
              ) : null}
            </>
          ) : (
            <p className="muted" style={{ fontSize: 12, margin: 0 }}>
              暂无关联统计数据
            </p>
          )}
        </section>
      </AdminFormDrawer>
    </>
  )
}
