type AdminPaginationProps = {
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
}

export function AdminPagination({
  page,
  totalPages,
  total,
  onPageChange,
}: AdminPaginationProps) {
  return (
    <div className="pager">
      <button
        type="button"
        className="btn btn-ghost"
        disabled={page <= 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
      >
        上一页
      </button>
      <span className="muted">
        {page} / {totalPages} · 共 {total} 条
      </span>
      <button
        type="button"
        className="btn btn-ghost"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        下一页
      </button>
    </div>
  )
}
