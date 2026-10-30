import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminPanel } from '../ui/AdminPanel'
import { ListPageLayout } from '../ui'
import { exportUnifiedPetPack } from '../features/moe-content/exportUnifiedPetPack'
import { PetContentMaturityPanel } from '../features/moe-content/PetContentMaturityPanel'

const SECTIONS = [
  {
    to: '/biz/pet/avatar',
    title: '序列帧工作台',
    desc: '导入 AI 帧 · 统一画布 · 动画编排 · Sheet 导出',
    status: 'MVP',
  },
  {
    to: '/biz/pet/furniture',
    title: '家具',
    desc: '床/桌/灯/地毯等 · 透明 PNG · 场景 living/yard/bedroom',
    status: 'MVP',
  },
  {
    to: '/biz/pet/decor',
    title: '装饰',
    desc: '墙贴/挂饰/地饰 · 与家具同 manifest 结构',
    status: '规划',
  },
] as const

/** 养成内容总览：角色 / 家具 / 装饰 */
export function PetContentHubPage() {
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  async function handleExportPack() {
    setExporting(true)
    setExportError(null)
    try {
      await exportUnifiedPetPack()
    } catch (e) {
      setExportError(e instanceof Error ? e.message : String(e))
    } finally {
      setExporting(false)
    }
  }

  return (
    <ListPageLayout
      title="养成 · 内容编辑器"
      description="官方内容包平台 · 角色 / 世界对象 / 场景（成熟度 SSOT: docs/dev/pet-content-pack-maturity.md)"
    >
      <PetContentMaturityPanel />
      <p className="muted" style={{ marginTop: 0 }}>
        规范 SSOT：<code>docs/dev/moe-pet-content-pack.md</code> ·{' '}
        <code>petContentPackTypes.ts</code>
      </p>

      <AdminPanel title="统一内容包（v1）">
        <p style={{ fontSize: 13, marginTop: 0 }}>
          <strong>角色与家具同属官方资产</strong>：zip 内含{' '}
          <code>manifest.json</code>（<code>avatar</code> + <code>objects</code>
          两节）。角色的 walk/idle 及未来 run/emote 等动作，均在 manifest{' '}
          <code>animations</code> 中由 Moe 注册，App 只播放 catalog 内动画，不依赖
          ULPC 全集。
        </p>
        <button
          type="button"
          className="btn primary"
          disabled={exporting}
          onClick={() => void handleExportPack()}
        >
          {exporting ? '导出中…' : '导出完整内容包 zip'}
        </button>
        {exportError ? (
          <p style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 0 }}>
            {exportError}
          </p>
        ) : null}
      </AdminPanel>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 16,
          marginTop: 16,
        }}
      >
        {SECTIONS.map((s) => (
          <AdminPanel key={s.to} title={s.title}>
            <p style={{ fontSize: 13, minHeight: 40 }}>{s.desc}</p>
            <p className="muted" style={{ fontSize: 11 }}>
              状态：{s.status}
            </p>
            <Link to={s.to} className="btn primary" style={{ display: 'inline-block', marginTop: 8 }}>
              打开编辑器
            </Link>
          </AdminPanel>
        ))}
      </div>
    </ListPageLayout>
  )
}

/** 装饰编辑器占位 */
export function PetDecorEditorPage() {
  return (
    <ListPageLayout title="养成 · 装饰" description="墙贴 / 挂饰 / 地饰（P1）">
      <AdminPanel title="规划">
        <p>
          装饰与<strong>家具</strong>共用单品 PNG + manifest 结构，增加{' '}
          <code>placement</code>（wall / floor / hanging）。
        </p>
        <p className="muted">
          先在「家具」编辑器验证导出流水线，装饰将复用同一套 moe-content 模块。
        </p>
        <Link to="/biz/pet/content" className="btn">
          返回内容总览
        </Link>
      </AdminPanel>
    </ListPageLayout>
  )
}
