import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CodeGraphCanvas,
  selectedNodeOf,
} from '../features/codegraph/CodeGraphCanvas'
import {
  buildCatalog,
  focusSubgraph,
  neighborLinks,
  overviewSubgraph,
  wireSubgraph,
  type ViewMode,
} from '../features/codegraph/subgraph'
import {
  normalizeCodeGraph,
  type CodeGraphDocument,
  type CodeGraphDomain,
  type CodeGraphIndex,
} from '../features/codegraph/types'
import { PageMessage } from '../components/PageMessage'

async function loadJson<T>(file: string): Promise<T> {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')
  const url = `${base}dev/codegraph/${file}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`加载失败 ${url} (${res.status})`)
  return (await res.json()) as T
}

const MODES: Array<{ id: ViewMode; label: string; hint: string }> = [
  { id: 'wire', label: '连线全览', hint: '一次看主干节点与连线' },
  { id: 'overview', label: '骨架', hint: '只保留最高层' },
  { id: 'explore', label: '关系探索', hint: '围绕单点看邻居' },
]

export function CodeGraphPage() {
  const [index, setIndex] = useState<CodeGraphIndex | null>(null)
  const [domain, setDomain] = useState<CodeGraphDomain | string>('pet')
  const [graph, setGraph] = useState<CodeGraphDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<ViewMode>('wire')
  const [denseWire, setDenseWire] = useState(false)
  const [showEdgeLabels, setShowEdgeLabels] = useState(false)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const loadIndex = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const idx = await loadJson<CodeGraphIndex>('index.json')
      setIndex(idx)
      setDomain(idx.domains?.[0]?.id || 'pet')
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : '未找到 CodeGraph 数据。请执行 node scripts/codegraph/gen_all.mjs',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadIndex()
  }, [loadIndex])

  useEffect(() => {
    if (!index) return
    const meta = index.domains.find((d) => d.id === domain)
    if (!meta) return
    let cancelled = false
    setLoading(true)
    setError('')
    setMode('wire')
    setDenseWire(false)
    setShowEdgeLabels(false)
    setFocusId(null)
    setSelectedId(null)
    setSearch('')

    void loadJson<unknown>(meta.file)
      .then((raw) => {
        if (cancelled) return
        const doc = normalizeCodeGraph(raw)
        if (!doc) throw new Error('图谱 JSON 格式无效')
        setGraph(doc)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setGraph(null)
        setError(e instanceof Error ? e.message : '加载图谱失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [domain, index])

  const catalog = useMemo(
    () => (graph ? buildCatalog(graph, search) : []),
    [graph, search],
  )

  const visible = useMemo(() => {
    if (!graph) return { nodes: [], edges: [] }
    if (mode === 'overview') return overviewSubgraph(graph)
    if (mode === 'wire') return wireSubgraph(graph, { dense: denseWire })
    if (!focusId) return wireSubgraph(graph, { dense: denseWire })
    return focusSubgraph(graph, focusId, 1)
  }, [graph, mode, focusId, denseWire])

  const viewKey = `${domain}:${mode}:${denseWire ? 'd' : 'c'}:${focusId ?? '-'}:${visible.nodes.length}:${visible.edges.length}`

  const selected = useMemo(() => {
    if (!graph) return null
    return (
      selectedNodeOf(graph.nodes, selectedId) ||
      selectedNodeOf(graph.nodes, focusId)
    )
  }, [graph, selectedId, focusId])

  const links = useMemo(() => {
    if (!graph || !selected) return []
    return neighborLinks(graph, selected.id).slice(0, 48)
  }, [graph, selected])

  const domainMeta = index?.domains.find((d) => d.id === domain)

  const enterExplore = (id: string) => {
    setFocusId(id)
    setSelectedId(id)
    setMode('explore')
    setShowEdgeLabels(true)
  }

  const switchMode = (next: ViewMode) => {
    setMode(next)
    if (next === 'explore') {
      if (focusId) {
        setShowEdgeLabels(true)
        return
      }
      if (catalog[0]) enterExplore(catalog[0].id)
      else setShowEdgeLabels(true)
      return
    }
    setFocusId(null)
    setSelectedId(null)
    setShowEdgeLabels(false)
  }

  const onCanvasSelect = (id: string) => {
    setSelectedId(id)
    if (mode === 'explore') {
      setFocusId(id)
      return
    }
    // 全览/骨架：点选高亮连线，不强制跳探索；双意图用左侧目录进探索
  }

  return (
    <div className="codegraph-page">
      <header className="codegraph-head">
        <div>
          <h1>CodeGraph</h1>
          <p className="codegraph-caption">
            默认「连线全览」一次看主干连线；需要细节再进「关系探索」
          </p>
        </div>
        <div className="codegraph-head-actions">
          <button
            type="button"
            className="btn ghost"
            onClick={() => void loadIndex()}
          >
            重新加载
          </button>
        </div>
      </header>

      {error ? <PageMessage tone="err" message={error} /> : null}

      <div className="codegraph-domain-tabs" role="tablist">
        {(
          index?.domains || [
            { id: 'pet', label: 'Pet 内容包', file: 'pet.json', description: '' },
            { id: 'admin', label: 'Admin 路由', file: 'admin.json', description: '' },
            { id: 'backend', label: 'Backend API', file: 'backend.json', description: '' },
            { id: 'flutter', label: 'Flutter', file: 'flutter.json', description: '' },
          ]
        ).map((d) => (
          <button
            key={d.id}
            type="button"
            role="tab"
            aria-selected={domain === d.id}
            className={`codegraph-domain-tab ${domain === d.id ? 'is-active' : ''}`}
            onClick={() => setDomain(d.id)}
          >
            {d.label}
          </button>
        ))}
      </div>

      {domainMeta?.description ? (
        <p className="codegraph-domain-desc">{domainMeta.description}</p>
      ) : null}

      <div className="codegraph-modebar">
        <div className="codegraph-mode-pills" role="tablist" aria-label="视图模式">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              title={m.hint}
              className={`codegraph-mode-pill codegraph-mode-btn ${mode === m.id ? 'is-on' : ''}`}
              onClick={() => switchMode(m.id)}
            >
              {m.label}
              {m.id === 'explore' && focusId
                ? ` · ${selected?.label || ''}`
                : ''}
            </button>
          ))}
        </div>
        <div className="codegraph-mode-opts">
          {mode === 'wire' ? (
            <label className="codegraph-extra-toggle">
              <input
                type="checkbox"
                checked={denseWire}
                onChange={(e) => setDenseWire(e.target.checked)}
              />
              密连线（服务 / API 细节）
            </label>
          ) : null}
          <label className="codegraph-extra-toggle">
            <input
              type="checkbox"
              checked={showEdgeLabels || mode === 'explore'}
              disabled={mode === 'explore'}
              onChange={(e) => setShowEdgeLabels(e.target.checked)}
            />
            显示边文字
          </label>
          <div className="codegraph-stats">
            <span>
              画布 {visible.nodes.length} 节点 / {visible.edges.length} 边
            </span>
            {graph?.stats?.nodeCount != null ? (
              <span>全量 {graph.stats.nodeCount}</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="codegraph-layout codegraph-layout--3">
        <aside className="codegraph-catalog">
          <div className="codegraph-catalog-head">
            <h2>入口目录</h2>
            <input
              className="codegraph-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="过滤路由 / 服务 / 包…"
            />
          </div>
          <p className="codegraph-catalog-hint">
            全览里点节点可高亮连线；点这里进入「关系探索」看单点邻居。
          </p>
          <ul className="codegraph-catalog-list">
            {catalog.length === 0 ? (
              <li className="codegraph-catalog-empty">无匹配入口</li>
            ) : (
              catalog.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`codegraph-catalog-item ${
                      focusId === item.id || selectedId === item.id
                        ? 'is-active'
                        : ''
                    }`}
                    onClick={() => {
                      if (mode === 'wire' || mode === 'overview') {
                        setSelectedId(item.id)
                        // 若在画布中，滚动感靠高亮；也支持直接探索
                        const inView = visible.nodes.some((n) => n.id === item.id)
                        if (!inView) enterExplore(item.id)
                      } else {
                        enterExplore(item.id)
                      }
                    }}
                    onDoubleClick={() => enterExplore(item.id)}
                  >
                    <span className="codegraph-catalog-kind">{item.kind}</span>
                    <span className="codegraph-catalog-label">{item.label}</span>
                    {item.summary ? (
                      <span className="codegraph-catalog-sum" title={item.summary}>
                        {item.summary}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        </aside>

        <div className="codegraph-workspace">
          {loading && !graph ? (
            <div className="codegraph-empty">加载中…</div>
          ) : graph ? (
            <CodeGraphCanvas
              nodes={visible.nodes}
              edges={visible.edges}
              focusId={focusId}
              selectedId={selectedId}
              onSelect={onCanvasSelect}
              viewKey={viewKey}
              showEdgeLabels={showEdgeLabels || mode === 'explore'}
              showMiniMap={mode === 'wire'}
            />
          ) : (
            <div className="codegraph-empty">无图谱数据</div>
          )}
        </div>

        <aside className="codegraph-sidebar">
          <h2 className="codegraph-sidebar-title">
            {selected ? '关系详情' : '怎么用'}
          </h2>
          {!selected ? (
            <div className="codegraph-sidebar-empty">
              <ol className="codegraph-howto">
                <li>
                  <strong>连线全览</strong>：默认模式，箭头连线一次看完主干。
                </li>
                <li>点节点 → 高亮它的连线；需要文字时勾选「显示边文字」。</li>
                <li>
                  勾选<strong>密连线</strong>可挂上服务 / http_op（仍会抽样，避免糊屏）。
                </li>
                <li>
                  左侧双击或切到<strong>关系探索</strong>，只看单点邻域。
                </li>
              </ol>
              <p>
                重生：<code>npm run codegraph:gen</code>
              </p>
            </div>
          ) : (
            <dl className="codegraph-detail">
              <dt>Label</dt>
              <dd>{selected.label}</dd>
              <dt>Kind</dt>
              <dd>{selected.kind}</dd>
              <dt>Ref</dt>
              <dd>
                <code>{selected.ref_id || '—'}</code>
              </dd>
              {selected.summary ? (
                <>
                  <dt>Summary</dt>
                  <dd>{selected.summary}</dd>
                </>
              ) : null}
              <dt>操作</dt>
              <dd>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => enterExplore(selected.id)}
                >
                  以此为中心探索
                </button>
              </dd>
              <dt>关系</dt>
              <dd>
                <ul className="codegraph-neighbor-list">
                  {links.length === 0 ? (
                    <li>无边（当前全览层可能未包含对端节点）</li>
                  ) : (
                    links.map(({ edge, other, direction }) => (
                      <li key={edge.id}>
                        <button
                          type="button"
                          className="linkish"
                          onClick={() => {
                            setSelectedId(other.id)
                            if (mode === 'explore') setFocusId(other.id)
                          }}
                          onDoubleClick={() => enterExplore(other.id)}
                        >
                          <span className="codegraph-dir">
                            {direction === 'out' ? '→' : '←'}
                          </span>{' '}
                          <span className="codegraph-rel">{edge.relation}</span>{' '}
                          {other.label}
                          <span className="codegraph-rel-kind">
                            {' '}
                            ({other.kind})
                          </span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </dd>
            </dl>
          )}
        </aside>
      </div>
    </div>
  )
}
