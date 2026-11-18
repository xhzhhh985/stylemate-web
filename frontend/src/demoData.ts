export type DemoGarment = {
  id: number; name: string; category: '上衣' | '下装' | '连衣裙' | '外套' | '鞋子' | '配饰'
  color: string; season: string; style: string; tone: string; surface: string; imageUrl?: string
}

export const demoItems: DemoGarment[] = [
  { id: 1, name: '薄荷绿针织上衣', category: '上衣', color: '绿', season: '春', style: '休闲', tone: '#7ba993', surface: '#e3ede5' },
  { id: 2, name: '米白色直筒裤', category: '下装', color: '白', season: '春', style: '通勤', tone: '#e8dfcb', surface: '#f1e9da' },
  { id: 3, name: '深蓝色牛仔外套', category: '外套', color: '蓝', season: '春', style: '休闲', tone: '#54758b', surface: '#dbe5ea' },
  { id: 4, name: '焦糖色乐福鞋', category: '鞋子', color: '棕', season: '春', style: '通勤', tone: '#a87a59', surface: '#ece2d7' },
  { id: 5, name: '奶油白连衣裙', category: '连衣裙', color: '白', season: '夏', style: '简约', tone: '#e5dfd0', surface: '#eee9dc' },
  { id: 6, name: '森林绿托特包', category: '配饰', color: '绿', season: '四季', style: '通勤', tone: '#577f69', surface: '#dce7dc' },
  { id: 7, name: '珊瑚红薄开衫', category: '外套', color: '红', season: '春', style: '甜美', tone: '#bb7671', surface: '#f3e2df' },
  { id: 8, name: '浅灰百褶半裙', category: '下装', color: '灰', season: '春', style: '甜美', tone: '#a5aba8', surface: '#eceeec' },
  { id: 9, name: '白色帆布鞋', category: '鞋子', color: '白', season: '春', style: '休闲', tone: '#e8dfcb', surface: '#f1e9da' },
  { id: 10, name: '浅绿短款夹克', category: '外套', color: '绿', season: '春', style: '休闲', tone: '#7ba993', surface: '#e3ede5' },
  { id: 11, name: '天蓝亚麻衬衫', category: '上衣', color: '蓝', season: '夏', style: '简约', tone: '#6996aa', surface: '#e2eef2' },
  { id: 12, name: '白色棉麻短裤', category: '下装', color: '白', season: '夏', style: '休闲', tone: '#e8dfcb', surface: '#f1e9da' },
  { id: 13, name: '棕色编织凉鞋', category: '鞋子', color: '棕', season: '夏', style: '休闲', tone: '#a87a59', surface: '#ece2d7' },
  { id: 14, name: '海蓝色吊带连衣裙', category: '连衣裙', color: '蓝', season: '夏', style: '甜美', tone: '#54758b', surface: '#dbe5ea' },
  { id: 15, name: '白色帆布小包', category: '配饰', color: '白', season: '夏', style: '休闲', tone: '#e8dfcb', surface: '#f1e9da' },
  { id: 16, name: '黑色宽松短袖', category: '上衣', color: '黑', season: '夏', style: '休闲', tone: '#414849', surface: '#e3e6e5' },
  { id: 17, name: '蓝色牛仔半裙', category: '下装', color: '蓝', season: '夏', style: '复古', tone: '#54758b', surface: '#dbe5ea' },
  { id: 18, name: '焦糖色针织毛衣', category: '上衣', color: '棕', season: '秋', style: '通勤', tone: '#a87a59', surface: '#ece2d7' },
  { id: 19, name: '黑色直筒牛仔裤', category: '下装', color: '黑', season: '秋', style: '休闲', tone: '#414849', surface: '#e3e6e5' },
  { id: 20, name: '棕色短靴', category: '鞋子', color: '棕', season: '秋', style: '通勤', tone: '#a87a59', surface: '#ece2d7' },
  { id: 21, name: '森林绿风衣', category: '外套', color: '绿', season: '秋', style: '通勤', tone: '#577f69', surface: '#dce7dc' },
  { id: 22, name: '棕色单肩包', category: '配饰', color: '棕', season: '秋', style: '通勤', tone: '#a87a59', surface: '#ece2d7' },
  { id: 23, name: '酒红色长袖衬衫', category: '上衣', color: '红', season: '秋', style: '复古', tone: '#9f5d63', surface: '#f0e1e3' },
  { id: 24, name: '烟灰色阔腿裤', category: '下装', color: '灰', season: '秋', style: '通勤', tone: '#9da6a3', surface: '#e7eae8' },
  { id: 25, name: '米白高领毛衣', category: '上衣', color: '白', season: '冬', style: '简约', tone: '#e8dfcb', surface: '#f1e9da' },
  { id: 26, name: '黑色羊毛长裤', category: '下装', color: '黑', season: '冬', style: '正式', tone: '#414849', surface: '#e3e6e5' },
  { id: 27, name: '黑色皮质长靴', category: '鞋子', color: '黑', season: '冬', style: '通勤', tone: '#414849', surface: '#e3e6e5' },
  { id: 28, name: '灰色羊毛大衣', category: '外套', color: '灰', season: '冬', style: '简约', tone: '#9da6a3', surface: '#e7eae8' },
  { id: 29, name: '红色针织围巾', category: '配饰', color: '红', season: '冬', style: '休闲', tone: '#b8746f', surface: '#f3e2df' },
  { id: 30, name: '深蓝圆领毛衣', category: '上衣', color: '蓝', season: '冬', style: '休闲', tone: '#54758b', surface: '#dbe5ea' },
  { id: 31, name: '棕色灯芯绒长裤', category: '下装', color: '棕', season: '冬', style: '复古', tone: '#a87a59', surface: '#ece2d7' },
  { id: 32, name: '黑色简约手提包', category: '配饰', color: '黑', season: '四季', style: '简约', tone: '#414849', surface: '#e3e6e5' },
  { id: 33, name: '白色休闲运动鞋', category: '鞋子', color: '白', season: '四季', style: '运动', tone: '#e8dfcb', surface: '#f1e9da' },
]

export const demoOutfits = [
  { id: 1, title: '春日轻通勤', scene: '上班', season: '春', color: '绿', style: '通勤', description: '薄荷绿与米白色的清爽组合。', author: '小橙（示例）', itemIds: [1, 2, 4, 6] },
  { id: 2, title: '周末漫游', scene: '出游', season: '春', color: '蓝', style: '休闲', description: '牛仔外套搭配浅色裤装。', author: '林间风（示例）', itemIds: [1, 2, 3, 9] },
  { id: 3, title: '春日红灰', scene: '约会', season: '春', color: '红', style: '甜美', description: '红色开衫和浅灰半裙，适合春季约会。', author: '米粒（示例）', itemIds: [7, 1, 8, 9] },
  { id: 4, title: '清爽夏日', scene: '约会', season: '夏', color: '白', style: '简约', description: '奶油白连衣裙配凉鞋和小包。', author: '米粒（示例）', itemIds: [5, 13, 15] },
  { id: 5, title: '海边轻装', scene: '出游', season: '夏', color: '蓝', style: '休闲', description: '亚麻衬衫和短裤适合炎热天气。', author: '阿蓝（示例）', itemIds: [11, 12, 13, 15] },
  { id: 6, title: '夏夜蓝裙', scene: '聚会', season: '夏', color: '蓝', style: '甜美', description: '海蓝色连衣裙配编织凉鞋。', author: '阿蓝（示例）', itemIds: [14, 13, 15] },
  { id: 7, title: '牛仔半裙日常', scene: '逛街', season: '夏', color: '黑', style: '复古', description: '黑色短袖与牛仔半裙的轻松搭配。', author: '小夏（示例）', itemIds: [16, 17, 13] },
  { id: 8, title: '秋日森林通勤', scene: '上班', season: '秋', color: '绿', style: '通勤', description: '绿色风衣与焦糖色针织的秋季层次。', author: '木木（示例）', itemIds: [18, 19, 20, 21, 22] },
  { id: 9, title: '酒红复古', scene: '聚会', season: '秋', color: '红', style: '复古', description: '酒红衬衫配烟灰阔腿裤。', author: '木木（示例）', itemIds: [23, 24, 20, 22] },
  { id: 10, title: '秋季简约办公', scene: '上班', season: '秋', color: '灰', style: '简约', description: '棕色毛衣和灰色长裤，干净利落。', author: '小橙（示例）', itemIds: [18, 24, 20, 32] },
  { id: 11, title: '冬日暖色', scene: '上班', season: '冬', color: '白', style: '简约', description: '米白毛衣与灰色大衣，红围巾作点缀。', author: '冬冬（示例）', itemIds: [25, 26, 27, 28, 29] },
  { id: 12, title: '蓝棕冬日', scene: '出游', season: '冬', color: '蓝', style: '休闲', description: '深蓝毛衣配棕色灯芯绒裤。', author: '冬冬（示例）', itemIds: [30, 31, 27, 28] },
  { id: 13, title: '冬季黑白通勤', scene: '上班', season: '冬', color: '黑', style: '正式', description: '黑白基础款搭配黑靴与手提包。', author: '阿简（示例）', itemIds: [25, 26, 27, 32] },
]

/** Older guest demos receive new sample IDs once without restoring deleted old items. */
export function addNewDemoItems<T extends { id: number }>(saved: readonly T[], samples: readonly T[]): T[] {
  const existingIds = new Set(saved.map(item => item.id))
  return [...saved, ...samples.filter(item => item.id > 6 && !existingIds.has(item.id))]
}

/** Remove untouched sample items from an account while retaining edited and personal items. */
export function removeUnchangedDemoItems(saved: readonly DemoGarment[], samples: readonly DemoGarment[]): DemoGarment[] {
  const byId = new Map(samples.map(item => [item.id, item]))
  return saved.filter(item => {
    const sample = byId.get(item.id)
    if (!sample) return true
    const keys = new Set([...Object.keys(sample), ...Object.keys(item)])
    return [...keys].some(key => item[key as keyof DemoGarment] !== sample[key as keyof DemoGarment])
  })
}
