import { addNewDemoItems, demoItems, removeUnchangedDemoItems, type DemoGarment } from './demoData.ts'

type StorageAccess = Pick<Storage, 'getItem' | 'setItem'>

export function wardrobeKey(scope: string): string {
  return scope === 'guest' ? 'stylemate-demo-wardrobe-v1' : `stylemate-demo-wardrobe-v1:${scope}`
}

function demoSeedKey(scope: string): string { return `stylemate-demo-seed-v2:${scope}` }
function accountCleanupKey(scope: string): string { return `stylemate-account-clean-v3:${scope}` }

export function loadWardrobe(scope: string, storage: StorageAccess): DemoGarment[] {
  const saved = storage.getItem(wardrobeKey(scope))
  if (scope !== 'guest') {
    if (!saved) return []
    const existing = JSON.parse(saved) as DemoGarment[]
    if (!Array.isArray(existing)) return []
    if (storage.getItem(accountCleanupKey(scope))) return existing
    const cleaned = removeUnchangedDemoItems(existing, demoItems)
    storage.setItem(wardrobeKey(scope), JSON.stringify(cleaned))
    storage.setItem(accountCleanupKey(scope), '1')
    return cleaned
  }
  if (!saved) {
    storage.setItem(demoSeedKey(scope), '1')
    return demoItems
  }
  const existing = JSON.parse(saved) as DemoGarment[]
  if (!Array.isArray(existing)) return demoItems
  if (storage.getItem(demoSeedKey(scope))) return existing
  const merged = addNewDemoItems(existing, demoItems)
  storage.setItem(wardrobeKey(scope), JSON.stringify(merged))
  storage.setItem(demoSeedKey(scope), '1')
  return merged
}
