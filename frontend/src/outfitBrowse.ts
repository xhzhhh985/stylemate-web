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

export function toggleComparedOutfit(ids: readonly number[], id: number): number[] {
  if (ids.includes(id)) return ids.filter(selectedId => selectedId !== id)
  return ids.length < 2 ? [...ids, id] : [...ids]
}
