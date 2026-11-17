import assert from 'node:assert/strict'
import test from 'node:test'
import { matchesOutfit, parseTextTarget } from '../src/matchRules.ts'

const categories = ['上衣', '下装', '连衣裙', '外套', '鞋子', '配饰']

test('无衣物信息的文字不能生成搭配', () => {
  assert.equal(parseTextTarget('你好', categories), null)
  assert.equal(parseTextTarget('随便输入abc123', categories), null)
  assert.equal(parseTextTarget('  ', categories), null)
})

test('有效关键词可以生成筛选条件', () => {
  assert.deepEqual(parseTextTarget('绿', categories), { name: '绿', category: '', color: '绿', season: '' })
  assert.deepEqual(parseTextTarget('秋季', categories), { name: '秋季', category: '', color: '', season: '秋' })
  assert.deepEqual(parseTextTarget('春季绿色上衣', categories), { name: '春季绿色上衣', category: '上衣', color: '绿', season: '春' })
})

test('只输入绿也能找到包含绿色衣物的搭配', () => {
  assert.equal(matchesOutfit({ category: '', color: '绿', season: '' }, springOutfit), true)
  assert.equal(matchesOutfit({ category: '', color: '红', season: '' }, springOutfit), false)
})

test('衣物名称的一部分也可以搜索穿搭', () => {
  const target = parseTextTarget('针织', categories, ['薄荷绿针织上衣'])
  assert.deepEqual(target, { name: '针织', category: '', color: '', season: '', keyword: '针织' })
  assert.equal(matchesOutfit(target, { season: '春', garments: [{ name: '薄荷绿针织上衣', category: '上衣', color: '绿', season: '春' }] }), true)
  assert.equal(parseTextTarget('你好', categories, ['薄荷绿针织上衣']), null)
})

test('只上传整套照片的穿搭按主色调和季节匹配', () => {
  const photoOutfit = { season: '秋', color: '绿', garments: [] }
  assert.equal(matchesOutfit({ category: '', color: '绿', season: '秋' }, photoOutfit), true)
  assert.equal(matchesOutfit({ category: '', color: '红', season: '秋' }, photoOutfit), false)
  assert.equal(matchesOutfit({ category: '上衣', color: '', season: '秋' }, photoOutfit), false)
})

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
