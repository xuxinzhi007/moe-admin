import type { ReactNode } from 'react'
import { DataEnvBar } from '../components/DataEnvBar'
import { PageInsightStrip } from '../components/PageInsightStrip'
import { PageMessage } from '../components/PageMessage'
import { AdminPanel } from './AdminPanel'
import { AdminPagination } from './AdminPagination'
import { PageHead } from './PageHead'

export type ListPageMetric = {
  label: string
  value: string | number
  hint?: string
}

type ListPageBanner = {
  message: string
  tone?: 'ok' | 'err' | 'warn'
  onClose?: () => void
}

type ListPageLayoutProps = {
  title: string
  description?: string
  envNote?: string
  metrics?: ListPageMetric[]
  headActions?: ReactNode
  toolbar?: ReactNode
  banner?: ListPageBanner
  error?: string
  children: ReactNode
  pagination?: {
    page: number
    totalPages: number
    total: number
    onPageChange: (page: number) => void
  }
}

/** 列表 CRUD 页标准骨架（原型 A） */
export function ListPageLayout({
  title,
  description,
  envNote,
  metrics,
  headActions,
  toolbar,
  banner,
  error,
  children,
  pagination,
}: ListPageLayoutProps) {
  return (
    <>
      <PageHead title={title} description={description} actions={headActions} />
      {envNote ? <DataEnvBar note={envNote} /> : null}
      {metrics && metrics.length > 0 ? <PageInsightStrip items={metrics} /> : null}
      {banner?.message ? (
        <PageMessage message={banner.message} tone={banner.tone} onClose={banner.onClose} />
      ) : null}
      <AdminPanel>
        {toolbar}
        {error ? <p className="text-danger">{error}</p> : null}
        {children}
        {pagination && pagination.totalPages > 1 ? (
          <AdminPagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            onPageChange={pagination.onPageChange}
          />
        ) : null}
      </AdminPanel>
    </>
  )
}
