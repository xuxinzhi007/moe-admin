import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminFormDrawer } from '../components/AdminFormDrawer'
import { AdminTag } from '../components/AdminTag'
import { EmojiIconField } from '../components/EmojiIconField'
import { FormField } from '../components/FormField'
import { AdminFilterPills } from '../components/AdminFilterPills'
import { useAdminAuth } from '../context/AdminAuthContext'
import { DeployApiError } from '../api/deployClient'
import { GIFT_CATEGORIES, giftCategoryLabel } from '../lib/giftCategories'
import { AdminToolbar, ListPageLayout } from '../ui'

type GiftRow = {
  id: string
  name: string
  price: number
  icon: string
  description: string
  category: string
  sort_order: number
}

const emptyForm = {
  name: '',
  price: '1',
  icon: '',
  description: '',
  category: 'special',
  sort_order: '0',
}

export function GiftsPage() {
  const { client } = useAdminAuth()
  const [items, setItems] = useState<GiftRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing] = useState<GiftRow | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const pageSize = 24

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await client.listGifts({
        page,
        page_size: pageSize,
        keyword: search || undefined,
        category: category || undefined,
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
    } finally {
      setLoading(false)
    }
  }, [client, page, search, category])

  useEffect(() => {
    void load()
  }, [load])

  const duplicateNames = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of items) {
      counts.set(item.name, (counts.get(item.name) ?? 0) + 1)
    }
    return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([name]) => name))
  }, [items])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setFormError('')
    setModal('create')
  }

  function openEdit(row: GiftRow) {
    setEditing(row)
    setForm({
      name: row.name,
      price: String(row.price),
      icon: row.icon || '',
      description: row.description || '',
      category: row.category || 'special',
      sort_order: String(row.sort_order ?? 0),
    })
    setFormError('')
    setModal('edit')
  }

  function closeModal() {
    setModal(null)
    setFormError('')
  }

  async function saveGift() {
    const name = form.name.trim()
    const price = Number(form.price)
    const sortOrder = Number(form.sort_order)
    if (!name || !Number.isFinite(price) || price < 0) {
      setFormError('请填写名称与有效价格')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      if (modal === 'create') {
        const res = await client.createGift({
          name,
          price,
          icon: form.icon.trim(),
          description: form.description.trim(),
          category: form.category,
          sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
        })
        if (!res.success) {
          setFormError(res.message || '创建失败')
          return
        }
        setMessage('礼物已创建')
      } else if (editing) {
        const res = await client.updateGift(editing.id, {
          name,
          price,
          icon: form.icon.trim(),
          description: form.description.trim(),
          category: form.category,
          sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
          update_name: true,
          update_price: true,
          update_icon: true,
          update_description: true,
          update_category: true,
          update_sort_order: true,
        })
        if (!res.success) {
          setFormError(res.message || '保存失败')
          return
        }
        setMessage('礼物已更新')
      }
      closeModal()
      await load()
    } catch (e) {
      setFormError(e instanceof DeployApiError ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  async function removeGift(row: GiftRow) {
    if (!confirm(`删除礼物「${row.name}」？`)) return
    const res = await client.deleteGift(row.id)
    if (!res.success) setError(res.message || '删除失败')
    else await load()
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <>
      <ListPageLayout
        title="礼物目录"
        description="配置 App 扭蛋机与动态打赏面板中的可赠送礼物 · 用户消耗心意币赠予创作者"
        metrics={[{ label: '礼物数量', value: loading ? '…' : total }]}
        headActions={
          <div className="btn-row page-head-toolbar">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={async () => {
                if (!confirm('仅在礼物表为空时导入 18 个默认礼物，是否继续？')) return
                const res = await client.bootstrapGifts()
                setMessage(res.message || `已导入 ${res.data?.created ?? 0} 条`)
                await load()
              }}
            >
              导入默认礼物
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={async () => {
                if (!confirm('合并同名礼物（保留最小 ID）？将迁移赠送记录与背包库存。')) return
                const res = await client.dedupeGifts()
                if (!res.success) {
                  setError(res.message || '去重失败')
                  return
                }
                setMessage(res.message || `已移除 ${res.data?.removed ?? 0} 条重复`)
                await load()
              }}
            >
              合并重复礼物
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
              新建礼物
            </button>
          </div>
        }
        banner={
          message ? { message, tone: 'ok', onClose: () => setMessage('') } : undefined
        }
        toolbar={
          <AdminToolbar
            search={{
              value: keyword,
              onChange: setKeyword,
              onSubmit: () => {
                setPage(1)
                setSearch(keyword.trim())
              },
              placeholder: '搜索名称 / 说明',
            }}
            filters={
              <AdminFilterPills
                ariaLabel="礼物分类"
                value={category}
                onChange={(next) => {
                  setCategory(next)
                  setPage(1)
                }}
                options={[
                  { value: '', label: '全部' },
                  ...GIFT_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
                ]}
              />
            }
          />
        }
        error={error}
        pagination={{ page, totalPages, total, onPageChange: setPage }}
      >
        <div className="gift-catalog-intro">
          <strong>礼物在 App 中的用途</strong>
          每条礼物包含图标、名称、心意币价格与说明，展示在「扭蛋机」抽奖池与动态「打赏」选择器中。排序值越小越靠前。
          {duplicateNames.size > 0 ? (
            <p className="form-hint warn" style={{ marginTop: 8 }}>
              检测到 {duplicateNames.size} 个重复名称（如多次导入或手动新建），建议保留一条并删除多余项。
            </p>
          ) : null}
        </div>

        {loading ? (
          <p className="muted" style={{ padding: '0 16px 16px' }}>
            加载中…
          </p>
        ) : items.length === 0 ? (
          <p className="muted" style={{ padding: '0 16px 16px' }}>
            暂无礼物 · 可点击「导入默认礼物」初始化目录
          </p>
        ) : (
          <div className="gift-catalog-grid">
            {items.map((row) => (
              <article key={row.id} className="gift-catalog-card">
                <div className="gift-catalog-card-head">
                  <span className="gift-catalog-icon" aria-hidden>
                    {row.icon || '🎁'}
                  </span>
                  <div className="gift-catalog-card-title">
                    <strong>{row.name}</strong>
                    <span>
                      {row.price} 心意币 · 排序 {row.sort_order} · ID {row.id}
                    </span>
                  </div>
                </div>
                <p className="gift-catalog-desc">{row.description?.trim() || '暂无说明'}</p>
                <div className="gift-catalog-card-foot">
                  <AdminTag
                    spec={{
                      label: giftCategoryLabel(row.category),
                      tone: row.category === 'luxury' ? 'purple' : 'neutral',
                    }}
                  />
                  {duplicateNames.has(row.name) ? (
                    <AdminTag spec={{ label: '重名', tone: 'warn' }} />
                  ) : null}
                  <div className="btn-row">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(row)}>
                      编辑
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => void removeGift(row)}>
                      删除
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </ListPageLayout>

      <AdminFormDrawer
        open={modal !== null}
        title={modal === 'create' ? '新建礼物' : '编辑礼物'}
        subtitle={editing ? `ID ${editing.id}` : undefined}
        error={formError}
        saving={saving}
        onClose={closeModal}
        onSave={() => void saveGift()}
      >
        <FormField label="名称" required>
          <input
            value={form.name}
            placeholder="如：爱心"
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </FormField>

        <div className="form-grid-2">
          <FormField label="价格（心意币）" required>
            <input
              type="number"
              min={0}
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            />
          </FormField>
          <FormField label="排序" hint="数值越小越靠前">
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
            />
          </FormField>
        </div>

        <EmojiIconField value={form.icon} onChange={(icon) => setForm((f) => ({ ...f, icon }))} />

        <FormField label="分类">
          <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
            {GIFT_CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="说明" hint="展示给用户的礼物描述">
          <textarea
            rows={3}
            value={form.description}
            placeholder="如：传递温暖的爱意"
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </FormField>
      </AdminFormDrawer>
    </>
  )
}
