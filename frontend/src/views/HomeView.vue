<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import GarmentArt from '../components/GarmentArt.vue'
import { matchesOutfit, parseTextTarget } from '../matchRules'
import { publishedOutfits, searchOutfits, toggleComparedOutfit } from '../outfitBrowse'

type Page = 'home' | 'wardrobe' | 'match' | 'community' | 'profile'
type Category = '上衣' | '下装' | '连衣裙' | '外套' | '鞋子' | '配饰'
type Garment = { id: number; name: string; category: Category; color: string; season: string; style: string; tone: string; surface: string; imageUrl?: string }
type Mode = 'item' | 'text' | 'photo'
type Outfit = { id: number; title: string; scene: string; season: string; color?: string; style?: string; description: string; imageUrl?: string; author: string; garments: Garment[]; published: boolean; demo?: boolean }

const starterItems: Garment[] = [
  { id: 1, name: '薄荷绿针织上衣', category: '上衣', color: '绿', season: '春', style: '休闲', tone: '#7ba993', surface: '#e3ede5' },
  { id: 2, name: '米白色直筒裤', category: '下装', color: '白', season: '春', style: '通勤', tone: '#e8dfcb', surface: '#f1e9da' },
  { id: 3, name: '深蓝色牛仔外套', category: '外套', color: '蓝', season: '春', style: '休闲', tone: '#54758b', surface: '#dbe5ea' },
  { id: 4, name: '焦糖色乐福鞋', category: '鞋子', color: '棕', season: '春', style: '通勤', tone: '#a87a59', surface: '#ece2d7' },
  { id: 5, name: '奶油白连衣裙', category: '连衣裙', color: '白', season: '夏', style: '简约', tone: '#e5dfd0', surface: '#eee9dc' },
  { id: 6, name: '森林绿托特包', category: '配饰', color: '绿', season: '四季', style: '通勤', tone: '#577f69', surface: '#dce7dc' },
]

function initialItems(): Garment[] {
  try {
    const saved = localStorage.getItem('stylemate-demo-wardrobe-v1')
    return saved ? (JSON.parse(saved) as Garment[]) : starterItems
  } catch {
    return starterItems
  }
}

function initialOutfits(): Outfit[] {
  try {
    const saved = localStorage.getItem('stylemate-demo-outfits-v1')
    return saved ? (JSON.parse(saved) as Outfit[]) : []
  } catch {
    return []
  }
}

function initialDisplayName(): string {
  try { return localStorage.getItem('stylemate-demo-display-name')?.trim() || '演示访客' }
  catch { return '演示访客' }
}

const page = ref<Page>('home')
const items = ref<Garment[]>(initialItems())
const savedOutfits = ref<Outfit[]>(initialOutfits())
const displayName = ref(initialDisplayName())
const nameDraft = ref(displayName.value)
const browseTab = ref<'mine' | 'community'>('community')
const communitySearch = ref('')
const comparedIds = ref<number[]>([])
const categoryFilter = ref('全部')
const search = ref('')
const showAdd = ref(false)
const showAddOutfit = ref(false)
const activeOutfitId = ref<number | null>(null)
const toast = ref('')
const mode = ref<Mode>('item')
const targetId = ref(1)
const query = ref('')
const photoName = ref('')
const photoCategory = ref<Category>('上衣')
const photoColor = ref('绿')
const photoSeason = ref('春')
const resultVisible = ref(false)
const matchError = ref('')
const liked = ref<number[]>([])
const form = ref({ name: '', category: '上衣' as Category, color: '绿', season: '春', style: '休闲', imageUrl: '' })
const outfitForm = ref({ title: '', scene: '', season: '春', color: '绿', style: '休闲', description: '', imageUrl: '', itemIds: [] as number[], published: false })

watch(items, value => {
  try { localStorage.setItem('stylemate-demo-wardrobe-v1', JSON.stringify(value)) }
  catch { notify('浏览器存储空间不足，这次修改刷新后可能丢失') }
}, { deep: true })
watch(savedOutfits, value => {
  try { localStorage.setItem('stylemate-demo-outfits-v1', JSON.stringify(value)) }
  catch { notify('浏览器存储空间不足，这套穿搭刷新后可能丢失') }
}, { deep: true })

const navigation: { id: Page; label: string; icon: string }[] = [
  { id: 'home', label: '总览', icon: '⌂' },
  { id: 'wardrobe', label: '我的衣橱', icon: '▦' },
  { id: 'match', label: '智能搭配', icon: '✧' },
  { id: 'community', label: '穿搭社区', icon: '◎' },
  { id: 'profile', label: '我的资料', icon: '◉' },
]
const categories = ['全部', '上衣', '下装', '连衣裙', '外套', '鞋子', '配饰']
const colorTones: Record<string, string> = { 白: '#e8dfcb', 黑: '#414849', 绿: '#7ba993', 蓝: '#54758b', 棕: '#a87a59', 灰: '#9da6a3', 红: '#b8746f' }
const filteredItems = computed(() => items.value.filter(item =>
  (categoryFilter.value === '全部' || item.category === categoryFilter.value) &&
  (!search.value || `${item.name}${item.color}${item.style}`.includes(search.value.trim())),
))
const selectedItem = computed(() => items.value.find(item => item.id === targetId.value))

type Target = { category: string; color: string; season: string; name: string }
const recommendationTarget = computed<Target | null>(() => {
  if (mode.value === 'item') return selectedItem.value ?? null
  if (mode.value === 'photo') return photoName.value ? { name: photoName.value, category: photoCategory.value, color: photoColor.value, season: photoSeason.value } : null
  return parseTextTarget(query.value, categories.slice(1), outfits.value.flatMap(outfit => [outfit.title, outfit.scene, outfit.description, outfit.style ?? '', ...outfit.garments.flatMap(item => [item.name, item.style])]))
})

watch(query, () => { resultVisible.value = false; matchError.value = '' })

const outfits = computed<Outfit[]>(() => {
  const presets: Outfit[] = [
    { id: 1, title: '春日轻通勤', scene: '上班', season: '春', description: '薄荷绿与米白色的清爽组合。', author: '小橙（示例）', itemIds: [1, 2, 4, 6], published: true, demo: true },
    { id: 2, title: '周末漫游', scene: '出游', season: '春', description: '牛仔外套与浅色裤装，适合轻松出行。', author: '林间风（示例）', itemIds: [1, 2, 3], published: true, demo: true },
    { id: 3, title: '清爽夏日', scene: '约会', season: '夏', description: '奶油白连衣裙和森林绿托特包。', author: '米粒（示例）', itemIds: [5, 4, 6], published: true, demo: true },
  ].map(({ itemIds, ...outfit }) => ({ ...outfit, garments: itemIds.map(id => items.value.find(item => item.id === id)).filter((item): item is Garment => Boolean(item)) }))
  return [...savedOutfits.value, ...presets.filter(outfit => outfit.garments.length > 0)]
})
const communityOutfits = computed(() => publishedOutfits(outfits.value))
const browsedOutfits = computed(() => searchOutfits(browseTab.value === 'mine' ? savedOutfits.value : communityOutfits.value, communitySearch.value))
const comparedOutfits = computed(() => comparedIds.value.map(id => outfits.value.find(outfit => outfit.id === id)).filter((outfit): outfit is Outfit => Boolean(outfit)))
const activeOutfit = computed(() => outfits.value.find(outfit => outfit.id === activeOutfitId.value) ?? null)
function seasonLabel(season: string) { return season === '四季' ? season : `${season}季` }
function selectForCompare(id: number) {
  if (!comparedIds.value.includes(id) && comparedIds.value.length === 2) return notify('对比最多选择两套穿搭，请先取消一套')
  comparedIds.value = toggleComparedOutfit(comparedIds.value, id)
}
function saveDisplayName() {
  const value = nameDraft.value.trim()
  if (!value) return notify('请填写昵称')
  displayName.value = value
  try { localStorage.setItem('stylemate-demo-display-name', value) }
  catch { return notify('浏览器存储空间不足，昵称刷新后可能丢失') }
  savedOutfits.value.forEach(outfit => { outfit.author = value })
  notify('昵称已保存；本机发布的穿搭将显示这个昵称')
}
const recommendedOutfits = computed(() => {
  const target = recommendationTarget.value
  if (!target) return []
  return outfits.value.filter(outfit => matchesOutfit(target, outfit))
})

function notify(message: string) {
  toast.value = message
  window.setTimeout(() => { toast.value = '' }, 3500)
}
function navigate(destination: Page) {
  page.value = destination
  resultVisible.value = false
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
function addItem() {
  const name = form.value.name.trim()
  if (!name) return notify('请先填写衣物名称')
  items.value.unshift({ id: Date.now(), ...form.value, name, tone: colorTones[form.value.color] ?? '#7ba993', surface: '#e6ebe4' })
  form.value = { name: '', category: '上衣', color: '绿', season: '春', style: '休闲', imageUrl: '' }
  showAdd.value = false
  notify('衣物已加入演示衣橱')
}
function removeItem(item: Garment) {
  if (!window.confirm(`从演示衣橱删除“${item.name}”？`)) return
  items.value = items.value.filter(entry => entry.id !== item.id)
  if (targetId.value === item.id) targetId.value = items.value[0]?.id ?? 0
  notify('已从演示衣橱删除')
}
function toggleOutfitItem(id: number) {
  outfitForm.value.itemIds = outfitForm.value.itemIds.includes(id)
    ? outfitForm.value.itemIds.filter(itemId => itemId !== id)
    : [...outfitForm.value.itemIds, id]
}
function addOutfit() {
  const title = outfitForm.value.title.trim()
  if (!title) return notify('请填写穿搭名称')
  if (outfitForm.value.itemIds.length < 2 && !outfitForm.value.imageUrl) return notify('请上传整套照片，或选择至少两件衣物')
  const garments = outfitForm.value.itemIds.map(id => items.value.find(item => item.id === id)).filter((item): item is Garment => Boolean(item))
  if (outfitForm.value.itemIds.length && garments.length !== outfitForm.value.itemIds.length) return notify('选择的衣物已不存在，请重新选择')
  savedOutfits.value.unshift({ id: Date.now(), title, scene: outfitForm.value.scene.trim() || '日常', season: outfitForm.value.season, color: outfitForm.value.color, style: outfitForm.value.style, description: outfitForm.value.description.trim(), imageUrl: outfitForm.value.imageUrl, author: displayName.value, garments: garments.map(item => ({ ...item })), published: outfitForm.value.published })
  outfitForm.value = { title: '', scene: '', season: '春', color: '绿', style: '休闲', description: '', imageUrl: '', itemIds: [], published: false }
  showAddOutfit.value = false
  notify('整套穿搭已保存到当前浏览器')
}
function chooseOutfitPhoto(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) return notify('请选择图片文件')
  if (file.size > 1024 * 1024) return notify('演示版图片请控制在 1 MB 以内')
  const reader = new FileReader()
  reader.onload = () => { if (typeof reader.result === 'string') outfitForm.value.imageUrl = reader.result }
  reader.readAsDataURL(file)
}
function publishOutfit(outfit: Outfit) {
  const saved = savedOutfits.value.find(entry => entry.id === outfit.id)
  if (!saved) return
  saved.author = displayName.value
  saved.published = true
  notify('已发布到本机演示社区；跨用户分享需要后端服务')
}
function useForMatch(item: Garment) {
  targetId.value = item.id
  mode.value = 'item'
  navigate('match')
}
function runMatch() {
  if (!recommendationTarget.value) {
    resultVisible.value = false
    matchError.value = mode.value === 'text'
      ? (query.value.trim() ? '没有识别出衣物信息，请输入品类、颜色或季节，例如“春季绿色上衣”。' : '请先输入想搭配的衣物。')
      : '请先提供一件想搭配的衣物。'
    return
  }
  matchError.value = ''
  resultVisible.value = true
}
function choosePhoto(event: Event) {
  const input = event.target as HTMLInputElement
  photoName.value = input.files?.[0]?.name ?? ''
}
function chooseWardrobePhoto(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) return notify('请选择图片文件')
  if (file.size > 1024 * 1024) return notify('演示版图片请控制在 1 MB 以内')
  const reader = new FileReader()
  reader.onload = () => { if (typeof reader.result === 'string') form.value.imageUrl = reader.result }
  reader.readAsDataURL(file)
}
function toggleLike(id: number) {
  liked.value = liked.value.includes(id) ? liked.value.filter(entry => entry !== id) : [...liked.value, id]
}
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <button class="brand" type="button" @click="navigate('home')"><span class="brand-mark">S<span>✦</span></span><span>StyleMate<small>衣搭智选</small></span></button>
      <div class="sidebar-caption">你的穿搭空间</div>
      <nav aria-label="主导航" class="side-nav">
        <button v-for="link in navigation" :key="link.id" type="button" :class="['nav-link', { active: page === link.id }]" @click="navigate(link.id)"><span class="nav-icon">{{ link.icon }}</span>{{ link.label }}<span v-if="link.id === 'wardrobe'" class="nav-count">{{ items.length }}</span></button>
      </nav>
      <div class="sidebar-bottom"><div class="sidebar-illustration">✦</div><strong>搭配，从了解衣橱开始。</strong><p>把每件喜欢的衣服，穿出更多可能。</p><button type="button" @click="navigate('match')">探索搭配 <span>↗</span></button></div>
      <div class="sidebar-foot">StyleMate · Web Demo</div>
    </aside>

    <div class="main-column">
      <header class="topbar"><div class="mobile-brand">StyleMate <span>衣搭智选</span></div><div class="breadcrumb">我的空间 <span>/</span> {{ navigation.find(link => link.id === page)?.label }}</div><div class="top-actions"><span class="demo-pill"><span></span> 演示版本</span><button class="avatar" type="button" aria-label="查看我的资料" @click="navigate('profile')">{{ displayName[0] }}</button></div></header>

      <main class="content">
        <template v-if="page === 'home'">
          <div class="eyebrow">GOOD MORNING · 你好，今天也要好好穿衣</div>
          <div class="page-heading"><div><h1>让衣橱，成为灵感的起点<span class="heading-spark">✳</span></h1><p>从一件衣服出发，找到属于你的整套穿搭。</p></div><button class="outline-button" type="button" @click="navigate('wardrobe')">查看衣橱 <span>↗</span></button></div>
          <section class="hero"><div class="hero-copy"><span class="hero-kicker">STYLE, MADE SIMPLE</span><h2>你的衣服<br />还有很多种<br /><em>打开方式。</em></h2><p>整理衣橱，保存搭配，分享灵感。<br />每一天都穿得更像自己。</p><button class="light-button" type="button" @click="navigate('match')">开始搭配 <span>→</span></button></div><div class="hero-display" aria-hidden="true"><div class="hero-orbit orbit-one"></div><div class="hero-orbit orbit-two"></div><div class="hero-art hero-art-one"><GarmentArt category="上衣" color="#8aad94" /></div><div class="hero-art hero-art-two"><GarmentArt category="下装" color="#e5dbc5" /></div><div class="hero-art hero-art-three"><GarmentArt category="配饰" color="#ba8869" /></div><div class="hero-note">TODAY'S<br />LOOK <span>✦</span></div></div></section>
          <div class="stats-row"><div class="stat-card"><span>衣橱单品</span><strong>{{ items.length.toString().padStart(2, '0') }}</strong><small>每件都值得被看见</small></div><div class="stat-card"><span>搭配组合</span><strong>{{ outfits.length.toString().padStart(2, '0') }}</strong><small>灵感正在慢慢积累</small></div><div class="stat-card"><span>搭配入口</span><strong>03</strong><small>衣物 · 文字 · 商品图</small></div></div>
          <div class="section-heading"><div><span class="eyebrow">YOUR WARDROBE</span><h2>衣橱里的新灵感</h2></div><button class="text-button" type="button" @click="navigate('wardrobe')">查看全部 <span>→</span></button></div>
          <div class="preview-grid"><button v-for="item in items.slice(0, 4)" :key="item.id" class="preview-card" type="button" @click="useForMatch(item)"><div class="art-surface" :style="{ background: item.surface }"><img v-if="item.imageUrl" class="garment-photo" :src="item.imageUrl" :alt="item.name" /><GarmentArt v-else :category="item.category" :color="item.tone" /><span class="image-label">{{ item.category }}</span></div><div class="preview-info"><strong>{{ item.name }}</strong><span>{{ item.style }} · {{ item.season }}</span></div></button></div>
          <div class="home-note"><span>✦</span><div><strong>关于这版 Demo</strong><p>目前展示的是页面和交互样稿；衣橱图片与数据保存在这台浏览器中。注册、服务器图片存储和云端共享会在后续接入。</p></div></div>
        </template>

        <template v-else-if="page === 'wardrobe'">
          <div class="eyebrow">MY WARDROBE · 你的私人收藏</div><div class="page-heading"><div><h1>我的衣橱<span class="heading-spark">✳</span></h1><p>单件衣物和整套穿搭，都可以保存在这里。</p></div><div class="heading-actions"><button class="outline-button" type="button" @click="showAddOutfit = true">＋ 录入整套穿搭</button><button class="primary-button" type="button" @click="showAdd = true">＋ 录入衣物</button></div></div>
          <div class="wardrobe-toolbar"><div class="filter-row"><button v-for="category in categories" :key="category" type="button" :class="['filter-chip', { selected: categoryFilter === category }]" @click="categoryFilter = category">{{ category }}</button></div><label class="search-box"><span>⌕</span><input v-model="search" placeholder="搜索我的衣物" aria-label="搜索我的衣物" /></label></div>
          <div v-if="filteredItems.length" class="wardrobe-grid"><article v-for="item in filteredItems" :key="item.id" class="wardrobe-card"><div class="art-surface" :style="{ background: item.surface }"><img v-if="item.imageUrl" class="garment-photo" :src="item.imageUrl" :alt="item.name" /><GarmentArt v-else :category="item.category" :color="item.tone" /><span class="image-label">{{ item.category }}</span></div><div class="wardrobe-card-body"><div><strong>{{ item.name }}</strong><button type="button" class="subtle-icon" :aria-label="`删除${item.name}`" @click="removeItem(item)">⋯</button></div><p>{{ item.color }}色 · {{ item.style }} · {{ item.season }}</p><button type="button" class="card-action" @click="useForMatch(item)">用它找搭配 <span>→</span></button></div></article></div>
          <div v-else class="empty-state"><span>▦</span><h3>这里暂时没有符合条件的衣物</h3><p>试试其他筛选，或者录入一件新衣物。</p><button class="primary-button" type="button" @click="showAdd = true">录入衣物</button></div>
          <div class="section-heading"><div><span class="eyebrow">SAVED LOOKS</span><h2>我的整套穿搭</h2></div><button class="text-button" type="button" @click="showAddOutfit = true">新建穿搭 →</button></div>
          <div v-if="savedOutfits.length" class="outfit-grid"><article v-for="outfit in savedOutfits" :key="outfit.id" class="outfit-card"><button class="outfit-open" type="button" @click="activeOutfitId = outfit.id"><div class="outfit-images"><img v-if="outfit.imageUrl" class="outfit-cover-photo" :src="outfit.imageUrl" :alt="outfit.title" /><template v-else><div v-for="item in outfit.garments.slice(0, 3)" :key="item.id" :style="{ background: item.surface }"><img v-if="item.imageUrl" class="garment-photo" :src="item.imageUrl" :alt="item.name" /><GarmentArt v-else :category="item.category" :color="item.tone" compact /></div></template></div><div class="outfit-body"><span>{{ outfit.scene }} · {{ seasonLabel(outfit.season) }}</span><h3>{{ outfit.title }}</h3><p>{{ outfit.garments.length ? `${outfit.garments.length} 件衣物` : '整套照片' }} · {{ outfit.published ? '本机社区可见' : '仅自己可见' }}</p><span class="outfit-link">查看整套穿搭 →</span></div></button></article></div>
          <div v-else class="empty-state"><span>✦</span><h3>还没有自己保存的穿搭</h3><p>上传一张整套照片，或从衣橱选择至少两件衣物。</p><button class="primary-button" type="button" @click="showAddOutfit = true">录入整套穿搭</button></div>
        </template>

        <template v-else-if="page === 'match'">
          <div class="eyebrow">FIND YOUR LOOK · 穿搭从这里开始</div><div class="page-heading"><div><h1>智能搭配<span class="heading-spark">✳</span></h1><p>选择一个起点，看看衣橱里有哪些整套搭配与你呼应。</p></div></div>
          <div class="match-layout"><section class="match-panel"><div class="panel-heading"><span class="step-number">01</span><div><h2>从哪里开始？</h2><p>任选一种方式描述你想搭配的衣物</p></div></div><div class="mode-grid"><button type="button" :class="['mode-card', { selected: mode === 'item' }]" @click="mode = 'item'; resultVisible = false"><span>▦</span><strong>我的衣物</strong><small>从衣橱里选一件</small></button><button type="button" :class="['mode-card', { selected: mode === 'text' }]" @click="mode = 'text'; resultVisible = false"><span>⌕</span><strong>文字搜索</strong><small>描述颜色与品类</small></button><button type="button" :class="['mode-card', { selected: mode === 'photo' }]" @click="mode = 'photo'; resultVisible = false"><span>▧</span><strong>商品图片</strong><small>上传临时参考图</small></button></div>
            <div class="match-input" v-if="mode === 'item'"><span class="field-label">从衣橱中选择一件衣物</span><div v-if="items.length" class="match-wardrobe-grid" role="group" aria-label="选择要搭配的衣物"><button v-for="item in items" :key="item.id" type="button" :class="['match-garment', { selected: targetId === item.id }]" :aria-pressed="targetId === item.id" @click="targetId = item.id; resultVisible = false"><span class="match-garment-image" :style="{ background: item.surface }"><img v-if="item.imageUrl" class="garment-photo" :src="item.imageUrl" :alt="item.name" /><GarmentArt v-else :category="item.category" :color="item.tone" compact /></span><strong>{{ item.name }}</strong><small>{{ item.category }} · {{ item.color }} · {{ item.season }}</small><span class="match-check" aria-hidden="true">✓</span></button></div><p v-else>衣橱还是空的，请先去“我的衣橱”录入一件衣物。</p><p>选中后，会用它的品类、颜色和季节标签寻找搭配组合。</p></div>
            <div class="match-input" v-else-if="mode === 'text'"><label for="match-query">描述你想搭配的衣服</label><input id="match-query" v-model="query" :aria-invalid="Boolean(matchError)" aria-describedby="match-query-help" placeholder="例如：春季绿色上衣" /><p id="match-query-help">演示版识别品类、颜色和季节关键词。</p><p v-if="matchError" class="match-error" role="alert">{{ matchError }}</p></div>
            <div class="match-input" v-else><label class="upload-zone"><span>↑</span><strong>{{ photoName || '选择一张商品图片' }}</strong><small>演示版仅使用下方手选标签匹配，不会分析或上传图片</small><input type="file" accept="image/*" @change="choosePhoto" /></label><div class="tag-fields"><label>品类<select v-model="photoCategory"><option v-for="category in categories.slice(1)" :key="category">{{ category }}</option></select></label><label>颜色<select v-model="photoColor"><option v-for="color in Object.keys(colorTones)" :key="color">{{ color }}</option></select></label><label>季节<select v-model="photoSeason"><option v-for="season in ['春', '夏', '秋', '冬', '四季']" :key="season">{{ season }}</option></select></label></div></div>
            <button class="primary-button match-submit" type="button" @click="runMatch">看看推荐搭配 <span>→</span></button></section>
            <aside class="match-aside"><span class="aside-star">✦</span><span class="eyebrow">HOW IT WORKS</span><h3>推荐有依据，<br />搭配更安心。</h3><p>先按品类、颜色、季节筛选，再展示符合条件的整套搭配。风格作为参考，不代替你的选择。</p><div class="rule-list"><span>01 <strong>选择目标衣物</strong></span><span>02 <strong>核对衣物标签</strong></span><span>03 <strong>查看完整搭配</strong></span></div></aside></div>
          <section v-if="resultVisible" class="results"><div class="section-heading"><div><span class="eyebrow">MATCH RESULTS</span><h2>为你找到 {{ recommendedOutfits.length }} 套搭配</h2></div><span class="result-note">规则演示 · 非 AI 结果</span></div><p v-if="mode === 'text' && recommendationTarget && (!recommendationTarget.category || !recommendationTarget.color || !recommendationTarget.season)" class="inline-notice">已按识别出的关键词模糊筛选；还可加入品类或季节缩小范围。</p><div v-if="recommendedOutfits.length" class="outfit-grid"><article v-for="outfit in recommendedOutfits" :key="outfit.id" class="outfit-card"><button class="outfit-open" type="button" @click="activeOutfitId = outfit.id"><div class="outfit-images"><img v-if="outfit.imageUrl" class="outfit-cover-photo" :src="outfit.imageUrl" :alt="outfit.title" /><template v-else><div v-for="item in outfit.garments.slice(0, 3)" :key="item.id" :style="{ background: item.surface }"><img v-if="item.imageUrl" class="garment-photo" :src="item.imageUrl" :alt="item.name" /><GarmentArt v-else :category="item.category" :color="item.tone" compact /></div></template></div><div class="outfit-body"><span>{{ outfit.scene }} · {{ seasonLabel(outfit.season) }}</span><h3>{{ outfit.title }}</h3><p>{{ outfit.garments.length ? `包含 ${outfit.garments.length} 件衣物` : '整套穿搭照片' }}</p><span class="outfit-link">查看整套穿搭 →</span></div></button></article></div><div v-else class="empty-state"><span>✧</span><h3>还没有符合标签的搭配</h3><p>可以在“我的衣橱”录入整套穿搭，再用关键词查找。</p></div></section>
        </template>

        <template v-else-if="page === 'community'">
          <div class="eyebrow">STYLE COMMUNITY · 整套穿搭</div>
          <div class="page-heading"><div><h1>穿搭广场<span class="heading-spark">✳</span></h1><p>我的穿搭与社区穿搭分开展示；可检索、查看详情和对比。</p></div><button class="outline-button" type="button" @click="outfitForm.published = true; showAddOutfit = true">＋ 发布穿搭</button></div>
          <div class="browse-toolbar"><div class="browse-tabs" role="tablist" aria-label="穿搭分类"><button type="button" role="tab" :aria-selected="browseTab === 'mine'" :class="{ active: browseTab === 'mine' }" @click="browseTab = 'mine'">我的穿搭 <span>{{ savedOutfits.length }}</span></button><button type="button" role="tab" :aria-selected="browseTab === 'community'" :class="{ active: browseTab === 'community' }" @click="browseTab = 'community'">社区穿搭 <span>{{ communityOutfits.length }}</span></button></div><label class="search-box browse-search"><span>⌕</span><input v-model="communitySearch" :placeholder="browseTab === 'mine' ? '搜索我的穿搭' : '搜索社区穿搭，如：绿、通勤'" aria-label="搜索穿搭关键词" /></label></div>
          <p class="browse-help">关键词可匹配名称、颜色、场景、季节、风格、说明和衣物信息。选两套可并排对比。</p>
          <div v-if="browsedOutfits.length" class="community-grid"><article v-for="outfit in browsedOutfits" :key="outfit.id" class="post-card"><button class="post-open" type="button" @click="activeOutfitId = outfit.id"><div class="post-outfit-images"><img v-if="outfit.imageUrl" class="outfit-cover-photo" :src="outfit.imageUrl" :alt="outfit.title" /><template v-else><div v-for="item in outfit.garments.slice(0, 3)" :key="item.id" :style="{ background: item.surface }"><img v-if="item.imageUrl" class="garment-photo" :src="item.imageUrl" :alt="item.name" /><GarmentArt v-else :category="item.category" :color="item.tone" compact /></div></template></div><div class="post-body"><div class="post-author"><span class="author-avatar">{{ outfit.author[0] }}</span><div><strong>{{ outfit.author }}</strong><small>{{ outfit.demo ? '示例用户' : outfit.published ? '本机发布' : '仅自己可见' }}</small></div></div><h2>{{ outfit.title }}</h2><p>{{ outfit.description || '打开查看整套穿搭与衣物标签。' }}</p><div class="post-tags"><span># {{ outfit.scene }}</span><span># {{ seasonLabel(outfit.season) }}</span><span># {{ outfit.color || '未标主色' }}</span></div><span class="outfit-link">查看完整穿搭 →</span></div></button><div class="post-actions"><button type="button" :class="['compare-button', { selected: comparedIds.includes(outfit.id) }]" :aria-pressed="comparedIds.includes(outfit.id)" @click="selectForCompare(outfit.id)">{{ comparedIds.includes(outfit.id) ? '✓ 已选对比' : '＋ 加入对比' }}</button><button v-if="browseTab === 'community'" type="button" :class="['like-button', { liked: liked.includes(outfit.id) }]" :aria-label="liked.includes(outfit.id) ? '取消点赞' : '点赞'" @click="toggleLike(outfit.id)">{{ liked.includes(outfit.id) ? '♥' : '♡' }} {{ liked.includes(outfit.id) ? 1 : 0 }}</button></div></article></div>
          <div v-else class="empty-state"><span>⌕</span><h3>没有找到相关穿搭</h3><p>{{ communitySearch.trim() ? '试试颜色、季节或场景的其他关键词。' : browseTab === 'mine' ? '先录入一套自己的穿搭。' : '社区暂无穿搭。' }}</p></div>
          <section v-if="comparedOutfits.length" class="compare-panel"><div class="section-heading"><div><span class="eyebrow">COMPARE LOOKS</span><h2>穿搭对比 · 已选 {{ comparedOutfits.length }}/2</h2></div><button type="button" class="text-button" @click="comparedIds = []">清空对比</button></div><p v-if="comparedOutfits.length < 2" class="browse-help">再选择一套穿搭，就能并排比较。</p><div class="compare-grid"><article v-for="outfit in comparedOutfits" :key="outfit.id" class="compare-card"><img v-if="outfit.imageUrl" class="compare-cover" :src="outfit.imageUrl" :alt="outfit.title" /><div v-else class="compare-cover compare-art"><div v-for="item in outfit.garments.slice(0, 3)" :key="item.id" :style="{ background: item.surface }"><img v-if="item.imageUrl" class="garment-photo" :src="item.imageUrl" :alt="item.name" /><GarmentArt v-else :category="item.category" :color="item.tone" compact /></div></div><h3>{{ outfit.title }}</h3><dl><div><dt>发布者</dt><dd>{{ outfit.author }}</dd></div><div><dt>季节</dt><dd>{{ seasonLabel(outfit.season) }}</dd></div><div><dt>场景</dt><dd>{{ outfit.scene }}</dd></div><div><dt>风格</dt><dd>{{ outfit.style || '未标注' }}</dd></div><div><dt>主色调</dt><dd>{{ outfit.color || '未标注' }}</dd></div><div><dt>衣物</dt><dd>{{ outfit.garments.length ? outfit.garments.map(item => item.name).join('、') : '仅整套照片' }}</dd></div></dl><button type="button" class="text-button" @click="activeOutfitId = outfit.id">查看详情 →</button></article></div></section>
          <p class="demo-disclaimer">演示版“社区穿搭”包含示例用户和本机发布内容；其他真实用户暂时看不到本机发布内容，跨用户共享需接入后端账号与存储。</p>
        </template>

        <template v-else>
          <div class="eyebrow">MY PROFILE · 只属于你的空间</div><div class="page-heading"><div><h1>我的资料<span class="heading-spark">✳</span></h1><p>了解你的喜好，为日常穿搭留下更多灵感。</p></div></div>
          <div class="profile-layout"><section class="profile-card"><div class="profile-cover"><span>STYLEMATE / PERSONAL SPACE</span><i>✳</i></div><div class="profile-identity"><div class="profile-avatar">{{ displayName[0] }}</div><div><h2>{{ displayName }}</h2><p>本机演示用户</p></div><span class="private-badge">私人空间</span></div><div class="profile-details"><div><span>昵称</span><strong>{{ displayName }}</strong></div><div><span>偏好风格</span><strong>休闲 · 通勤 · 简约</strong></div><div><span>身高 / 体重</span><strong>仅本人可见</strong></div></div><form class="profile-name-form" @submit.prevent="saveDisplayName"><label for="display-name">设置社区显示昵称</label><div><input id="display-name" v-model="nameDraft" maxlength="30" placeholder="输入昵称" /><button class="outline-button" type="submit">保存昵称</button></div><small>发布穿搭时显示昵称；目前只保存在当前浏览器。</small></form></section><aside class="privacy-card"><span>✦ PRIVACY FIRST</span><h3>你的资料，<br />由你决定分享多少。</h3><p>目前没有账号登录。社区展示的是演示用户及本机发布的穿搭；跨用户访问将在后端接入后实现。</p><div class="privacy-line"><span>✓</span> 社区显示昵称</div><div class="privacy-line"><span>✓</span> 私人穿搭不会出现在社区标签</div></aside></div>
        </template>
      </main>
      <footer class="site-footer"><span>© StyleMate 衣搭智选 · 页面体验 Demo</span><span>用你的衣橱，搭出自己的故事 ✦</span></footer>
    </div>

    <nav class="mobile-nav" aria-label="移动端导航"><button v-for="link in navigation" :key="link.id" type="button" :class="{ active: page === link.id }" @click="navigate(link.id)"><span>{{ link.icon }}</span>{{ link.label.replace('我的', '') }}</button></nav>

    <div v-if="showAdd" class="modal-backdrop" @click.self="showAdd = false"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="add-title"><div class="modal-head"><div><span class="eyebrow">ADD TO WARDROBE</span><h2 id="add-title">录入一件衣物</h2></div><button class="close-button" type="button" aria-label="关闭" @click="showAdd = false">×</button></div><p class="modal-note">演示版图片保存在当前浏览器，支持 1 MB 以内的图片。</p><div class="form-grid"><label class="full">衣物名称<input v-model="form.name" placeholder="例如：浅绿色针织衫" maxlength="50" /></label><label class="full">衣物图片（可选）<input type="file" accept="image/*" @change="chooseWardrobePhoto" /></label><div v-if="form.imageUrl" class="form-photo-preview"><img :src="form.imageUrl" alt="即将录入的衣物预览" /></div><label>品类<select v-model="form.category"><option v-for="category in categories.slice(1)" :key="category">{{ category }}</option></select></label><label>颜色<select v-model="form.color"><option v-for="color in Object.keys(colorTones)" :key="color">{{ color }}</option></select></label><label>季节<select v-model="form.season"><option v-for="season in ['春', '夏', '秋', '冬', '四季']" :key="season">{{ season }}</option></select></label><label>风格<select v-model="form.style"><option v-for="style in ['休闲', '通勤', '运动', '简约', '复古', '甜美', '正式']" :key="style">{{ style }}</option></select></label></div><button class="primary-button modal-submit" type="button" @click="addItem">保存到演示衣橱 <span>→</span></button></section></div>
    <div v-if="showAddOutfit" class="modal-backdrop" @click.self="showAddOutfit = false"><section class="modal outfit-modal" role="dialog" aria-modal="true" aria-labelledby="outfit-add-title"><div class="modal-head"><div><span class="eyebrow">CREATE A LOOK</span><h2 id="outfit-add-title">录入整套穿搭</h2></div><button class="close-button" type="button" aria-label="关闭" @click="showAddOutfit = false">×</button></div><p class="modal-note">上传整套照片，或从衣橱选择至少两件衣物。图片与信息保存在当前浏览器。</p><div class="form-grid"><label class="full">穿搭名称<input v-model="outfitForm.title" placeholder="例如：秋日通勤" maxlength="50" /></label><label class="full">整套穿搭照片（可选，1 MB 以内）<input type="file" accept="image/*" @change="chooseOutfitPhoto" /></label><div v-if="outfitForm.imageUrl" class="form-photo-preview"><img :src="outfitForm.imageUrl" alt="即将录入的整套穿搭" /></div><label>场景<input v-model="outfitForm.scene" placeholder="例如：上班" maxlength="30" /></label><label>季节<select v-model="outfitForm.season"><option v-for="season in ['春', '夏', '秋', '冬', '四季']" :key="season">{{ season }}</option></select></label><label>主色调<select v-model="outfitForm.color"><option v-for="color in Object.keys(colorTones)" :key="color">{{ color }}</option></select></label><label>风格<select v-model="outfitForm.style"><option v-for="style in ['休闲', '通勤', '运动', '简约', '复古', '甜美', '正式']" :key="style">{{ style }}</option></select></label><label class="full">搭配说明<textarea v-model="outfitForm.description" placeholder="介绍这套搭配的思路" maxlength="300"></textarea></label></div><div class="outfit-picker-label">关联衣橱单品（已选 {{ outfitForm.itemIds.length }} 件）</div><div v-if="items.length" class="outfit-picker"><label v-for="item in items" :key="item.id" class="outfit-picker-item"><input type="checkbox" :checked="outfitForm.itemIds.includes(item.id)" @change="toggleOutfitItem(item.id)" /><span class="picker-thumb" :style="{ background: item.surface }"><img v-if="item.imageUrl" class="garment-photo" :src="item.imageUrl" :alt="item.name" /><GarmentArt v-else :category="item.category" :color="item.tone" compact /></span><span><strong>{{ item.name }}</strong><small>{{ item.category }} · {{ item.color }} · {{ item.season }}</small></span></label></div><p v-else class="modal-note">衣橱为空，也可以直接上传整套穿搭照片。</p><label class="publish-choice"><input v-model="outfitForm.published" type="checkbox" /> 同时发布到本机演示社区</label><button class="primary-button modal-submit" type="button" @click="addOutfit">保存整套穿搭 <span>→</span></button></section></div>
    <div v-if="activeOutfit" class="modal-backdrop" @click.self="activeOutfitId = null"><section class="modal outfit-modal" role="dialog" aria-modal="true" aria-labelledby="outfit-detail-title"><div class="modal-head"><div><span class="eyebrow">COMPLETE LOOK · {{ activeOutfit.author }}</span><h2 id="outfit-detail-title">{{ activeOutfit.title }}</h2></div><button class="close-button" type="button" aria-label="关闭" @click="activeOutfitId = null">×</button></div><img v-if="activeOutfit.imageUrl" class="detail-cover-photo" :src="activeOutfit.imageUrl" :alt="activeOutfit.title" /><p class="outfit-detail-intro">{{ activeOutfit.scene }} · {{ seasonLabel(activeOutfit.season) }} · {{ activeOutfit.color ? `${activeOutfit.color}色` : '' }} {{ activeOutfit.style || '' }}</p><p class="outfit-detail-intro">{{ activeOutfit.description || '这套穿搭暂无文字说明。' }}</p><h3 class="detail-section-title">{{ activeOutfit.garments.length ? `这套穿搭的 ${activeOutfit.garments.length} 件衣物` : '衣物详情' }}</h3><div v-if="activeOutfit.garments.length" class="detail-garments"><article v-for="item in activeOutfit.garments" :key="item.id" class="detail-garment"><div class="detail-garment-art" :style="{ background: item.surface }"><img v-if="item.imageUrl" class="garment-photo" :src="item.imageUrl" :alt="item.name" /><GarmentArt v-else :category="item.category" :color="item.tone" compact /></div><div><strong>{{ item.name }}</strong><p>{{ item.category }} · {{ item.color }}色 · {{ seasonLabel(item.season) }} · {{ item.style }}</p></div></article></div><p v-else class="outfit-detail-intro">发布者尚未标注单件衣物。</p><button v-if="!activeOutfit.published && !activeOutfit.demo" class="primary-button modal-submit" type="button" @click="publishOutfit(activeOutfit)">发布到本机演示社区 <span>→</span></button></section></div>
    <div v-if="toast" class="toast" role="status">{{ toast }}</div>
  </div>
</template>
