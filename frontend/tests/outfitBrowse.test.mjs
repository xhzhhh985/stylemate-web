import assert from 'node:assert/strict'
import test from 'node:test'
import { comparisonCandidates, filterComparisonCandidates, publishedOutfits, searchOutfits } from '../src/outfitBrowse.ts'

const outfits = [
  { title: '森林通勤', scene: '上班', season: '秋', color: '绿', style: '通勤', description: '绿色外套配米白裤', author: '小林', garments: [{ name: '薄荷绿外套', category: '外套', color: '绿', season: '秋', style: '通勤' }] },
  { title: '夏日海边', scene: '出游', season: '夏', color: '蓝', style: '休闲', description: '蓝色连衣裙', author: '小夏', garments: [] },
]

test('社区关键词支持部分名称、颜色和多个词', () => {
  assert.deepEqual(searchOutfits(outfits, '绿').map(outfit => outfit.title), ['森林通勤'])
  assert.deepEqual(searchOutfits(outfits, '薄荷').map(outfit => outfit.title), ['森林通勤'])
  assert.deepEqual(searchOutfits(outfits, '秋 通勤').map(outfit => outfit.title), ['森林通勤'])
  assert.deepEqual(searchOutfits(outfits, '你好'), [])
})

test('右侧候选不包含左侧穿搭', () => {
  assert.deepEqual(comparisonCandidates([{ id: 1 }, { id: 2 }, { id: 3 }], 2), [{ id: 1 }, { id: 3 }])
  assert.deepEqual(comparisonCandidates([{ id: 10, serverId: 5 }, { id: -5, serverId: 5 }, { id: 20, serverId: 6 }], 10), [{ id: 20, serverId: 6 }])
})

test('私人穿搭不会进入社区列表', () => {
  assert.deepEqual(publishedOutfits([{ id: 1, published: false }, { id: 2, published: true }]), [{ id: 2, published: true }])
})

test('对比候选可同时按来源、季节、衣物品类和关键词筛选', () => {
  const candidates = [
    { id: 1, ...outfits[0], published: false },
    { id: 2, ...outfits[1], published: true, serverId: 2 },
    { id: 3, ...outfits[0], title: '秋季自动组合', generated: true, published: false },
  ]
  const selected = filterComparisonCandidates(candidates, [1], { source: 'mine', season: '秋', garmentCategory: '外套', query: '绿' })
  assert.deepEqual(selected.map(outfit => outfit.id), [1])
  assert.deepEqual(filterComparisonCandidates(candidates, [1], { source: 'community', season: '夏', garmentCategory: '全部', query: '海边' }).map(outfit => outfit.id), [2])
  assert.deepEqual(filterComparisonCandidates(candidates, [1], { source: 'generated', season: '秋', garmentCategory: '外套', query: '自动' }).map(outfit => outfit.id), [3])
})
