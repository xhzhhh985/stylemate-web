import priors from './data/compatibility.json' with { type: 'json' }
import type { MatchTarget } from './matchRules'

export type WardrobeItem = {
  id: number
  name: string
  category: string
  color: string
  season: string
  style: string
}

export type WardrobeLook<T extends WardrobeItem> = { garments: T[]; score: number }

const pairCounts = priors.pairCounts as Record<string, number>
const categoryCounts = priors.categoryCounts as Record<string, number>

function pairScore(left: string, right: string): number {
  const key = [left, right].sort().join('|')
  return (pairCounts[key] ?? 0) / Math.max(1, categoryCounts[left] ?? 1)
}

function inSeason(item: WardrobeItem, season: string): boolean {
  return !season || item.season === season || item.season === '四季'
}

function fitsAnchor(item: WardrobeItem, target: MatchTarget): boolean {
  return (!target.category || item.category === target.category)
    && (!target.color || item.color === target.color)
    && inSeason(item, target.season)
    && (!target.keyword || `${item.name}${item.style}`.includes(target.keyword))
}

function compatibleSeason(left: WardrobeItem, right: WardrobeItem): boolean {
  return left.season === '四季' || right.season === '四季' || left.season === right.season
}

function lookScore(items: WardrobeItem[], anchor: WardrobeItem): number {
  let score = 0
  for (const item of items) {
    if (item.id === anchor.id) continue
    score += pairScore(anchor.category, item.category)
    if (item.style === anchor.style) score += 0.12
    if (item.color === anchor.color) score += 0.05
  }
  return score
}

/** Recommend only real wardrobe items. Dataset counts rank options; garment rules keep outfits wearable. */
export function recommendFromWardrobe<T extends WardrobeItem>(
  items: readonly T[], target: MatchTarget, anchorId?: number, limit = 8,
): WardrobeLook<T>[] {
  const anchors = items.filter(item => (!anchorId || item.id === anchorId) && fitsAnchor(item, target))
  const found = new Map<string, WardrobeLook<T>>()

  for (const anchor of anchors) {
    const pool = items.filter(item => item.id !== anchor.id && inSeason(item, target.season) && compatibleSeason(anchor, item))
    const options = (category: string) => pool.filter(item => item.category === category).slice(0, 4)
    const bases: T[][] = []
    if (anchor.category === '连衣裙') bases.push([anchor])
    else if (anchor.category === '上衣') bases.push(...options('下装').map(item => [anchor, item]))
    else if (anchor.category === '下装') bases.push(...options('上衣').map(item => [item, anchor]))
    else {
      const tops = options('上衣')
      const bottoms = options('下装')
      for (const top of tops) for (const bottom of bottoms) {
        if (compatibleSeason(top, bottom)) bases.push([top, bottom])
      }
      bases.push(...options('连衣裙').map(item => [item]))
    }

    for (const base of bases) {
      if (!base.every(item => compatibleSeason(anchor, item))) continue
      const selected = [...base]
      if (!selected.some(item => item.id === anchor.id)) selected.push(anchor)
      for (const category of ['鞋子', '外套', '配饰']) {
        if (selected.some(item => item.category === category)) continue
        const choice = options(category)
          .filter(item => selected.every(other => compatibleSeason(other, item)))
          .sort((a, b) => pairScore(anchor.category, b.category) - pairScore(anchor.category, a.category))[0]
        if (choice) selected.push(choice)
      }
      if (selected.length < 2) continue
      const key = selected.map(item => item.id).sort((a, b) => a - b).join(',')
      const score = lookScore(selected, anchor)
      if (!found.has(key) || found.get(key)!.score < score) found.set(key, { garments: selected, score })
    }
  }

  return [...found.values()].sort((a, b) => b.score - a.score).slice(0, limit)
}

/** A selected set must fit the one-piece or top-and-bottom outfit structure. */
export function wardrobeSelectionIssue<T extends WardrobeItem>(items: readonly T[], selectedIds: readonly number[]): string | null {
  if (!selectedIds.length) return '请先从衣橱选择衣物。'
  const selected = [...new Set(selectedIds)].map(id => items.find(item => item.id === id))
  if (selected.some(item => !item)) return '选择的衣物已不在衣橱中，请重新选择。'
  const garments = selected as T[]
  const seasons = new Set(garments.map(item => item.season).filter(season => season !== '四季'))
  if (seasons.size > 1) return '所选衣物的季节不一致，请调整后再推荐。'
  if (garments.some(item => item.category === '连衣裙') && garments.some(item => ['上衣', '下装'].includes(item.category))) {
    return '连衣裙不能与上衣或下装同时作为这一套的基础衣物。'
  }
  const categories = new Set<string>()
  for (const item of garments) {
    if (categories.has(item.category)) return `同一套暂不支持选择多件${item.category}，请保留一件。`
    categories.add(item.category)
  }
  return null
}

/** Keep every selected item in every result; never substitute another wardrobe item for it. */
export function recommendFromWardrobeSelection<T extends WardrobeItem>(
  items: readonly T[], selectedIds: readonly number[], limit = 8,
): WardrobeLook<T>[] {
  if (wardrobeSelectionIssue(items, selectedIds)) return []
  const required = [...new Set(selectedIds)].map(id => items.find(item => item.id === id)!)
  const requiredSet = new Set(required.map(item => item.id))
  const ordered = [...required, ...items.filter(item => !requiredSet.has(item.id))]
  const anchor = required[0]!
  return recommendFromWardrobe(ordered, anchor, anchor.id, Number.POSITIVE_INFINITY)
    .filter(look => required.every(item => look.garments.some(garment => garment.id === item.id)))
    .slice(0, limit)
}
