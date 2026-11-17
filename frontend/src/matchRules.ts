export type MatchTarget = { category: string; color: string; season: string }
export type MatchGarment = { category: string; color: string; season: string }
export type MatchOutfit = { season: string; garments: MatchGarment[] }
export type TextTarget = MatchTarget & { name: string }

export function parseTextTarget(value: string, categories: readonly string[]): TextTarget | null {
  const name = value.trim()
  if (!name) return null

  const category = categories.find(word => name.includes(word)) ?? (name.includes('裤') ? '下装' : name.includes('裙') ? '连衣裙' : '')
  const color = ['白', '黑', '绿', '蓝', '棕', '灰', '红'].find(word => name.includes(word)) ?? ''
  const season = ['春', '夏', '秋', '冬'].find(word => name.includes(word)) ?? ''
  if (!category && !color && !season) return null

  return { name, category, color, season }
}

export function matchesOutfit(target: MatchTarget, outfit: MatchOutfit): boolean {
  if (target.season && outfit.season !== target.season && outfit.season !== '四季') return false

  return outfit.garments.some(item =>
    (!target.category || item.category === target.category) &&
    (!target.color || item.color === target.color) &&
    (!target.season || item.season === target.season || item.season === '四季'),
  )
}
