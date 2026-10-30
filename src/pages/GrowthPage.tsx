import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdminFormDrawer } from '../components/AdminFormDrawer'
import { AdminTag } from '../components/AdminTag'
import { FormField } from '../components/FormField'
import { IdCell } from '../components/IdCell'
import { useAdminAuth } from '../context/AdminAuthContext'
import { achievementCategoryTag, boolTag, rarityTag } from '../lib/adminLabels'
import { unwrapListItems } from '../lib/apiResponse'
import { DeployApiError } from '../api/deployClient'
import { AdminPanel, AdminTable, TabbedPageLayout } from '../ui'
import type { AdminTableColumn } from '../ui'

type Tab = 'stats' | 'achievements' | 'levels' | 'rewards'

type Stats = {
  achievement_definitions: number
  unlocked_progress_records: number
  level_configs: number
  check_in_rewards: number
  user_levels: number
  check_ins_today: number
  total_check_ins: number
}

type AchievementRow = {
  id: string
  name: string
  description: string
  category: string
  rarity: string
  enabled: boolean
  sort_order: number
  exp_reward: number
}

type LevelRow = {
  id: string
  level: number
  title: string
  min_exp: number
  max_exp: number
  privileges: string
  badge_url: string
}

type RewardRow = {
  id: string
  consecutive_days: number
  exp_reward: number
  extra_reward: string
}

const TABS: { key: Tab; label: string; hint: string }[] = [
  { key: 'stats', label: '统计', hint: '全站成长指标' },
  { key: 'achievements', label: '成就', hint: '定义与开关' },
  { key: 'levels', label: '等级', hint: '经验档位' },
  { key: 'rewards', label: '签到奖励', hint: '连续签到规则' },
]

export function GrowthPage() {
  const { client } = useAdminAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') as Tab) || 'stats'

  const [stats, setStats] = useState<Stats | null>(null)
  const [achievements, setAchievements] = useState<AchievementRow[]>([])
  const [achTotal, setAchTotal] = useState(0)
  const [achPage, setAchPage] = useState(1)
  const [levels, setLevels] = useState<LevelRow[]>([])
  const [rewards, setRewards] = useState<RewardRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [editAch, setEditAch] = useState<AchievementRow | null>(null)
  const [editLevel, setEditLevel] = useState<LevelRow | null>(null)
  const [editReward, setEditReward] = useState<RewardRow | null>(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const [achForm, setAchForm] = useState({
    name: '',
    description: '',
    enabled: true,
    exp_reward: '0',
    sort_order: '0',
  })
  const [levelForm, setLevelForm] = useState({
    title: '',
    min_exp: '0',
    max_exp: '0',
    privileges: '',
    badge_url: '',
  })
  const [rewardForm, setRewardForm] = useState({
    consecutive_days: '1',
    exp_reward: '0',
    extra_reward: '',
  })

  const pageSize = 20

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const statsRes = await client.getGrowthStats()
      if (statsRes.success && statsRes.data) setStats(statsRes.data)

      if (tab === 'achievements') {
        const listRes = await client.listAchievements({ page: achPage, page_size: pageSize })
        if (listRes.success && listRes.data) {
          setAchievements((listRes.data.items || []) as AchievementRow[])
          setAchTotal(listRes.data.total || 0)
        } else {
          setError(listRes.message || '加载成就失败')
        }
      } else if (tab === 'levels') {
        const res = await client.listLevelConfigs()
        if (res.success && res.data) setLevels(unwrapListItems(res.data))
        else setError(res.message || '加载等级配置失败')
      } else if (tab === 'rewards') {
        const res = await client.listCheckInRewards()
        if (res.success && res.data) setRewards(unwrapListItems(res.data))
        else setError(res.message || '加载签到奖励失败')
      }
    } catch (e) {
      setError(e instanceof DeployApiError ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [client, tab, achPage])

  useEffect(() => {
    void load()
  }, [load])

  function setTab(next: Tab) {
    setSearchParams(next === 'stats' ? {} : { tab: next })
  }

  async function bootstrap(type: 'achievements' | 'levels') {
    setError('')
    try {
      const res =
        type === 'achievements'
          ? await client.bootstrapAchievements()
          : await client.bootstrapLevels()
      if (!res.success) {
        setError(res.message || '初始化失败')
        return
      }
      if (type === 'achievements') {
        const d = res.data as { created?: number }
        setMessage(`成就定义已导入 ${d?.created ?? 0} 条`)
      } else {
        const d = res.data as {
          level_configs_created?: number
          check_in_rewards_created?: number
        }
        setMessage(
          `等级 ${d?.level_configs_created ?? 0} 条 · 签到奖励 ${d?.check_in_rewards_created ?? 0} 条`,
        )
      }
      await load()
    } catch (e) {
      setError(e instanceof DeployApiError ? e.message : '初始化失败')
    }
  }

  function openAchEdit(row: AchievementRow) {
    setEditAch(row)
    setAchForm({
      name: row.name,
      description: row.description || '',
      enabled: row.enabled,
      exp_reward: String(row.exp_reward ?? 0),
      sort_order: String(row.sort_order ?? 0),
    })
    setFormError('')
  }

  function openLevelEdit(row: LevelRow) {
    setEditLevel(row)
    setLevelForm({
      title: row.title,
      min_exp: String(row.min_exp),
      max_exp: String(row.max_exp),
      privileges: row.privileges || '',
      badge_url: row.badge_url || '',
    })
    setFormError('')
  }

  function openRewardEdit(row: RewardRow) {
    setEditReward(row)
    setRewardForm({
      consecutive_days: String(row.consecutive_days),
      exp_reward: String(row.exp_reward),
      extra_reward: row.extra_reward || '',
    })
    setFormError('')
  }

  async function saveAchievement() {
    if (!editAch) return
    setSaving(true)
    setFormError('')
    try {
      const res = await client.updateAchievement(editAch.id, {
        name: achForm.name.trim(),
        update_name: true,
        description: achForm.description.trim(),
        update_description: true,
        enabled: achForm.enabled,
        update_enabled: true,
        exp_reward: Number(achForm.exp_reward) || 0,
        update_exp_reward: true,
        sort_order: Number(achForm.sort_order) || 0,
        update_sort_order: true,
      })
      if (!res.success) {
        setFormError(res.message || '保存失败')
        return
      }
      setEditAch(null)
      await load()
    } catch (e) {
      setFormError(e instanceof DeployApiError ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  async function saveLevel() {
    if (!editLevel) return
    setSaving(true)
    setFormError('')
    try {
      const res = await client.updateLevelConfig(editLevel.id, {
        title: levelForm.title.trim(),
        update_title: true,
        min_exp: Number(levelForm.min_exp) || 0,
        update_min_exp: true,
        max_exp: Number(levelForm.max_exp) || 0,
        update_max_exp: true,
        privileges: levelForm.privileges.trim(),
        update_privileges: true,
        badge_url: levelForm.badge_url.trim(),
        update_badge_url: true,
      })
      if (!res.success) {
        setFormError(res.message || '保存失败')
        return
      }
      setEditLevel(null)
      await load()
    } catch (e) {
      setFormError(e instanceof DeployApiError ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  async function saveReward() {
    if (!editReward) return
    setSaving(true)
    setFormError('')
    try {
      const res = await client.updateCheckInReward(editReward.id, {
        consecutive_days: Number(rewardForm.consecutive_days) || 1,
        update_consecutive_days: true,
        exp_reward: Number(rewardForm.exp_reward) || 0,
        update_exp_reward: true,
        extra_reward: rewardForm.extra_reward.trim(),
        update_extra_reward: true,
      })
      if (!res.success) {
        setFormError(res.message || '保存失败')
        return
      }
      setEditReward(null)
      await load()
    } catch (e) {
      setFormError(e instanceof DeployApiError ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const achTotalPages = Math.max(1, Math.ceil(achTotal / pageSize))

  const achievementColumns = useMemo(
    (): AdminTableColumn<AchievementRow>[] => [
      { key: 'id', header: 'ID', render: (row) => <IdCell id={row.id} /> },
      { key: 'name', header: '名称', render: (row) => row.name },
      {
        key: 'category',
        header: '分类',
        render: (row) => <AdminTag spec={achievementCategoryTag(row.category)} />,
      },
      {
        key: 'rarity',
        header: '稀有度',
        render: (row) => <AdminTag spec={rarityTag(row.rarity)} />,
      },
      { key: 'exp', header: '经验', render: (row) => row.exp_reward ?? 0 },
      {
        key: 'enabled',
        header: '启用',
        render: (row) => <AdminTag spec={boolTag(row.enabled)} />,
      },
      {
        key: 'actions',
        header: '',
        render: (row) => (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => openAchEdit(row)}>
            编辑
          </button>
        ),
      },
    ],
    [],
  )

  const levelColumns = useMemo(
    (): AdminTableColumn<LevelRow>[] => [
      { key: 'level', header: '等级', render: (row) => `Lv.${row.level}` },
      { key: 'title', header: '称号', render: (row) => row.title },
      {
        key: 'exp',
        header: '经验区间',
        cellClassName: 'muted',
        render: (row) => `${row.min_exp} – ${row.max_exp}`,
      },
      {
        key: 'badge',
        header: '徽章 URL',
        cellClassName: 'muted',
        render: (row) => (
          <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block' }}>
            {row.badge_url || '—'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        render: (row) => (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => openLevelEdit(row)}>
            编辑
          </button>
        ),
      },
    ],
    [],
  )

  const rewardColumns = useMemo(
    (): AdminTableColumn<RewardRow>[] => [
      { key: 'days', header: '连续天数', render: (row) => `${row.consecutive_days} 天` },
      { key: 'exp', header: '经验奖励', render: (row) => `+${row.exp_reward} EXP` },
      {
        key: 'extra',
        header: '额外奖励 JSON',
        cellClassName: 'muted',
        render: (row) => (
          <span style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block' }}>
            {row.extra_reward || '—'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        render: (row) => (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => openRewardEdit(row)}>
            编辑
          </button>
        ),
      },
    ],
    [],
  )

  return (
    <>
      <TabbedPageLayout
        title="签到 · 等级 · 成就"
        description="成长体系运营配置 · 支持编辑等级/签到奖励/成就开关"
        headActions={
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={() => void bootstrap('achievements')}>
              导入默认成就
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => void bootstrap('levels')}>
              导入等级/签到奖励
            </button>
          </div>
        }
        tabs={TABS}
        activeTab={tab}
        onTabChange={setTab}
      >
        {message ? (
          <p className="form-hint ok">
            {message}
            <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={() => setMessage('')}>
              关闭
            </button>
          </p>
        ) : null}
        {error ? <p className="text-danger">{error}</p> : null}

        {tab === 'stats' && stats ? (
          <div className="admin-metrics" style={{ marginBottom: 16 }}>
            <div className="metric">
              <div className="label">成就定义</div>
              <div className="value">{stats.achievement_definitions}</div>
            </div>
            <div className="metric">
              <div className="label">已解锁记录</div>
              <div className="value">{stats.unlocked_progress_records}</div>
            </div>
            <div className="metric">
              <div className="label">等级配置</div>
              <div className="value">{stats.level_configs}</div>
            </div>
            <div className="metric">
              <div className="label">签到奖励规则</div>
              <div className="value">{stats.check_in_rewards}</div>
            </div>
            <div className="metric">
              <div className="label" title="全站今日签到记录数（上海时区自然日，按人次计）">
                今日签到人次
              </div>
              <div className="value">{stats.check_ins_today}</div>
            </div>
            <div className="metric">
              <div className="label">累计签到</div>
              <div className="value">{stats.total_check_ins}</div>
            </div>
          </div>
        ) : null}

        {tab === 'achievements' ? (
          <AdminPanel>
            <AdminTable
              columns={achievementColumns}
              rows={achievements}
              rowKey={(row) => row.id}
              loading={loading}
              emptyText="暂无成就，可点击「导入默认成就」"
            />
            {achTotalPages > 1 ? (
              <div className="pager">
                <button type="button" className="btn btn-ghost" disabled={achPage <= 1} onClick={() => setAchPage((p) => p - 1)}>
                  上一页
                </button>
                <span className="muted">
                  {achPage}/{achTotalPages} · 共 {achTotal} 条
                </span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={achPage >= achTotalPages}
                  onClick={() => setAchPage((p) => p + 1)}
                >
                  下一页
                </button>
              </div>
            ) : null}
          </AdminPanel>
        ) : null}

        {tab === 'levels' ? (
          <AdminPanel>
            <AdminTable
              columns={levelColumns}
              rows={levels}
              rowKey={(row) => row.id}
              loading={loading}
              emptyText="暂无等级配置，可点击「导入等级/签到奖励」"
            />
          </AdminPanel>
        ) : null}

        {tab === 'rewards' ? (
          <AdminPanel>
            <AdminTable
              columns={rewardColumns}
              rows={rewards}
              rowKey={(row) => row.id}
              loading={loading}
              emptyText="暂无签到奖励规则"
            />
          </AdminPanel>
        ) : null}
      </TabbedPageLayout>

      <AdminFormDrawer
        open={editAch !== null}
        title={editAch ? `编辑成就 · ${editAch.name}` : '编辑成就'}
        error={formError}
        saving={saving}
        onClose={() => setEditAch(null)}
        onSave={() => void saveAchievement()}
      >
        <FormField label="名称">
          <input value={achForm.name} onChange={(e) => setAchForm((f) => ({ ...f, name: e.target.value }))} />
        </FormField>
        <FormField label="描述">
          <textarea
            rows={3}
            value={achForm.description}
            onChange={(e) => setAchForm((f) => ({ ...f, description: e.target.value }))}
          />
        </FormField>
        <FormField label="经验奖励">
          <input
            type="number"
            value={achForm.exp_reward}
            onChange={(e) => setAchForm((f) => ({ ...f, exp_reward: e.target.value }))}
          />
        </FormField>
        <FormField label="排序">
          <input
            type="number"
            value={achForm.sort_order}
            onChange={(e) => setAchForm((f) => ({ ...f, sort_order: e.target.value }))}
          />
        </FormField>
        <label className="checkbox-row form-field">
          <input
            type="checkbox"
            checked={achForm.enabled}
            onChange={(e) => setAchForm((f) => ({ ...f, enabled: e.target.checked }))}
          />
          <span>启用</span>
        </label>
      </AdminFormDrawer>

      <AdminFormDrawer
        open={editLevel !== null}
        title={editLevel ? `编辑等级 Lv.${editLevel.level}` : '编辑等级'}
        error={formError}
        saving={saving}
        onClose={() => setEditLevel(null)}
        onSave={() => void saveLevel()}
      >
        <FormField label="称号">
          <input value={levelForm.title} onChange={(e) => setLevelForm((f) => ({ ...f, title: e.target.value }))} />
        </FormField>
        <FormField label="最低经验">
          <input
            type="number"
            value={levelForm.min_exp}
            onChange={(e) => setLevelForm((f) => ({ ...f, min_exp: e.target.value }))}
          />
        </FormField>
        <FormField label="最高经验">
          <input
            type="number"
            value={levelForm.max_exp}
            onChange={(e) => setLevelForm((f) => ({ ...f, max_exp: e.target.value }))}
          />
        </FormField>
        <FormField label="特权 JSON">
          <textarea
            rows={3}
            value={levelForm.privileges}
            onChange={(e) => setLevelForm((f) => ({ ...f, privileges: e.target.value }))}
          />
        </FormField>
        <FormField label="徽章 URL">
          <input
            value={levelForm.badge_url}
            onChange={(e) => setLevelForm((f) => ({ ...f, badge_url: e.target.value }))}
            spellCheck={false}
          />
        </FormField>
      </AdminFormDrawer>

      <AdminFormDrawer
        open={editReward !== null}
        title={editReward ? `编辑签到奖励 · ${editReward.consecutive_days} 天` : '编辑签到奖励'}
        error={formError}
        saving={saving}
        onClose={() => setEditReward(null)}
        onSave={() => void saveReward()}
      >
        <FormField label="连续签到天数">
          <input
            type="number"
            value={rewardForm.consecutive_days}
            onChange={(e) => setRewardForm((f) => ({ ...f, consecutive_days: e.target.value }))}
          />
        </FormField>
        <FormField label="经验奖励">
          <input
            type="number"
            value={rewardForm.exp_reward}
            onChange={(e) => setRewardForm((f) => ({ ...f, exp_reward: e.target.value }))}
          />
        </FormField>
        <FormField label="额外奖励 JSON">
          <textarea
            rows={3}
            value={rewardForm.extra_reward}
            onChange={(e) => setRewardForm((f) => ({ ...f, extra_reward: e.target.value }))}
          />
        </FormField>
      </AdminFormDrawer>
    </>
  )
}
