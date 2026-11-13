<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import GarmentArt from '../components/GarmentArt.vue'

type Page = 'home' | 'wardrobe' | 'match' | 'community' | 'profile'
type Category = '上衣' | '下装' | '连衣裙' | '外套' | '鞋子' | '配饰'
type Garment = { id: number; name: string; category: Category; color: string; season: string; style: string; tone: string; surface: string; imageUrl?: string }
type Mode = 'item' | 'text' | 'photo'

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

const page = ref<Page>('home')
const items = ref<Garment[]>(initialItems())
const categoryFilter = ref('全部')
const search = ref('')
const showAdd = ref(false)
const toast = ref('')
const mode = ref<Mode>('item')
const targetId = ref(1)
const query = ref('')
const photoName = ref('')
const photoCategory = ref<Category>('上衣')
const photoColor = ref('绿')
const photoSeason = ref('春')
const resultVisible = ref(false)
const liked = ref<number[]>([])
const form = ref({ name: '', category: '上衣' as Category, color: '绿', season: '春', style: '休闲', imageUrl: '' })

watch(items, value => {
  try { localStorage.setItem('stylemate-demo-wardrobe-v1', JSON.stringify(value)) }
  catch { notify('浏览器存储空间不足，这次修改刷新后可能丢失') }
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
  const value = query.value.trim()
  if (!value) return null
  const category = categories.slice(1).find(word => value.includes(word)) ?? (value.includes('裤') ? '下装' : value.includes('裙') ? '连衣裙' : '')
  const color = ['白', '黑', '绿', '蓝', '棕', '灰', '红'].find(word => value.includes(word)) ?? ''
  const season = ['春', '夏', '秋', '冬'].find(word => value.includes(word)) ?? ''
  return { name: value, category, color, season }
})

const outfits = computed(() => [
  { id: 1, title: '春日轻通勤', scene: '上班 · 春季', itemIds: [1, 2, 4, 6] },
  { id: 2, title: '周末漫游', scene: '出游 · 春季', itemIds: [1, 2, 3] },
  { id: 3, title: '清爽夏日', scene: '约会 · 夏季', itemIds: [5, 4, 6] },
].map(outfit => ({ ...outfit, garments: outfit.itemIds.map(id => items.value.find(item => item.id === id)).filter((item): item is Garment => Boolean(item)) })))
const recommendedOutfits = computed(() => {
  const target = recommendationTarget.value
  if (!target) return []
  return outfits.value.filter(outfit => outfit.garments.some(item =>
    (!target.category || item.category === target.category) &&
    (!target.color || item.color === target.color) &&
    (!target.season || item.season === target.season || item.season === '四季'),
  ))
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
function useForMatch(item: Garment) {
  targetId.value = item.id
  mode.value = 'item'
  navigate('match')
}
function runMatch() {
  if (!recommendationTarget.value) return notify('请先提供一件想搭配的衣物')
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
      <header class="topbar"><div class="mobile-brand">StyleMate <span>衣搭智选</span></div><div class="breadcrumb">我的空间 <span>/</span> {{ navigation.find(link => link.id === page)?.label }}</div><div class="top-actions"><span class="demo-pill"><span></span> 演示版本</span><button class="avatar" type="button" aria-label="查看我的资料" @click="navigate('profile')">我</button></div></header>

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
          <div class="eyebrow">MY WARDROBE · 你的私人收藏</div><div class="page-heading"><div><h1>我的衣橱<span class="heading-spark">✳</span></h1><p>把喜欢的衣服放在一起，让每一次搭配都有迹可循。</p></div><button class="primary-button" type="button" @click="showAdd = true">＋ 录入衣物</button></div>
          <div class="wardrobe-toolbar"><div class="filter-row"><button v-for="category in categories" :key="category" type="button" :class="['filter-chip', { selected: categoryFilter === category }]" @click="categoryFilter = category">{{ category }}</button></div><label class="search-box"><span>⌕</span><input v-model="search" placeholder="搜索我的衣物" aria-label="搜索我的衣物" /></label></div>
          <div v-if="filteredItems.length" class="wardrobe-grid"><article v-for="item in filteredItems" :key="item.id" class="wardrobe-card"><div class="art-surface" :style="{ background: item.surface }"><img v-if="item.imageUrl" class="garment-photo" :src="item.imageUrl" :alt="item.name" /><GarmentArt v-else :category="item.category" :color="item.tone" /><span class="image-label">{{ item.category }}</span></div><div class="wardrobe-card-body"><div><strong>{{ item.name }}</strong><button type="button" class="subtle-icon" :aria-label="`删除${item.name}`" @click="removeItem(item)">⋯</button></div><p>{{ item.color }}色 · {{ item.style }} · {{ item.season }}</p><button type="button" class="card-action" @click="useForMatch(item)">用它找搭配 <span>→</span></button></div></article></div>
          <div v-else class="empty-state"><span>▦</span><h3>这里暂时没有符合条件的衣物</h3><p>试试其他筛选，或者录入一件新衣物。</p><button class="primary-button" type="button" @click="showAdd = true">录入衣物</button></div>
        </template>

        <template v-else-if="page === 'match'">
          <div class="eyebrow">FIND YOUR LOOK · 穿搭从这里开始</div><div class="page-heading"><div><h1>智能搭配<span class="heading-spark">✳</span></h1><p>选择一个起点，看看衣橱里有哪些整套搭配与你呼应。</p></div></div>
          <div class="match-layout"><section class="match-panel"><div class="panel-heading"><span class="step-number">01</span><div><h2>从哪里开始？</h2><p>任选一种方式描述你想搭配的衣物</p></div></div><div class="mode-grid"><button type="button" :class="['mode-card', { selected: mode === 'item' }]" @click="mode = 'item'; resultVisible = false"><span>▦</span><strong>我的衣物</strong><small>从衣橱里选一件</small></button><button type="button" :class="['mode-card', { selected: mode === 'text' }]" @click="mode = 'text'; resultVisible = false"><span>⌕</span><strong>文字搜索</strong><small>描述颜色与品类</small></button><button type="button" :class="['mode-card', { selected: mode === 'photo' }]" @click="mode = 'photo'; resultVisible = false"><span>▧</span><strong>商品图片</strong><small>上传临时参考图</small></button></div>
            <div class="match-input" v-if="mode === 'item'"><span class="field-label">从衣橱中选择一件衣物</span><div v-if="items.length" class="match-wardrobe-grid" role="group" aria-label="选择要搭配的衣物"><button v-for="item in items" :key="item.id" type="button" :class="['match-garment', { selected: targetId === item.id }]" :aria-pressed="targetId === item.id" @click="targetId = item.id; resultVisible = false"><span class="match-garment-image" :style="{ background: item.surface }"><img v-if="item.imageUrl" class="garment-photo" :src="item.imageUrl" :alt="item.name" /><GarmentArt v-else :category="item.category" :color="item.tone" compact /></span><strong>{{ item.name }}</strong><small>{{ item.category }} · {{ item.color }} · {{ item.season }}</small><span class="match-check" aria-hidden="true">✓</span></button></div><p v-else>衣橱还是空的，请先去“我的衣橱”录入一件衣物。</p><p>选中后，会用它的品类、颜色和季节标签寻找搭配组合。</p></div>
            <div class="match-input" v-else-if="mode === 'text'"><label for="match-query">描述你想搭配的衣服</label><input id="match-query" v-model="query" placeholder="例如：春季绿色上衣" /><p>演示版识别品类、颜色和季节关键词。</p></div>
            <div class="match-input" v-else><label class="upload-zone"><span>↑</span><strong>{{ photoName || '选择一张商品图片' }}</strong><small>演示版仅使用下方手选标签匹配，不会分析或上传图片</small><input type="file" accept="image/*" @change="choosePhoto" /></label><div class="tag-fields"><label>品类<select v-model="photoCategory"><option v-for="category in categories.slice(1)" :key="category">{{ category }}</option></select></label><label>颜色<select v-model="photoColor"><option v-for="color in Object.keys(colorTones)" :key="color">{{ color }}</option></select></label><label>季节<select v-model="photoSeason"><option v-for="season in ['春', '夏', '秋', '冬', '四季']" :key="season">{{ season }}</option></select></label></div></div>
            <button class="primary-button match-submit" type="button" @click="runMatch">看看推荐搭配 <span>→</span></button></section>
            <aside class="match-aside"><span class="aside-star">✦</span><span class="eyebrow">HOW IT WORKS</span><h3>推荐有依据，<br />搭配更安心。</h3><p>先按品类、颜色、季节筛选，再展示符合条件的整套搭配。风格作为参考，不代替你的选择。</p><div class="rule-list"><span>01 <strong>选择目标衣物</strong></span><span>02 <strong>核对衣物标签</strong></span><span>03 <strong>查看完整搭配</strong></span></div></aside></div>
          <section v-if="resultVisible" class="results"><div class="section-heading"><div><span class="eyebrow">MATCH RESULTS</span><h2>为你找到 {{ recommendedOutfits.length }} 套搭配</h2></div><span class="result-note">规则演示 · 非 AI 结果</span></div><p v-if="mode === 'text' && recommendationTarget && (!recommendationTarget.category || !recommendationTarget.color || !recommendationTarget.season)" class="inline-notice">描述未包含完整的品类、颜色或季节，未识别的条件不会参与筛选。试试“春季绿色上衣”。</p><div v-if="recommendedOutfits.length" class="outfit-grid"><article v-for="outfit in recommendedOutfits" :key="outfit.id" class="outfit-card"><div class="outfit-images"><div v-for="item in outfit.garments.slice(0, 3)" :key="item.id" :style="{ background: item.surface }"><GarmentArt :category="item.category" :color="item.tone" compact /></div></div><div class="outfit-body"><span>{{ outfit.scene }}</span><h3>{{ outfit.title }}</h3><p>包含 {{ outfit.garments.length }} 件真实衣橱单品</p><div class="reason">✓ 至少一件衣物满足已填写的品类、颜色、季节标签</div></div></article></div><div v-else class="empty-state"><span>✧</span><h3>还没有符合标签的搭配</h3><p>这版只展示已预设的组合；之后你可以自己创建更多搭配。</p></div></section>
        </template>

        <template v-else-if="page === 'community'">
          <div class="eyebrow">STYLE COMMUNITY · 灵感来自彼此</div><div class="page-heading"><div><h1>穿搭社区<span class="heading-spark">✳</span></h1><p>看看大家如何把日常衣物，搭出自己的风格。</p></div><button class="outline-button" type="button" @click="notify('发布功能将在账号与衣橱接口完成后开放')">＋ 发布穿搭</button></div>
          <div class="community-grid"><article v-for="post in [{ id: 1, author: '小橙', title: '把春天穿在身上', body: '薄荷绿和米白色的组合，轻松又有精神。上班和周末都能穿。', category: '上衣', tone: '#7ba993', surface: '#e2ece5', tags: ['春日通勤', '清爽配色'], count: 24 }, { id: 2, author: '林间风', title: '周末出门的轻松一套', body: '牛仔外套是我的常备单品，随手一搭也很有层次。', category: '外套', tone: '#54758b', surface: '#dce6e9', tags: ['周末穿搭', '休闲'], count: 18 }, { id: 3, author: '米粒', title: '一条裙子的夏日灵感', body: '奶油白连衣裙配一只绿色包，简单就很好看。', category: '连衣裙', tone: '#e5dfd0', surface: '#eee9dc', tags: ['夏日', '简约'], count: 31 }]" :key="post.id" class="post-card"><div class="post-art" :style="{ background: post.surface }"><GarmentArt :category="post.category" :color="post.tone" /></div><div class="post-body"><div class="post-author"><span class="author-avatar">{{ post.author[0] }}</span><div><strong>{{ post.author }}</strong><small>分享了一套穿搭</small></div></div><h2>{{ post.title }}</h2><p>{{ post.body }}</p><div class="post-tags"><span v-for="tag in post.tags" :key="tag"># {{ tag }}</span></div><button type="button" :class="['like-button', { liked: liked.includes(post.id) }]" :aria-label="liked.includes(post.id) ? '取消点赞' : '点赞'" @click="toggleLike(post.id)">{{ liked.includes(post.id) ? '♥' : '♡' }} {{ post.count + (liked.includes(post.id) ? 1 : 0) }}</button></div></article></div><p class="demo-disclaimer">社区内容与点赞为演示数据。正式版本将支持游客浏览、登录后发布和点赞。</p>
        </template>

        <template v-else>
          <div class="eyebrow">MY PROFILE · 只属于你的空间</div><div class="page-heading"><div><h1>我的资料<span class="heading-spark">✳</span></h1><p>了解你的喜好，为日常穿搭留下更多灵感。</p></div></div>
          <div class="profile-layout"><section class="profile-card"><div class="profile-cover"><span>STYLEMATE / PERSONAL SPACE</span><i>✳</i></div><div class="profile-identity"><div class="profile-avatar">我</div><div><h2>演示访客</h2><p>正在预览 StyleMate Web</p></div><span class="private-badge">私人空间</span></div><div class="profile-details"><div><span>昵称</span><strong>演示访客</strong></div><div><span>偏好风格</span><strong>休闲 · 通勤 · 简约</strong></div><div><span>身高 / 体重</span><strong>仅本人可见</strong></div></div><button class="outline-button" type="button" @click="notify('资料编辑将在账号系统接入后开放')">编辑个人资料 <span>→</span></button></section><aside class="privacy-card"><span>✦ PRIVACY FIRST</span><h3>你的资料，<br />由你决定分享多少。</h3><p>正式版本中，身高和体重只用于你的私人资料页，不会出现在社区帖子或公开搜索结果中。</p><div class="privacy-line"><span>✓</span> 社区只显示昵称和头像</div><div class="privacy-line"><span>✓</span> 私人衣物默认不公开</div></aside></div>
        </template>
      </main>
      <footer class="site-footer"><span>© StyleMate 衣搭智选 · 页面体验 Demo</span><span>用你的衣橱，搭出自己的故事 ✦</span></footer>
    </div>

    <nav class="mobile-nav" aria-label="移动端导航"><button v-for="link in navigation" :key="link.id" type="button" :class="{ active: page === link.id }" @click="navigate(link.id)"><span>{{ link.icon }}</span>{{ link.label.replace('我的', '') }}</button></nav>

    <div v-if="showAdd" class="modal-backdrop" @click.self="showAdd = false"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="add-title"><div class="modal-head"><div><span class="eyebrow">ADD TO WARDROBE</span><h2 id="add-title">录入一件衣物</h2></div><button class="close-button" type="button" aria-label="关闭" @click="showAdd = false">×</button></div><p class="modal-note">演示版图片保存在当前浏览器，支持 1 MB 以内的图片。</p><div class="form-grid"><label class="full">衣物名称<input v-model="form.name" placeholder="例如：浅绿色针织衫" maxlength="50" /></label><label class="full">衣物图片（可选）<input type="file" accept="image/*" @change="chooseWardrobePhoto" /></label><div v-if="form.imageUrl" class="form-photo-preview"><img :src="form.imageUrl" alt="即将录入的衣物预览" /></div><label>品类<select v-model="form.category"><option v-for="category in categories.slice(1)" :key="category">{{ category }}</option></select></label><label>颜色<select v-model="form.color"><option v-for="color in Object.keys(colorTones)" :key="color">{{ color }}</option></select></label><label>季节<select v-model="form.season"><option v-for="season in ['春', '夏', '秋', '冬', '四季']" :key="season">{{ season }}</option></select></label><label>风格<select v-model="form.style"><option v-for="style in ['休闲', '通勤', '运动', '简约', '复古', '甜美', '正式']" :key="style">{{ style }}</option></select></label></div><button class="primary-button modal-submit" type="button" @click="addItem">保存到演示衣橱 <span>→</span></button></section></div>
    <div v-if="toast" class="toast" role="status">{{ toast }}</div>
  </div>
</template>
