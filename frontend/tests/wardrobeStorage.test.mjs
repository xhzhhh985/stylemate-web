import assert from 'node:assert/strict'
import test from 'node:test'
import { demoItems } from '../src/demoData.ts'
import { loadWardrobe, wardrobeKey } from '../src/wardrobeStorage.ts'

function memoryStorage() {
  const values = new Map()
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value) },
  }
}

test('游客拿到演示样本，新注册账号从空衣橱开始', () => {
  const storage = memoryStorage()
  assert.equal(loadWardrobe('guest', storage).length, demoItems.length)
  assert.deepEqual(loadWardrobe('user-7', storage), [])
  assert.equal(storage.getItem(wardrobeKey('user-7')), null)
})

test('旧账号只清理未修改的样本，保留个人衣物与改过的样本', () => {
  const storage = memoryStorage()
  const personal = { ...demoItems[0], id: 999, name: '自己的毛衣' }
  const edited = { ...demoItems[1], name: '我改名的裤子' }
  const withPhoto = { ...demoItems[2], imageUrl: 'data:image/png;base64,example' }
  storage.setItem(wardrobeKey('user-8'), JSON.stringify([demoItems[0], demoItems[7], personal, edited, withPhoto]))
  assert.deepEqual(loadWardrobe('user-8', storage), [personal, edited, withPhoto])
  assert.deepEqual(loadWardrobe('user-8', storage), [personal, edited, withPhoto])
})

test('游客旧版衣橱仅补一次新样本，之后删除样本不会重新出现', () => {
  const storage = memoryStorage()
  storage.setItem(wardrobeKey('guest'), JSON.stringify(demoItems.slice(0, 6)))
  const first = loadWardrobe('guest', storage)
  assert.equal(first.length, demoItems.length)
  storage.setItem(wardrobeKey('guest'), JSON.stringify(first.filter(item => item.id !== 7)))
  assert.equal(loadWardrobe('guest', storage).some(item => item.id === 7), false)
})
