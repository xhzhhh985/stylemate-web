export type BrowsableOutfit = {
  title: string
  scene: string
  season: string
  color?: string
  style?: string
  description: string
  author: string
  garments: { name: string; category: string; color: string; season: string; style: string }[]
}

export function searchOutfits<T extends BrowsableOutfit>(outfits: readonly T[], query: string): T[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return [...outfits]

  return outfits.filter(outfit => {
    const fields = [outfit.title, outfit.scene, outfit.season, outfit.color, outfit.style, outfit.description, outfit.author,
      ...outfit.garments.flatMap(item => [item.name, item.category, item.color, item.season, item.style])]
      .filter((value): value is string => Boolean(value))
      .map(value => value.toLocaleLowerCase())
    return terms.every(term => fields.some(value => value.includes(term)))
  })
}

export function publishedOutfits<T extends { published: boolean }>(outfits: readonly T[]): T[] {
  return outfits.filter(outfit => outfit.published)
}

export function comparisonCandidates<T extends { id: number; serverId?: number }>(outfits: readonly T[], baseId: number): T[] {
  const base = outfits.find(outfit => outfit.id === baseId)
  const seenServerIds = new Set<number>()
  return outfits.filter(outfit => {
    if (outfit.id === baseId || (base?.serverId && outfit.serverId === base.serverId)) return false
    if (outfit.serverId) {
      if (seenServerIds.has(outfit.serverId)) return false
      seenServerIds.add(outfit.serverId)
    }
    return true
  })
}

export type CompareFilters = {
  source: 'all' | 'mine' | 'community' | 'generated'
  season: string
  garmentCategory: string
  query: string
}

export function filterComparisonCandidates<T extends BrowsableOutfit & { id: number; demo?: boolean; serverId?: number; generated?: boolean }>(
  candidates: readonly T[], mineIds: readonly number[], filters: CompareFilters,
): T[] {
  const mine = new Set(mineIds)
  return searchOutfits(candidates.filter(outfit =>
    (filters.source === 'all'
      || (filters.source === 'mine' && mine.has(outfit.id))
      || (filters.source === 'community' && Boolean(outfit.demo || outfit.serverId))
      || (filters.source === 'generated' && outfit.generated))
    && (filters.season === '全部' || outfit.season === filters.season || outfit.season === '四季')
    && (filters.garmentCategory === '全部' || outfit.garments.some(item => item.category === filters.garmentCategory)),
  ), filters.query)
}
