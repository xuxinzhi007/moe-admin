const TOKEN_KEY = 'moe_admin_token_v1'
const USER_KEY = 'moe_admin_user_v1'

export type StoredAdminUser = {
  admin_id: number
  username: string
  role: string
}

export function loadAdminToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export function saveAdminSession(token: string, user: StoredAdminUser) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function loadAdminUser(): StoredAdminUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoredAdminUser
  } catch {
    return null
  }
}

export function clearAdminSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}
