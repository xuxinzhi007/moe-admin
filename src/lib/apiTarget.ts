const LS_API_TARGET = 'moe_admin_api_target'

export type ApiTarget = 'local' | 'cloud'

export function loadApiTarget(): ApiTarget {
  const v = localStorage.getItem(LS_API_TARGET)
  return v === 'cloud' ? 'cloud' : 'local'
}

export function saveApiTarget(target: ApiTarget) {
  localStorage.setItem(LS_API_TARGET, target)
}

export function apiTargetLabel(target: ApiTarget) {
  return target === 'cloud' ? '云端 API' : '本机 API'
}
