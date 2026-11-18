export type AuthUser = { id: number; username: string; nickname: string; avatarUrl: string | null; created_at: string }

export class AuthApiError extends Error {
  constructor(message: string, readonly status: number) { super(message) }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/v1/auth${path}`, {
    ...options,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const detail = typeof body?.detail === 'string' ? body.detail : null
    if (response.status === 401) throw new AuthApiError(detail ?? '用户名或密码错误，或登录已过期', 401)
    if (response.status === 409) throw new AuthApiError('用户名已被使用', 409)
    if (response.status === 422) throw new AuthApiError(detail ?? '请检查输入内容或图片格式', 422)
    throw new AuthApiError(detail ?? `请求失败（${response.status}）`, response.status)
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>
}

export function register(username: string, password: string, nickname: string): Promise<AuthUser> {
  return request('/register', { method: 'POST', body: JSON.stringify({ username, password, nickname }) })
}

export function login(username: string, password: string): Promise<AuthUser> {
  return request('/login', { method: 'POST', body: JSON.stringify({ username, password }) })
}

export function getMe(): Promise<AuthUser> {
  return request('/me')
}

export function updateNickname(nickname: string): Promise<AuthUser> {
  return request('/me', { method: 'PATCH', body: JSON.stringify({ nickname }) })
}

export function uploadAvatar(imageUrl: string): Promise<AuthUser> {
  return request('/me/avatar', { method: 'PUT', body: JSON.stringify({ imageUrl }) })
}

export function removeAvatar(): Promise<AuthUser> {
  return request('/me/avatar', { method: 'DELETE' })
}

export function logout(): Promise<void> {
  return request('/logout', { method: 'POST' })
}
