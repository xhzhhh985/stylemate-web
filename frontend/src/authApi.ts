export type AuthUser = { id: number; username: string; nickname: string; created_at: string }

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
    if (response.status === 401) throw new AuthApiError('用户名或密码错误，或登录已过期', 401)
    if (response.status === 409) throw new AuthApiError('用户名已被使用', 409)
    if (response.status === 422) throw new AuthApiError('请检查用户名、密码和昵称格式', 422)
    throw new AuthApiError(`请求失败（${response.status}）`, response.status)
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

export function logout(): Promise<void> {
  return request('/logout', { method: 'POST' })
}
