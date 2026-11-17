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
