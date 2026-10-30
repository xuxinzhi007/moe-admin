import type { ReactNode } from 'react'

export type AdminTableColumn<T> = {
  key: string
  header: ReactNode
  render: (row: T) => ReactNode
  headerClassName?: string
  cellClassName?: string
}

type AdminTableProps<T> = {
  columns: AdminTableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  loading?: boolean
  emptyText?: string
  loadingText?: string
  compact?: boolean
}

export function AdminTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  emptyText = '暂无数据',
  loadingText = '加载中…',
  compact = false,
}: AdminTableProps<T>) {
  const colSpan = columns.length

  return (
    <div className="table-wrap">
      <table className={`data-table${compact ? ' compact' : ''}`}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.headerClassName}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={colSpan} className="muted">
                {loadingText}
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="muted">
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((col) => (
                  <td key={col.key} className={col.cellClassName}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
