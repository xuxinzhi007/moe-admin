import { useEffect } from 'react'

/** 抽屉/蒙版：Esc 关闭；避免蒙版挡住页面却无法操作。 */
export function useDrawerDismiss(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
}
