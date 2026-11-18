import assert from 'node:assert/strict'
import test from 'node:test'
import { recommendFromWardrobe, recommendFromWardrobeSelection, wardrobeSelectionIssue } from '../src/wardrobeRecommendations.ts'

const wardrobe = [
  { id: 1, name: '绿色上衣', category: '上衣', color: '绿', season: '秋', style: '通勤' },
  { id: 2, name: '黑色裤子', category: '下装', color: '黑', season: '秋', style: '通勤' },
  { id: 3, name: '白色鞋子', category: '鞋子', color: '白', season: '四季', style: '通勤' },
  { id: 4, name: '春季裙子', category: '连衣裙', color: '绿', season: '春', style: '休闲' },
  { id: 5, name: '秋季裙子', category: '连衣裙', color: '红', season: '秋', style: '通勤' },
]

test('给定上衣只组合真实衣橱衣物，并排除其他季节', () => {
  const looks = recommendFromWardrobe(wardrobe, { category: '上衣', color: '绿', season: '秋' }, 1)
  assert.ok(looks.length > 0)
  assert.ok(looks.every(look => look.garments.some(item => item.id === 1)))
  assert.ok(looks.every(look => look.garments.some(item => item.id === 2)))
  assert.ok(looks.every(look => look.garments.every(item => item.season === '秋' || item.season === '四季')))
  assert.ok(looks.every(look => look.garments.every(item => wardrobe.some(saved => saved.id === item.id))))
})

test('连衣裙不会与上衣或裤子组合，只有春季衣物不会匹配秋季', () => {
  const looks = recommendFromWardrobe(wardrobe, { category: '连衣裙', color: '红', season: '秋' }, 5)
  assert.ok(looks.length > 0)
  assert.ok(looks.every(look => look.garments.every(item => !['上衣', '下装'].includes(item.category))))
  assert.deepEqual(recommendFromWardrobe(wardrobe, { category: '连衣裙', color: '绿', season: '秋' }), [])
})

test('多选上衣、下装和鞋子时，每套都包含全部选中衣物', () => {
  const looks = recommendFromWardrobeSelection(wardrobe, [1, 2, 3])
  assert.ok(looks.length > 0)
  assert.ok(looks.every(look => [1, 2, 3].every(id => look.garments.some(item => item.id === id))))
  assert.ok(looks.every(look => look.garments.every(item => wardrobe.some(saved => saved.id === item.id))))
})

test('季节冲突和基础衣物冲突时说明原因且不生成结果', () => {
  assert.match(wardrobeSelectionIssue(wardrobe, [1, 4]), /连衣裙|季节/)
  assert.match(wardrobeSelectionIssue(wardrobe, [1, 5]), /连衣裙/)
  assert.deepEqual(recommendFromWardrobeSelection(wardrobe, [1, 4]), [])
  assert.deepEqual(recommendFromWardrobeSelection(wardrobe, [1, 5]), [])
})
