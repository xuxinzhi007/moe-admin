import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminFormDrawer } from '../components/AdminFormDrawer'
import { FormField } from '../components/FormField'
import { AdminFilterPills } from '../components/AdminFilterPills'
import { useAdminAuth } from '../context/AdminAuthContext'
import { DeployApiError } from '../api/deployClient'
import { AdminTable, AdminToolbar, ListPageLayout } from '../ui'
import type { AdminTableColumn } from '../ui'

type VipPlanRow = {
  id: string
  name: string
  description: string
  price: number
  duration_days: number
  created_at: string
  updated_at: string
}

const emptyForm = {
  name: '',
  description: '',
  price: '',
  duration_days: '30',
}

export function VipPlansPage() {
  const { client } = useAdminAuth()
  const [items, setItems] = useState<VipPlanRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing] = useState<VipPlanRow | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const pageSize = 20

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await client.listVipPlans({
        page,
        page_size: pageSize,
        keyword: search || undefined,
        include_deleted: includeDeleted,
      })
      if (!res.success || !res.data) {
        setError(res.message || '加载失败')
        setItems([])
        setTotal(0)
        return
      }
      setItems(res.data.items || [])
      setTotal(res.data.total || 0)
    } catch (e) {
      setError(e instanceof DeployApiError ? e.message : '加载失败')
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [client, page, search, includeDeleted])

  useEffect(() => {
    void load()
  }, [load])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setFormError('')
    setModal('create')
  }

  function openEdit(row: VipPlanRow) {
    setEditing(row)
    setForm({
      name: row.name,
      description: row.description || '',
      price: String(row.price),
      duration_days: String(row.duration_days),
    })
    setFormError('')
    setModal('edit')
  }

  function closeModal() {
    setModal(null)
    setFormError('')
  }

  async function savePlan() {
    const name = form.name.trim()
    const price = Number(form.price)
    const durationDays = Number(form.duration_days)
    if (!name) {
      setFormError('请填写套餐名称')
      return
    }
    if (!Number.isFinite(price) || price < 0) {
      setFormError('请填写有效价格')
      return
    }
    if (!Number.isFinite(durationDays) || durationDays <= 0) {
      setFormError('有效期天数必须大于 0')
      return
    }

    setSaving(true)
    setFormError('')
    try {
      if (modal === 'create') {
        const res = await client.createVipPlan({
          name,
          description: form.description.trim(),
          price,
          duration_days: durationDays,
        })
        if (!res.success) {
          setFormError(res.message || '创建失败')
          return
        }
        setMessage('套餐已创建')
      } else if (editing) {
        const res = await client.updateVipPlan(editing.id, {
          name,
          description: form.description.trim(),
          update_name: true,
          update_description: true,
          price,
          update_price: true,
          duration_days: durationDays,
          update_duration_days: true,
        })
        if (!res.success) {
          setFormError(res.message || '保存失败')
          return
        }
        setMessage('套餐已更新')
      }
      closeModal()
      await load()
    } catch (e) {
      setFormError(e instanceof DeployApiError ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  async function removePlan(row: VipPlanRow) {
    if (!confirm(`确定删除套餐「${row.name}」？已购用户记录不受影响。`)) return
    setError('')
    try {
      const res = await client.deleteVipPlan(row.id)
      if (!res.success) {
        setError(res.message || '删除失败')
        return
      }
      setMessage('已删除')
      await load()
    } catch (e) {
      setError(e instanceof DeployApiError ? e.message : '删除失败')
    }
  }

  async function bootstrap() {
    if (!confirm('仅在套餐表为空时导入月/季/年默认套餐，是否继续？')) return
    setError('')
    try {
      const res = await client.bootstrapVipPlans()
      if (!res.success) {
        setError(res.message || '初始化失败')
        return
      }
      setMessage(res.message || `已导入 ${res.data?.created ?? 0} 条`)
      await load()
    } catch (e) {
      setError(e instanceof DeployApiError ? e.message : '初始化失败')
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const columns = useMemo(
    (): AdminTableColumn<VipPlanRow>[] => [
      { key: 'id', header: 'ID', render: (row) => row.id },
      { key: 'name', header: '名称', render: (row) => row.name },
      { key: 'price', header: '价格', render: (row) => `¥${row.price.toFixed(2)}` },
      { key: 'days', header: '天数', render: (row) => row.duration_days },
      { key: 'desc', header: '说明', render: (row) => row.description || '—' },
      {
        key: 'actions',
        header: '操作',
        render: (row) => (
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(row)}>
              编辑
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void removePlan(row)}>
              删除
            </button>
          </>
        ),
      },
    ],
    [load],
  )

  return (
    <>
      <ListPageLayout
        title="会员与套餐"
        description="运营配置 VIP 套餐（App 只读展示）"
        metrics={[
          { label: '套餐数量', value: loading ? '…' : total },
          { label: '含已删除', value: includeDeleted ? '是' : '否' },
        ]}
        headActions={
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={() => void bootstrap()}>
              导入默认套餐
            </button>
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              新建套餐
            </button>
          </div>
        }
        banner={message ? { message, tone: 'ok', onClose: () => setMessage('') } : undefined}
        toolbar={
          <AdminToolbar
            search={{
              value: keyword,
              onChange: setKeyword,
              onSubmit: () => {
                setPage(1)
                setSearch(keyword.trim())
              },
              placeholder: '搜索套餐名称 / 说明',
            }}
            filters={
              <AdminFilterPills
                ariaLabel="套餐状态"
                value={includeDeleted ? 'with_deleted' : 'active'}
                onChange={(next) => {
                  setIncludeDeleted(next === 'with_deleted')
                  setPage(1)
                }}
                options={[
                  { value: 'active', label: '仅有效' },
                  { value: 'with_deleted', label: '含已删除' },
                ]}
              />
            }
          />
        }
        error={error}
        pagination={{ page, totalPages, total, onPageChange: setPage }}
      >
        <AdminTable
          columns={columns}
          rows={items}
          rowKey={(row) => row.id}
          loading={loading}
          emptyText="暂无套餐，可点击「导入默认套餐」或「新建套餐」"
        />
      </ListPageLayout>

      {modal ? (
        <AdminFormDrawer
          open
          title={modal === 'create' ? '新建 VIP 套餐' : '编辑 VIP 套餐'}
          subtitle={editing ? `ID ${editing.id}` : undefined}
          error={formError}
          saving={saving}
          onClose={closeModal}
          onSave={() => void savePlan()}
        >
          <FormField label="名称" required>
            <input
              value={form.name}
              placeholder="如：月度会员"
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </FormField>
          <div className="form-grid-2">
            <FormField label="价格（元）" required>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              />
            </FormField>
            <FormField label="有效天数" required>
              <input
                type="number"
                min={1}
                value={form.duration_days}
                onChange={(e) => setForm((f) => ({ ...f, duration_days: e.target.value }))}
              />
            </FormField>
          </div>
          <FormField label="说明" hint="App 端展示的套餐描述">
            <textarea
              rows={3}
              value={form.description}
              placeholder="如：解锁全部 VIP 特权"
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </FormField>
        </AdminFormDrawer>
      ) : null}
    </>
  )
}
