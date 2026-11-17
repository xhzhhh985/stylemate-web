import assert from 'node:assert/strict'
import test from 'node:test'
import { matchesOutfit } from '../src/matchRules.ts'

const springOutfit = {
  season: '春',
  garments: [
    { category: '上衣', color: '绿', season: '春' },
    { category: '配饰', color: '绿', season: '四季' },
  ],
}

test('秋季搜索不会因四季配饰而返回春季搭配', () => {
  assert.equal(matchesOutfit({ category: '', color: '', season: '秋' }, springOutfit), false)
})

test('春季搜索仍能返回春季搭配', () => {
  assert.equal(matchesOutfit({ category: '', color: '', season: '春' }, springOutfit), true)
})

test('品类、颜色和季节必须由同一件衣物满足', () => {
  assert.equal(matchesOutfit({ category: '上衣', color: '绿', season: '春' }, springOutfit), true)
  assert.equal(matchesOutfit({ category: '上衣', color: '白', season: '春' }, springOutfit), false)
})
