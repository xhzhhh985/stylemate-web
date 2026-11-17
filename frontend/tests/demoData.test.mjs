import assert from 'node:assert/strict'
import test from 'node:test'
import { addNewDemoItems, demoItems, demoOutfits } from '../src/demoData.ts'

test('示例数据覆盖四季，整套穿搭只引用同季节的示例衣物', () => {
  assert.equal(demoItems.length, 33)
  assert.equal(demoOutfits.length, 13)
  for (const season of ['春', '夏', '秋', '冬']) {
    assert.ok(demoOutfits.some(outfit => outfit.season === season))
  }
  for (const outfit of demoOutfits) {
    assert.ok(outfit.itemIds.length >= 2)
    for (const id of outfit.itemIds) {
      const item = demoItems.find(candidate => candidate.id === id)
      assert.ok(item, `示例穿搭 ${outfit.title} 引用了不存在的衣物 ${id}`)
      assert.ok(item.season === outfit.season || item.season === '四季', `${outfit.title} 混入其他季节`)
    }
  }
})

test('给已有衣橱补样本时保留用户衣物与旧样本的删除结果', () => {
  const personal = { id: 999, name: '我录入的衣服' }
  const merged = addNewDemoItems([personal, demoItems[0]], demoItems)
  assert.equal(merged[0], personal)
  assert.equal(merged.some(item => item.id === 2), false)
  assert.equal(merged.filter(item => item.id === 7).length, 1)
  assert.equal(addNewDemoItems(merged, demoItems).filter(item => item.id === 7).length, 1)
})
