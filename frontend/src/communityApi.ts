export type CommunityGarment = {
  id: number
  name: string
  category: string
  color: string
  season: string
  style: string
  tone: string
  surface: string
  imageUrl?: string | null
}

export type CommunityPost = {
  id: number
  ownerId: number
  author: string
  title: string
  scene: string
  season: string
  color: string | null
  style: string | null
  description: string
  imageUrl: string | null
  garments: CommunityGarment[]
  createdAt: string
}

export type CommunityDraft = Pick<CommunityPost, 'title' | 'scene' | 'season' | 'description' | 'garments'> & {
  color?: string
  style?: string
  imageUrl?: string
}

async function communityRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/v1/community${path}`, {
    ...options,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  if (!response.ok) {
    if (response.status === 401) throw new Error('登录已过期，请重新登录')
    if (response.status === 422) {
      const body = await response.json().catch(() => null)
      throw new Error(typeof body?.detail === 'string' ? body.detail : '穿搭信息或图片不符合要求')
    }
    throw new Error(`社区服务请求失败（${response.status}）`)
  }
  return response.json() as Promise<T>
}

export function listCommunityPosts(): Promise<CommunityPost[]> {
  return communityRequest('/outfits')
}

export function createCommunityPost(outfit: CommunityDraft): Promise<CommunityPost> {
  return communityRequest('/outfits', { method: 'POST', body: JSON.stringify(outfit) })
}
