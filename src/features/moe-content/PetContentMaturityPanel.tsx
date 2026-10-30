import { PET_CONTENT_RUNTIME_CAPABILITIES } from './petContentPackCapabilities'

/** 成熟度对照摘要（hub 页展示 · 完整表见 docs/dev/pet-content-pack-maturity.md） */
export function PetContentMaturityPanel() {
  const notReady = PET_CONTENT_RUNTIME_CAPABILITIES.filter(
    (c) => c.specReady && !c.runtimeReady,
  )

  return (
    <div
      style={{
        border: '1px solid #d4c4b8',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        background: '#fffaf6',
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6, color: '#5a4638' }}>
        官方标准 · 中间态说明
      </div>
      <p style={{ margin: '0 0 8px', color: '#8a7364', lineHeight: 1.5 }}>
        规范层（类型/manifest）已冻结；运行层按 capability 矩阵推进。
        <strong> 不可对外宣称</strong>下列能力为「官方已闭环」：
      </p>
      <ul style={{ margin: 0, paddingLeft: 18, color: '#8a7364' }}>
        {notReady.map((c) => (
          <li key={c.id}>
            {c.label}
            {c.notes ? ` — ${c.notes}` : ''}
          </li>
        ))}
      </ul>
      <p style={{ margin: '8px 0 0', fontSize: 11 }}>
        对照表：
        <code>docs/dev/pet-content-pack-maturity.md</code>
      </p>
    </div>
  )
}
