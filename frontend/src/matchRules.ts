export type MatchTarget = { category: string; color: string; season: string }
export type MatchGarment = { category: string; color: string; season: string }
export type MatchOutfit = { season: string; garments: MatchGarment[] }

export function matchesOutfit(target: MatchTarget, outfit: MatchOutfit): boolean {
  if (target.season && outfit.season !== target.season && outfit.season !== '四季') return false

  return outfit.garments.some(item =>
    (!target.category || item.category === target.category) &&
    (!target.color || item.color === target.color) &&
    (!target.season || item.season === target.season || item.season === '四季'),
  )
}
