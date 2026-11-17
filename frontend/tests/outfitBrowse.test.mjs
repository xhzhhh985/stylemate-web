import assert from 'node:assert/strict'
import test from 'node:test'
import { publishedOutfits, searchOutfits, toggleComparedOutfit } from '../src/outfitBrowse.ts'

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

test('对比最多选择两套，再点已选项可取消', () => {
  assert.deepEqual(toggleComparedOutfit([1], 2), [1, 2])
  assert.deepEqual(toggleComparedOutfit([1, 2], 3), [1, 2])
  assert.deepEqual(toggleComparedOutfit([1, 2], 1), [2])
})

test('私人穿搭不会进入社区列表', () => {
  assert.deepEqual(publishedOutfits([{ id: 1, published: false }, { id: 2, published: true }]), [{ id: 2, published: true }])
})
