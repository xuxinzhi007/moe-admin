import type { ReactNode } from 'react'
import { DataEnvBar } from '../components/DataEnvBar'
import { PageInsightStrip } from '../components/PageInsightStrip'
import type { ListPageMetric } from './ListPageLayout'
import { PageHead } from './PageHead'

type MonitorPageLayoutProps = {
  title: string
  description?: ReactNode
  envNote?: string
  metrics?: ListPageMetric[]
  headActions?: ReactNode
  error?: string
  children: ReactNode
}

/** 监控 / 分析页标准骨架（原型 C） */
export function MonitorPageLayout({
  title,
  description,
  envNote,
  metrics,
  headActions,
  error,
  children,
}: MonitorPageLayoutProps) {
  return (
    <>
      <PageHead title={title} description={description} actions={headActions} />
      {envNote ? <DataEnvBar note={envNote} /> : null}
      {metrics && metrics.length > 0 ? <PageInsightStrip items={metrics} /> : null}
      {error ? <p className="text-danger">{error}</p> : null}
      {children}
    </>
  )
}
