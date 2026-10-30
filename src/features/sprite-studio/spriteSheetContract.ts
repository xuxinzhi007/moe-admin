export type ExportContractIssue = { code: string; message: string }

export type ExportContractInput = {
  width: number
  height: number
  frameWidth: number
  frameHeight: number
  columns: number
  rows: number
  frameCount: number
  expectedFrameCount: number
  visibleFrameCount: number
  expectedVisibleFrameCount: number
}

export function validateExportContract(input: ExportContractInput): ExportContractIssue[] {
  const issues: ExportContractIssue[] = []
  if (!Number.isInteger(input.width) || input.width <= 0) issues.push({ code: 'sheet-width-invalid', message: '导出 Sheet 宽度必须是正整数' })
  if (!Number.isInteger(input.height) || input.height <= 0) issues.push({ code: 'sheet-height-invalid', message: '导出 Sheet 高度必须是正整数' })
  if (input.width !== input.frameWidth * input.columns) issues.push({ code: 'sheet-width-mismatch', message: 'Sheet 宽度与网格列数不一致' })
  if (input.height !== input.frameHeight * input.rows) issues.push({ code: 'sheet-height-mismatch', message: 'Sheet 高度与网格行数不一致' })
  if (input.frameCount !== input.expectedFrameCount) issues.push({ code: 'frame-count-mismatch', message: '导出帧数量与动画布局不一致' })
  if (input.visibleFrameCount !== input.expectedVisibleFrameCount) issues.push({ code: 'visible-frame-count-mismatch', message: '存在内容为空的导出帧' })
  if (input.frameCount <= 0) issues.push({ code: 'frame-count-empty', message: '导出结果没有可用帧' })
  return issues
}

export function hasVisiblePixel(context: CanvasRenderingContext2D, width: number, height: number, x = 0, y = 0): boolean {
  const pixels = context.getImageData(x, y, width, height).data
  for (let index = 3; index < pixels.length; index += 4) if (pixels[index] > 0) return true
  return false
}
