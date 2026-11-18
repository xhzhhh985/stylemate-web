<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import GarmentArt from '../components/GarmentArt.vue'
import { matchesOutfit, parseTextTarget } from '../matchRules'
import { comparisonCandidates, filterComparisonCandidates, publishedOutfits, searchOutfits } from '../outfitBrowse'
import { AuthApiError, getMe, login, logout, register, updateNickname, type AuthUser } from '../authApi'
import { createCommunityPost, listCommunityPosts, type CommunityPost } from '../communityApi'
import { recommendFromWardrobe, recommendFromWardrobeSelection, wardrobeSelectionIssue } from '../wardrobeRecommendations'
import { demoItems, demoOutfits } from '../demoData'
import { loadWardrobe, wardrobeKey } from '../wardrobeStorage'

type Page = 'home' | 'wardrobe' | 'match' | 'community' | 'profile' | 'compare'
type Category = '上衣' | '下装' | '连衣裙' | '外套' | '鞋子' | '配饰'
type Garment = { id: number; name: string; category: Category; color: string; season: string; style: string; tone: string; surface: string; imageUrl?: string }
type Mode = 'item' | 'text' | 'photo'
type Outfit = { id: number; title: string; scene: string; season: string; color?: string; style?: string; description: string; imageUrl?: string; author: string; garments: Garment[]; published: boolean; demo?: boolean; generated?: boolean; serverId?: number; ownerId?: number }

function outfitsKey(scope: string): string { return scope === 'guest' ? 'stylemate-demo-outfits-v1' : `stylemate-demo-outfits-v1:${scope}` }

function initialItems(scope = 'guest'): Garment[] {
  try { return loadWardrobe(scope, localStorage) }
  catch { return scope === 'guest' ? demoItems : [] }
}

function initialOutfits(scope = 'guest'): Outfit[] {
  try {
    const saved = localStorage.getItem(outfitsKey(scope))
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
const activeScope = ref('guest')
const authUser = ref<AuthUser | null>(null)
const authLoading = ref(true)
const authOffline = ref(false)
const showAuth = ref(false)
const authMode = ref<'login' | 'register'>('login')
const authPending = ref(false)
const authError = ref('')
const authForm = ref({ username: '', password: '', nickname: '', confirmPassword: '' })
const items = ref<Garment[]>(initialItems())
const savedOutfits = ref<Outfit[]>(initialOutfits())
const remoteOutfits = ref<Outfit[]>([])
const communityError = ref('')
const publishingId = ref<number | null>(null)
const displayName = ref(initialDisplayName())
const nameDraft = ref(displayName.value)
const browseTab = ref<'mine' | 'community'>('community')
const communitySearch = ref('')
const compareBaseId = ref<number | null>(null)
const compareCandidateId = ref(0)
const compareMode = ref<'existing' | 'custom'>('existing')
const customItemIds = ref<number[]>([])
const customItemSearch = ref('')
const customTitle = ref('即时组合')
const compareSource = ref<'all' | 'mine' | 'community' | 'generated'>('all')
const compareSources: { value: 'all' | 'mine' | 'community' | 'generated'; label: string }[] = [
  { value: 'all', label: '全部' }, { value: 'mine', label: '我的' },
  { value: 'community', label: '社区' }, { value: 'generated', label: '自动组合' },
]
const compareSeason = ref('全部')
const compareGarmentCategory = ref('全部')
const compareQuery = ref('')
const compareReturnPage = ref<Page>('community')
const categoryFilter = ref('全部')
const search = ref('')
const matchItemSearch = ref('')
const showAdd = ref(false)
const showAddOutfit = ref(false)
const toast = ref('')
const mode = ref<Mode>('item')
const selectedMatchIds = ref<number[]>(items.value[0] ? [items.value[0].id] : [])
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
  try { localStorage.setItem(wardrobeKey(activeScope.value), JSON.stringify(value)) }
  catch { notify('浏览器存储空间不足，这次修改刷新后可能丢失') }
}, { deep: true })
watch(savedOutfits, value => {
  try { localStorage.setItem(outfitsKey(activeScope.value), JSON.stringify(value)) }
  catch { notify('浏览器存储空间不足，这套穿搭刷新后可能丢失') }
}, { deep: true })

function useAccount(user: AuthUser | null) {
  activeScope.value = user ? `user-${user.id}` : 'guest'
  items.value = initialItems(activeScope.value)
  savedOutfits.value = initialOutfits(activeScope.value)
  selectedMatchIds.value = items.value[0] ? [items.value[0].id] : []
  authUser.value = user
  displayName.value = user?.nickname ?? initialDisplayName()
  nameDraft.value = displayName.value
  resultVisible.value = false
  compareBaseId.value = null
  compareCandidateId.value = 0
  customItemIds.value = []
  if (page.value === 'compare') page.value = 'home'
}

onMounted(async () => {
  try { useAccount(await getMe()) }
  catch (error) { authOffline.value = !(error instanceof AuthApiError && error.status === 401) }
  finally { authLoading.value = false }
  await refreshCommunity()
})

function fromCommunityPost(post: CommunityPost): Outfit {
  return {
    ...post,
    id: -post.id,
    serverId: post.id,
    color: post.color ?? undefined,
    style: post.style ?? undefined,
    imageUrl: post.imageUrl ?? undefined,
    garments: post.garments.map(item => ({ ...item, category: item.category as Category, imageUrl: item.imageUrl ?? undefined })),
    published: true,
  }
}

async function refreshCommunity() {
  try {
    remoteOutfits.value = (await listCommunityPosts()).map(fromCommunityPost)
    communityError.value = ''
  } catch {
    communityError.value = '社区内容暂时无法加载，请检查后端服务'
  }
}

function openAuth(mode: 'login' | 'register' = 'login') {
  authMode.value = mode
  authError.value = ''
  authForm.value.password = ''
  authForm.value.confirmPassword = ''
  showAuth.value = true
}

async function submitAuth() {
  if (authPending.value) return
  if (authMode.value === 'register' && authForm.value.password !== authForm.value.confirmPassword) {
    authError.value = '两次输入的密码不一致'
    return
  }
  authPending.value = true
  authError.value = ''
  try {
    const user = authMode.value === 'register'
      ? await register(authForm.value.username.trim(), authForm.value.password, authForm.value.nickname.trim())
      : await login(authForm.value.username.trim(), authForm.value.password)
    useAccount(user)
    await refreshCommunity()
    authOffline.value = false
    showAuth.value = false
    authForm.value.password = ''
    authForm.value.confirmPassword = ''
    notify(`已登录：${user.nickname}`)
  } catch (error) {
    authError.value = error instanceof AuthApiError ? error.message : '无法连接后端，请先启动 FastAPI 服务'
  } finally { authPending.value = false }
}

async function signOut() {
  try {
    await logout()
    useAccount(null)
    await refreshCommunity()
    notify('已退出登录，当前显示游客的本地演示数据')
  } catch { notify('退出失败，请检查后端是否正在运行') }
}

const navigation: { id: Page; label: string; icon: string }[] = [
  { id: 'home', label: '总览', icon: '⌂' },
  { id: 'wardrobe', label: '我的衣橱', icon: '▦' },
  { id: 'match', label: '智能搭配', icon: '✧' },
  { id: 'community', label: '穿搭社区', icon: '◎' },
  { id: 'profile', label: '我的资料', icon: '◉' },
]
const categories = ['全部', '上衣', '下装', '连衣裙', '外套', '鞋子', '配饰']
const garmentCategories = categories.slice(1) as Category[]
const colorTones: Record<string, string> = { 白: '#e8dfcb', 黑: '#414849', 绿: '#7ba993', 蓝: '#54758b', 棕: '#a87a59', 灰: '#9da6a3', 红: '#b8746f' }
const filteredItems = computed(() => items.value.filter(item =>
  (categoryFilter.value === '全部' || item.category === categoryFilter.value) &&
  (!search.value || `${item.name}${item.color}${item.style}`.includes(search.value.trim())),
))
const wardrobeGroups = computed(() => garmentCategories.map(category => ({ category, entries: filteredItems.value.filter(item => item.category === category) })).filter(group => group.entries.length))
const matchGroups = computed(() => garmentCategories.map(category => ({ category, entries: items.value.filter(item =>
  item.category === category && (!matchItemSearch.value.trim() || `${item.name}${item.color}${item.season}${item.style}`.includes(matchItemSearch.value.trim())),
) })).filter(group => group.entries.length))
const outfitPickerGroups = computed(() => garmentCategories.map(category => ({ category, entries: items.value.filter(item => item.category === category) })).filter(group => group.entries.length))
const selectedMatchItems = computed(() => selectedMatchIds.value.map(id => items.value.find(item => item.id === id)).filter((item): item is Garment => Boolean(item)))
const selectedItem = computed(() => selectedMatchItems.value[0])
const customGroups = computed(() => garmentCategories.map(category => ({ category, entries: items.value.filter(item =>
  item.category === category && (!customItemSearch.value.trim() || `${item.name}${item.color}${item.season}${item.style}`.includes(customItemSearch.value.trim())),
) })).filter(group => group.entries.length))

type Target = { category: string; color: string; season: string; name: string }
const recommendationTarget = computed<Target | null>(() => {
  if (mode.value === 'item') return selectedItem.value ?? null
  if (mode.value === 'photo') return photoName.value ? { name: photoName.value, category: photoCategory.value, color: photoColor.value, season: photoSeason.value } : null
  return parseTextTarget(query.value, categories.slice(1), outfits.value.flatMap(outfit => [outfit.title, outfit.scene, outfit.description, outfit.style ?? '', ...outfit.garments.flatMap(item => [item.name, item.style])]))
})

watch(query, () => { resultVisible.value = false; matchError.value = '' })

const outfits = computed<Outfit[]>(() => {
  const presets: Outfit[] = (authUser.value ? [] : demoOutfits).flatMap(({ itemIds, ...outfit }) => {
    const garments = itemIds.map(id => demoItems.find(item => item.id === id)).filter((item): item is Garment => Boolean(item))
    return garments.length === itemIds.length ? [{ ...outfit, published: true, demo: true, garments }] : []
  })
  return [...savedOutfits.value, ...remoteOutfits.value, ...presets]
})
const generatedOutfits = computed<Outfit[]>(() => {
  const target = recommendationTarget.value
  if (!target) return []
  const anchorId = mode.value === 'item' ? selectedItem.value?.id : undefined
  const looks = mode.value === 'item'
    ? recommendFromWardrobeSelection(items.value, selectedMatchIds.value)
    : recommendFromWardrobe(items.value, target)
  return looks.map((look, index) => {
    const anchor = look.garments.find(item => item.id === anchorId) ?? look.garments.find(item =>
      (!target.category || item.category === target.category) && (!target.color || item.color === target.color),
    ) ?? look.garments[0]!
    return {
      id: -10_000_000_000 - index,
      title: `${anchor.name}搭配 ${index + 1}`,
      scene: '日常',
      season: target.season || (anchor.season === '四季' ? look.garments.find(item => item.season !== '四季')?.season ?? '四季' : anchor.season),
      color: anchor.color,
      style: anchor.style,
      description: '由衣橱中的真实衣物组成；类别搭配顺序参考开源穿搭数据统计，请结合实际效果判断。',
      author: authUser.value?.nickname ?? '我的衣橱',
      garments: look.garments,
      published: false,
      generated: true,
    }
  })
})
const displayOutfits = computed(() => [...generatedOutfits.value, ...outfits.value])
const myOutfits = computed(() => [
  ...savedOutfits.value,
  ...remoteOutfits.value.filter(outfit => outfit.ownerId === authUser.value?.id && !savedOutfits.value.some(saved => saved.serverId === outfit.serverId)),
])
const communityOutfits = computed(() => publishedOutfits([...remoteOutfits.value, ...outfits.value.filter(outfit => outfit.demo)]))
const browsedOutfits = computed(() => searchOutfits(browseTab.value === 'mine' ? myOutfits.value : communityOutfits.value, communitySearch.value))
const compareBase = computed(() => displayOutfits.value.find(outfit => outfit.id === compareBaseId.value) ?? null)
const compareCandidate = computed(() => displayOutfits.value.find(outfit => outfit.id === compareCandidateId.value) ?? null)
const customItems = computed(() => customItemIds.value.map(id => items.value.find(item => item.id === id)).filter((item): item is Garment => Boolean(item)))
const customOutfit = computed<Outfit | null>(() => {
  if (!customItems.value.length) return null
  const seasons = [...new Set(customItems.value.map(item => item.season).filter(season => season !== '四季'))]
  return {
    id: -20_000_000_000, title: customTitle.value.trim() || '即时组合', scene: '即时组合',
    season: seasons.length === 1 ? seasons[0]! : seasons.length ? '混合' : '四季',
    color: customItems.value[0]?.color, style: customItems.value[0]?.style,
    description: '从当前衣橱临时选择的衣物，只用于这次对比，不会自动保存或发布。',
    author: authUser.value?.nickname ?? displayName.value, garments: customItems.value,
    published: false, generated: true,
  }
})
const compareChoices = computed(() => comparisonCandidates(displayOutfits.value, compareBaseId.value ?? 0))
const filteredCompareChoices = computed(() => filterComparisonCandidates(compareChoices.value, myOutfits.value.map(outfit => outfit.id), {
  source: compareSource.value, season: compareSeason.value, garmentCategory: compareGarmentCategory.value, query: compareQuery.value,
}))
const comparisonSlots = computed(() => [compareBase.value, compareMode.value === 'custom' ? customOutfit.value : compareCandidate.value])
function seasonLabel(season: string) { return season === '四季' || season === '混合' ? season : `${season}季` }
function toggleCustomItem(id: number) {
  customItemIds.value = customItemIds.value.includes(id) ? customItemIds.value.filter(itemId => itemId !== id) : [...customItemIds.value, id]
}
function openComparison(outfit: Outfit) {
  compareReturnPage.value = page.value === 'compare' ? compareReturnPage.value : page.value
  compareBaseId.value = outfit.id
  compareCandidateId.value = 0
  compareMode.value = 'existing'
  customItemIds.value = []
  customItemSearch.value = ''
  customTitle.value = '即时组合'
  compareSource.value = 'all'
  compareSeason.value = '全部'
  compareGarmentCategory.value = '全部'
  compareQuery.value = ''
  page.value = 'compare'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
function returnFromComparison() {
  page.value = compareReturnPage.value
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
async function saveDisplayName() {
  const value = nameDraft.value.trim()
  if (!value) return notify('请填写昵称')
  if (authUser.value) {
    try { authUser.value = await updateNickname(value) }
    catch { return notify('保存昵称失败，请检查后端服务') }
  } else {
    try { localStorage.setItem('stylemate-demo-display-name', value) }
    catch { return notify('浏览器存储空间不足，昵称刷新后可能丢失') }
  }
  displayName.value = value
  savedOutfits.value.forEach(outfit => { outfit.author = value })
  notify(authUser.value ? '账号昵称已保存' : '游客昵称已保存在当前浏览器')
}
const recommendedOutfits = computed(() => {
  const target = recommendationTarget.value
  if (!target) return []
  if (mode.value === 'item') return displayOutfits.value.filter(outfit =>
    selectedMatchItems.value.every(item => outfit.garments.some(garment => garment.id === item.id && garment.name === item.name)),
  )
  return displayOutfits.value.filter(outfit => matchesOutfit(target, outfit))
})

function notify(message: string) {
  toast.value = message
  window.setTimeout(() => { toast.value = '' }, 3500)
}
function navigate(destination: Page) {
  page.value = destination
  if (destination === 'community') void refreshCommunity()
  resultVisible.value = false
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
function addItem() {
  const name = form.value.name.trim()
  if (!name) return notify('请先填写衣物名称')
  items.value.unshift({ id: Date.now(), ...form.value, name, tone: colorTones[form.value.color] ?? '#7ba993', surface: '#e6ebe4' })
  form.value = { name: '', category: '上衣', color: '绿', season: '春', style: '休闲', imageUrl: '' }
  showAdd.value = false
  notify('衣物已加入我的衣橱')
}
function removeItem(item: Garment) {
  if (!window.confirm(`从衣橱删除“${item.name}”？`)) return
  items.value = items.value.filter(entry => entry.id !== item.id)
  selectedMatchIds.value = selectedMatchIds.value.filter(id => id !== item.id)
  customItemIds.value = customItemIds.value.filter(id => id !== item.id)
  notify('已从衣橱删除')
}
function toggleOutfitItem(id: number) {
  outfitForm.value.itemIds = outfitForm.value.itemIds.includes(id)
    ? outfitForm.value.itemIds.filter(itemId => itemId !== id)
    : [...outfitForm.value.itemIds, id]
}
async function addOutfit() {
  const title = outfitForm.value.title.trim()
  if (!title) return notify('请填写穿搭名称')
  if (outfitForm.value.published && !authUser.value) return notify('请先登录，或取消发布后保存私人穿搭')
  if (outfitForm.value.itemIds.length < 2 && !outfitForm.value.imageUrl) return notify('请上传整套照片，或选择至少两件衣物')
  const garments = outfitForm.value.itemIds.map(id => items.value.find(item => item.id === id)).filter((item): item is Garment => Boolean(item))
  if (outfitForm.value.itemIds.length && garments.length !== outfitForm.value.itemIds.length) return notify('选择的衣物已不存在，请重新选择')
  const shouldPublish = outfitForm.value.published
  const created: Outfit = { id: Date.now(), title, scene: outfitForm.value.scene.trim() || '日常', season: outfitForm.value.season, color: outfitForm.value.color, style: outfitForm.value.style, description: outfitForm.value.description.trim(), imageUrl: outfitForm.value.imageUrl, author: authUser.value?.nickname ?? displayName.value, garments: garments.map(item => ({ ...item })), published: false }
  savedOutfits.value.unshift(created)
  outfitForm.value = { title: '', scene: '', season: '春', color: '绿', style: '休闲', description: '', imageUrl: '', itemIds: [], published: false }
  showAddOutfit.value = false
  if (shouldPublish) await publishOutfit(created)
  else notify('整套穿搭已保存到当前浏览器')
}
function chooseOutfitPhoto(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) return notify('请选择 PNG、JPEG、WebP 或 GIF 图片')
  if (file.size > 1024 * 1024) return notify('演示版图片请控制在 1 MB 以内')
  const reader = new FileReader()
  reader.onload = () => { if (typeof reader.result === 'string') outfitForm.value.imageUrl = reader.result }
  reader.readAsDataURL(file)
}
async function publishOutfit(outfit: Outfit) {
  if (!authUser.value) return openAuth('login')
  const saved = savedOutfits.value.find(entry => entry.id === outfit.id)
  if (!saved || saved.serverId || publishingId.value === saved.id) return
  publishingId.value = saved.id
  try {
    const post = await createCommunityPost(saved)
    saved.serverId = post.id
    saved.author = post.author
    saved.published = true
    await refreshCommunity()
    notify('已发布到社区，其他账号现在可以看到')
  } catch (error) {
    notify(error instanceof Error ? `发布失败：${error.message}` : '发布失败，请检查后端服务')
  } finally { publishingId.value = null }
}
function startPublish() {
  if (!authUser.value) return openAuth('login')
  outfitForm.value.published = true
  showAddOutfit.value = true
}
function useForMatch(item: Garment) {
  selectedMatchIds.value = [item.id]
  mode.value = 'item'
  navigate('match')
}
function toggleMatchItem(id: number) {
  selectedMatchIds.value = selectedMatchIds.value.includes(id)
    ? selectedMatchIds.value.filter(itemId => itemId !== id)
    : [...selectedMatchIds.value, id]
  resultVisible.value = false
  matchError.value = ''
}
function runMatch() {
  if (mode.value === 'item') {
    const issue = wardrobeSelectionIssue(items.value, selectedMatchIds.value)
    if (issue) {
      resultVisible.value = false
      matchError.value = issue
      return
    }
  }
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
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) return notify('请选择 PNG、JPEG、WebP 或 GIF 图片')
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
      <header class="topbar"><div class="shell-inner"><div class="mobile-brand">StyleMate <span>衣搭智选</span></div><div class="breadcrumb">我的空间 <span>/</span> {{ page === 'compare' ? '穿搭对比' : navigation.find(link => link.id === page)?.label }}</div><div class="top-actions"><span class="demo-pill"><span></span> {{ authOffline ? '后端未连接' : '演示版本' }}</span><button v-if="!authUser" class="auth-top-button" type="button" @click="openAuth('login')">{{ authLoading ? '检查账号…' : '登录 / 注册' }}</button><span v-else class="auth-top-name">{{ authUser.username }}</span><button class="avatar" type="button" aria-label="查看我的资料" @click="navigate('profile')">{{ displayName[0] }}</button></div></div></header>

      <main class="content">
        <template v-if="page === 'home'">
          <div class="page-heading"><div><h1>总览</h1><p>衣橱、搭配与社区内容的入口。</p></div><button class="outline-button" type="button" @click="navigate('wardrobe')">查看衣橱 →</button></div>
          <section class="hero"><div class="hero-copy"><h2>今天穿什么，从衣橱里挑。</h2><p>整理衣物，保存整套搭配；也可以先看看别人的组合，再决定自己的。</p><button class="primary-button" type="button" @click="navigate('match')">开始搭配 →</button></div></section>
          <div class="stats-row"><div class="stat-card"><span>衣橱单品</span><strong>{{ items.length }}</strong><small>当前衣橱中的件数</small></div><div class="stat-card"><span>整套穿搭</span><strong>{{ outfits.length }}</strong><small>含已保存与已发布</small></div><div class="stat-card"><span>搭配入口</span><strong>3</strong><small>衣物 · 文字 · 商品图</small></div></div>
          <div class="section-heading"><div><span class="eyebrow">YOUR WARDROBE</span><h2>衣橱里的新灵感</h2></div><button class="text-button" type="button" @click="navigate('wardrobe')">查看全部 <span>→</span></button></div>
          <div v-if="items.length" class="preview-grid"><button v-for="item in items.slice(0, 4)" :key="item.id" class="preview-card" type="button" @click="useForMatch(item)"><div class="art-surface" :style="{ background: item.surface }"><img v-if="item.imageUrl" class="garment-photo" :src="item.imageUrl" :alt="item.name" /><GarmentArt v-else :category="item.category" :color="item.tone" /><span class="image-label">{{ item.category }}</span></div><div class="preview-info"><strong>{{ item.name }}</strong><span>{{ item.style }} · {{ item.season }}</span></div></button></div>
          <div v-else class="empty-state"><span>▦</span><h3>衣橱还是空的</h3><p>从录入第一件衣物开始，慢慢建立自己的衣橱。</p><button class="primary-button" type="button" @click="showAdd = true">录入第一件衣物</button></div>
          <div class="home-note"><span>✦</span><div><strong>关于这版 Demo</strong><p>账号注册登录已接入后端；衣橱和穿搭仍只保存在当前浏览器，不会跨设备同步。</p></div></div>
        </template>

        <template v-else-if="page === 'wardrobe'">
          <div class="eyebrow">MY WARDROBE · 你的私人收藏</div><div class="page-heading"><div><h1>我的衣橱<span class="heading-spark">✳</span></h1><p>单件衣物和整套穿搭，都可以保存在这里。</p></div><div class="heading-actions"><button class="outline-button" type="button" @click="showAddOutfit = true">＋ 录入整套穿搭</button><button class="primary-button" type="button" @click="showAdd = true">＋ 录入衣物</button></div></div>
          <div class="wardrobe-toolbar"><div class="filter-row"><button v-for="category in categories" :key="category" type="button" :class="['filter-chip', { selected: categoryFilter === category }]" @click="categoryFilter = category">{{ category }}</button></div><label class="search-box"><span>⌕</span><input v-model="search" placeholder="搜索我的衣物" aria-label="搜索我的衣物" /></label></div>
          <div v-if="filteredItems.length" class="garment-groups"><details v-for="group in wardrobeGroups" :key="group.category" class="garment-group" :open="Boolean(search.trim()) || categoryFilter === group.category || (categoryFilter === '全部' && group.category === '上衣')"><summary>{{ group.category }} <span>{{ group.entries.length }} 件</span></summary><div class="wardrobe-grid"><article v-for="item in group.entries" :key="item.id" class="wardrobe-card"><div class="art-surface" :style="{ background: item.surface }"><img v-if="item.imageUrl" class="garment-photo" :src="item.imageUrl" :alt="item.name" /><GarmentArt v-else :category="item.category" :color="item.tone" /><span class="image-label">{{ item.category }}</span></div><div class="wardrobe-card-body"><div><strong>{{ item.name }}</strong><button type="button" class="subtle-icon" :aria-label="`删除${item.name}`" @click="removeItem(item)">⋯</button></div><p>{{ item.color }}色 · {{ item.style }} · {{ item.season }}</p><button type="button" class="card-action" @click="useForMatch(item)">用它找搭配 <span>→</span></button></div></article></div></details></div>
          <div v-else class="empty-state"><span>▦</span><h3>这里暂时没有符合条件的衣物</h3><p>试试其他筛选，或者录入一件新衣物。</p><button class="primary-button" type="button" @click="showAdd = true">录入衣物</button></div>
          <div class="section-heading"><div><span class="eyebrow">SAVED LOOKS</span><h2>我的整套穿搭</h2></div><button class="text-button" type="button" @click="showAddOutfit = true">新建穿搭 →</button></div>
          <div v-if="myOutfits.length" class="outfit-grid"><article v-for="outfit in myOutfits" :key="outfit.id" class="outfit-card"><button class="outfit-open" type="button" @click="openComparison(outfit)"><div class="outfit-images"><img v-if="outfit.imageUrl" class="outfit-cover-photo" :src="outfit.imageUrl" :alt="outfit.title" /><template v-else><div v-for="item in outfit.garments.slice(0, 3)" :key="item.id" :style="{ background: item.surface }"><img v-if="item.imageUrl" class="garment-photo" :src="item.imageUrl" :alt="item.name" /><GarmentArt v-else :category="item.category" :color="item.tone" compact /></div></template></div><div class="outfit-body"><span>{{ outfit.scene }} · {{ seasonLabel(outfit.season) }}</span><h3>{{ outfit.title }}</h3><p>{{ outfit.garments.length ? `${outfit.garments.length} 件衣物` : '整套照片' }} · {{ outfit.serverId ? '已发布到社区' : outfit.published ? '旧版本机发布，需重新发布' : '仅自己可见' }}</p><span class="outfit-link">查看整套穿搭 →</span></div></button></article></div>
          <div v-else class="empty-state"><span>✦</span><h3>还没有自己保存的穿搭</h3><p>上传一张整套照片，或从衣橱选择至少两件衣物。</p><button class="primary-button" type="button" @click="showAddOutfit = true">录入整套穿搭</button></div>
        </template>

        <template v-else-if="page === 'match'">
          <div class="eyebrow">FIND YOUR LOOK · 穿搭从这里开始</div><div class="page-heading"><div><h1>智能搭配<span class="heading-spark">✳</span></h1><p>选择一个起点，看看衣橱里有哪些整套搭配与你呼应。</p></div></div>
          <div class="match-layout"><section class="match-panel"><div class="panel-heading"><span class="step-number">01</span><div><h2>从哪里开始？</h2><p>任选一种方式描述你想搭配的衣物</p></div></div><div class="mode-grid"><button type="button" :class="['mode-card', { selected: mode === 'item' }]" @click="mode = 'item'; resultVisible = false"><span>▦</span><strong>我的衣物</strong><small>从衣橱里选一件</small></button><button type="button" :class="['mode-card', { selected: mode === 'text' }]" @click="mode = 'text'; resultVisible = false"><span>⌕</span><strong>文字搜索</strong><small>描述颜色与品类</small></button><button type="button" :class="['mode-card', { selected: mode === 'photo' }]" @click="mode = 'photo'; resultVisible = false"><span>▧</span><strong>商品图片</strong><small>上传临时参考图</small></button></div>
            <div class="match-input" v-if="mode === 'item'"><span class="field-label">从衣橱中选择一件或多件衣物</span><template v-if="items.length"><label class="match-item-search">搜索衣物<input v-model="matchItemSearch" placeholder="搜索名称、颜色、季节或风格" /></label><p class="match-selection-summary">已选择 {{ selectedMatchItems.length }} 件：{{ selectedMatchItems.map(item => item.name).join('、') || '请点击下方衣物图片' }} <button v-if="selectedMatchIds.length" type="button" @click="selectedMatchIds = []; resultVisible = false">清空</button></p><div v-if="matchGroups.length" class="garment-groups match-wardrobe-groups" role="group" aria-label="按品类选择要搭配的衣物"><details v-for="group in matchGroups" :key="group.category" class="garment-group" :open="group.category === selectedItem?.category || Boolean(matchItemSearch.trim())"><summary>{{ group.category }} <span>{{ group.entries.length }} 件</span></summary><div class="match-wardrobe-grid"><button v-for="item in group.entries" :key="item.id" type="button" :class="['match-garment', { selected: selectedMatchIds.includes(item.id) }]" :aria-pressed="selectedMatchIds.includes(item.id)" @click="toggleMatchItem(item.id)"><span class="match-garment-image" :style="{ background: item.surface }"><img v-if="item.imageUrl" class="garment-photo" :src="item.imageUrl" :alt="item.name" /><GarmentArt v-else :category="item.category" :color="item.tone" compact /></span><strong>{{ item.name }}</strong><small>{{ item.category }} · {{ item.color }} · {{ item.season }}</small><span class="match-check" aria-hidden="true">✓</span></button></div></details></div><p v-else>没有找到相关衣物，试试其他关键词。</p></template><p v-else>衣橱还是空的，请先去“我的衣橱”录入衣物。</p><p>推荐结果会包含全部选中衣物，并补齐可搭配的单品。</p></div>
            <div class="match-input" v-else-if="mode === 'text'"><label for="match-query">描述你想搭配的衣服</label><input id="match-query" v-model="query" :aria-invalid="Boolean(matchError)" aria-describedby="match-query-help" placeholder="例如：春季绿色上衣" /><p id="match-query-help">演示版识别品类、颜色和季节关键词。</p><p v-if="matchError" class="match-error" role="alert">{{ matchError }}</p></div>
            <div class="match-input" v-else><label class="upload-zone"><span>↑</span><strong>{{ photoName || '选择一张商品图片' }}</strong><small>演示版仅使用下方手选标签匹配，不会分析或上传图片</small><input type="file" accept="image/*" @change="choosePhoto" /></label><div class="tag-fields"><label>品类<select v-model="photoCategory"><option v-for="category in categories.slice(1)" :key="category">{{ category }}</option></select></label><label>颜色<select v-model="photoColor"><option v-for="color in Object.keys(colorTones)" :key="color">{{ color }}</option></select></label><label>季节<select v-model="photoSeason"><option v-for="season in ['春', '夏', '秋', '冬', '四季']" :key="season">{{ season }}</option></select></label></div></div>
            <button class="primary-button match-submit" type="button" @click="runMatch">看看推荐搭配 <span>→</span></button></section>
            <aside class="match-aside"><span class="aside-star">✦</span><span class="eyebrow">HOW IT WORKS</span><h3>推荐有依据，<br />搭配更安心。</h3><p>先按品类、颜色、季节筛选，再参考开源穿搭数据的类别统计，用衣橱中的真实衣物组合。风格作为参考，不代替你的选择。</p><div class="rule-list"><span>01 <strong>选择目标衣物</strong></span><span>02 <strong>核对衣物标签</strong></span><span>03 <strong>查看完整搭配</strong></span></div></aside></div>
          <section v-if="resultVisible" class="results"><div class="section-heading"><div><span class="eyebrow">MATCH RESULTS</span><h2>为你找到 {{ recommendedOutfits.length }} 套搭配</h2></div><span class="result-note">衣橱组合参考开源数据统计 · 非 AI 结果</span></div><p v-if="mode === 'text' && recommendationTarget && (!recommendationTarget.category || !recommendationTarget.color || !recommendationTarget.season)" class="inline-notice">已按识别出的关键词模糊筛选；还可加入品类或季节缩小范围。</p><div v-if="recommendedOutfits.length" class="outfit-grid"><article v-for="outfit in recommendedOutfits" :key="outfit.id" class="outfit-card"><button class="outfit-open" type="button" @click="openComparison(outfit)"><div class="outfit-images"><img v-if="outfit.imageUrl" class="outfit-cover-photo" :src="outfit.imageUrl" :alt="outfit.title" /><template v-else><div v-for="item in outfit.garments.slice(0, 3)" :key="item.id" :style="{ background: item.surface }"><img v-if="item.imageUrl" class="garment-photo" :src="item.imageUrl" :alt="item.name" /><GarmentArt v-else :category="item.category" :color="item.tone" compact /></div></template></div><div class="outfit-body"><span>{{ outfit.scene }} · {{ seasonLabel(outfit.season) }}</span><h3>{{ outfit.title }}</h3><p>{{ outfit.garments.length ? `包含 ${outfit.garments.length} 件衣物` : '整套穿搭照片' }}</p><span class="outfit-link">查看整套穿搭 →</span></div></button></article></div><div v-else class="empty-state"><span>✧</span><h3>还没有符合标签的搭配</h3><p>可以在“我的衣橱”录入更多衣物，或录入一整套穿搭。</p></div></section>
        </template>

        <template v-else-if="page === 'community'">
          <div class="eyebrow">STYLE COMMUNITY · 整套穿搭</div>
          <div class="page-heading"><div><h1>穿搭广场<span class="heading-spark">✳</span></h1><p>我的穿搭与社区穿搭分开展示；可检索、查看详情和对比。</p></div><button class="outline-button" type="button" @click="startPublish">＋ 发布穿搭</button></div>
          <div class="browse-toolbar"><div class="browse-tabs" role="tablist" aria-label="穿搭分类"><button type="button" role="tab" :aria-selected="browseTab === 'mine'" :class="{ active: browseTab === 'mine' }" @click="browseTab = 'mine'">我的穿搭 <span>{{ myOutfits.length }}</span></button><button type="button" role="tab" :aria-selected="browseTab === 'community'" :class="{ active: browseTab === 'community' }" @click="browseTab = 'community'">社区穿搭 <span>{{ communityOutfits.length }}</span></button></div><label class="search-box browse-search"><span>⌕</span><input v-model="communitySearch" :placeholder="browseTab === 'mine' ? '搜索我的穿搭' : '搜索社区穿搭，如：绿、通勤'" aria-label="搜索穿搭关键词" /></label></div>
          <p v-if="communityError" class="inline-notice" role="alert">{{ communityError }} <button type="button" @click="refreshCommunity">重试</button></p>
          <p class="browse-help">关键词可匹配名称、颜色、场景、季节、风格、说明和衣物信息。点进任意穿搭即可进入左右对比界面。</p>
          <div v-if="browsedOutfits.length" class="community-grid"><article v-for="outfit in browsedOutfits" :key="outfit.id" class="post-card"><button class="post-open" type="button" @click="openComparison(outfit)"><div class="post-outfit-images"><img v-if="outfit.imageUrl" class="outfit-cover-photo" :src="outfit.imageUrl" :alt="outfit.title" /><template v-else><div v-for="item in outfit.garments.slice(0, 3)" :key="item.id" :style="{ background: item.surface }"><img v-if="item.imageUrl" class="garment-photo" :src="item.imageUrl" :alt="item.name" /><GarmentArt v-else :category="item.category" :color="item.tone" compact /></div></template></div><div class="post-body"><div class="post-author"><span class="author-avatar">{{ outfit.author[0] }}</span><div><strong>{{ outfit.author }}</strong><small>{{ outfit.demo ? '示例用户' : outfit.serverId ? '社区发布' : '仅自己可见' }}</small></div></div><h2>{{ outfit.title }}</h2><p>{{ outfit.description || '打开查看整套穿搭与衣物标签。' }}</p><div class="post-tags"><span># {{ outfit.scene }}</span><span># {{ seasonLabel(outfit.season) }}</span><span># {{ outfit.color || '未标主色' }}</span></div><span class="outfit-link">查看完整穿搭 →</span></div></button><div class="post-actions"><button v-if="browseTab === 'community'" type="button" :class="['like-button', { liked: liked.includes(outfit.id) }]" :aria-label="liked.includes(outfit.id) ? '取消点赞' : '点赞'" @click="toggleLike(outfit.id)">{{ liked.includes(outfit.id) ? '♥' : '♡' }} {{ liked.includes(outfit.id) ? 1 : 0 }}</button></div></article></div>
          <div v-else class="empty-state"><span>⌕</span><h3>没有找到相关穿搭</h3><p>{{ communitySearch.trim() ? '试试颜色、季节或场景的其他关键词。' : browseTab === 'mine' ? '先录入一套自己的穿搭。' : '社区暂无穿搭。' }}</p></div>
          <p class="demo-disclaimer">社区穿搭包含示例内容及用户发布的穿搭。同一后端服务的其他账号可以看到已发布内容；私人穿搭只保存在当前浏览器。</p>
        </template>

        <template v-else-if="page === 'compare'">
          <button class="compare-back" type="button" @click="returnFromComparison">← 返回{{ compareReturnPage === 'community' ? '穿搭广场' : compareReturnPage === 'wardrobe' ? '我的衣橱' : '上一页' }}</button>
          <div class="eyebrow">LOOK COMPARISON · 穿搭对比</div>
          <div class="page-heading"><div><h1>两套穿搭，一眼看清<span class="heading-spark">✳</span></h1><p>左侧固定当前穿搭，右侧可选择已有整套，或从衣橱即时组合。</p></div></div>
          <div v-if="compareBase">
            <div class="comparison-controls">
              <div class="comparison-fixed"><span>左侧固定穿搭</span><strong>{{ compareBase.title }}</strong></div>
              <div class="comparison-picker">
                <div class="comparison-mode" role="group" aria-label="对比方式"><button type="button" :class="{ active: compareMode === 'existing' }" :aria-pressed="compareMode === 'existing'" @click="compareMode = 'existing'">选已有整套</button><button type="button" :class="{ active: compareMode === 'custom' }" :aria-pressed="compareMode === 'custom'" @click="compareMode = 'custom'">即时自定义</button></div>
                <template v-if="compareMode === 'existing'">
                <label class="comparison-search">搜索右侧穿搭<input v-model="compareQuery" placeholder="输入名称、颜色、场景或作者" /></label>
                <div class="comparison-filter" role="group" aria-label="穿搭来源"><span>来源</span><button v-for="source in compareSources" :key="source.value" type="button" :class="{ active: compareSource === source.value }" :aria-pressed="compareSource === source.value" @click="compareSource = source.value">{{ source.label }}</button></div>
                <div class="comparison-filter" role="group" aria-label="季节筛选"><span>季节</span><button v-for="season in ['全部', '春', '夏', '秋', '冬']" :key="season" type="button" :class="{ active: compareSeason === season }" :aria-pressed="compareSeason === season" @click="compareSeason = season">{{ season }}</button></div>
                <div class="comparison-filter" role="group" aria-label="衣物品类筛选"><span>品类</span><button v-for="category in categories" :key="category" type="button" :class="{ active: compareGarmentCategory === category }" :aria-pressed="compareGarmentCategory === category" @click="compareGarmentCategory = category">{{ category }}</button></div>
                <p class="comparison-count">找到 {{ filteredCompareChoices.length }} 套 · 点击卡片放到右侧</p>
                <div v-if="filteredCompareChoices.length" class="comparison-options"><button v-for="choice in filteredCompareChoices" :key="choice.id" type="button" :class="['comparison-option', { selected: compareCandidateId === choice.id }]" :aria-pressed="compareCandidateId === choice.id" @click="compareCandidateId = choice.id"><span class="comparison-option-thumb"><img v-if="choice.imageUrl" :src="choice.imageUrl" :alt="choice.title" /><GarmentArt v-else-if="choice.garments[0]" :category="choice.garments[0].category" :color="choice.garments[0].tone" compact /><span v-else>✦</span></span><span class="comparison-option-info"><strong>{{ choice.title }}</strong><small>{{ seasonLabel(choice.season) }} · {{ choice.scene }} · {{ choice.author }}</small></span><span class="comparison-option-check">{{ compareCandidateId === choice.id ? '✓' : '→' }}</span></button></div>
                <p v-else class="comparison-empty">没有符合条件的穿搭，试试清除关键词或切换分类。</p>
                </template>
                <template v-else>
                  <p class="comparison-count">从我的衣橱选衣物，右侧会立即更新；这套组合不会自动保存。</p>
                  <label class="comparison-search">给临时穿搭起个名字<input v-model="customTitle" maxlength="40" placeholder="即时组合" /></label>
                  <label class="comparison-search comparison-custom-search">搜索衣橱衣物<input v-model="customItemSearch" placeholder="名称、颜色、季节或风格" /></label>
                  <p class="comparison-count">已选 {{ customItems.length }} 件：{{ customItems.map(item => item.name).join('、') || '点击下方衣物图片' }} <button v-if="customItemIds.length" class="text-button" type="button" @click="customItemIds = []">清空</button></p>
                  <div v-if="customGroups.length" class="comparison-custom-groups garment-groups" role="group" aria-label="即时组合衣物"><details v-for="group in customGroups" :key="group.category" class="garment-group" :open="Boolean(customItemSearch.trim())"><summary>{{ group.category }} <span>{{ group.entries.length }} 件</span></summary><div class="comparison-custom-grid"><button v-for="item in group.entries" :key="item.id" type="button" :class="['match-garment', { selected: customItemIds.includes(item.id) }]" :aria-pressed="customItemIds.includes(item.id)" @click="toggleCustomItem(item.id)"><span class="match-garment-image" :style="{ background: item.surface }"><img v-if="item.imageUrl" class="garment-photo" :src="item.imageUrl" :alt="item.name" /><GarmentArt v-else :category="item.category" :color="item.tone" compact /></span><strong>{{ item.name }}</strong><small>{{ item.category }} · {{ item.color }} · {{ item.season }}</small><span class="match-check" aria-hidden="true">✓</span></button></div></details></div>
                  <p v-else class="comparison-empty">{{ items.length ? '没有找到相关衣物，请换个关键词。' : '衣橱还是空的，请先录入衣物。' }}</p>
                </template>
              </div>
            </div>
            <div class="comparison-page-grid">
            <section v-for="(outfit, index) in comparisonSlots" :key="index" class="comparison-column">
              <div class="comparison-column-head"><span class="step-number">0{{ index + 1 }}</span><div><span class="eyebrow">{{ index === 0 ? 'CURRENT LOOK' : 'COMPARE WITH' }}</span><h2>{{ index === 0 ? '当前穿搭' : '对比穿搭' }}</h2></div></div>
              <template v-if="outfit">
                <img v-if="outfit.imageUrl" class="comparison-photo" :src="outfit.imageUrl" :alt="outfit.title" />
                <div v-else class="comparison-photo comparison-art"><div v-for="item in outfit.garments.slice(0, 3)" :key="item.id" :style="{ background: item.surface }"><img v-if="item.imageUrl" class="garment-photo" :src="item.imageUrl" :alt="item.name" /><GarmentArt v-else :category="item.category" :color="item.tone" compact /></div></div>
                <div class="comparison-body"><h3>{{ outfit.title }}</h3><p class="comparison-author">{{ index === 1 && compareMode === 'custom' ? '搭配人' : '发布者' }}：{{ outfit.author }}</p><p class="comparison-description">{{ outfit.description || '这套穿搭暂无文字说明。' }}</p><dl class="comparison-facts"><div><dt>季节</dt><dd>{{ seasonLabel(outfit.season) }}</dd></div><div><dt>场景</dt><dd>{{ outfit.scene }}</dd></div><div><dt>风格</dt><dd>{{ outfit.style || '未标注' }}</dd></div><div><dt>主色调</dt><dd>{{ outfit.color ? `${outfit.color}色` : '未标注' }}</dd></div></dl><h4>衣物详情 · {{ outfit.garments.length }} 件</h4><div v-if="outfit.garments.length" class="comparison-garments"><article v-for="item in outfit.garments" :key="item.id" class="detail-garment"><div class="detail-garment-art" :style="{ background: item.surface }"><img v-if="item.imageUrl" class="garment-photo" :src="item.imageUrl" :alt="item.name" /><GarmentArt v-else :category="item.category" :color="item.tone" compact /></div><div><strong>{{ item.name }}</strong><p>{{ item.category }} · {{ item.color }}色 · {{ seasonLabel(item.season) }} · {{ item.style }}</p></div></article></div><p v-else class="browse-help">发布者尚未标注单件衣物。</p><button v-if="index === 0 && !outfit.serverId && !outfit.demo && !outfit.generated" class="outline-button comparison-publish" type="button" :disabled="publishingId === outfit.id" @click="publishOutfit(outfit)">{{ publishingId === outfit.id ? '发布中…' : '发布到社区 →' }}</button></div>
              </template>
              <div v-else class="comparison-placeholder"><span>✦</span><h3>{{ compareMode === 'custom' ? '从衣橱挑选单品' : '选择一套穿搭来对比' }}</h3><p>{{ compareMode === 'custom' ? '勾选衣物后，这里会立即显示临时穿搭。' : '右侧可以从我的穿搭与社区穿搭中选择；当前穿搭不会重复出现。' }}</p></div>
            </section>
            </div>
          </div>
          <div v-else class="empty-state"><h3>这套穿搭已不存在</h3><button class="primary-button" type="button" @click="returnFromComparison">返回列表</button></div>
        </template>

        <template v-else>
          <div class="eyebrow">MY PROFILE · 只属于你的空间</div><div class="page-heading"><div><h1>我的资料<span class="heading-spark">✳</span></h1><p>了解你的喜好，为日常穿搭留下更多灵感。</p></div></div>
          <div class="profile-layout"><section class="profile-card"><div class="profile-cover"><span>个人空间</span></div><div class="profile-identity"><div class="profile-avatar">{{ displayName[0] }}</div><div><h2>{{ displayName }}</h2><p>{{ authUser ? `账号 @${authUser.username}` : '游客演示' }}</p></div><span class="private-badge">私人空间</span></div><div class="profile-details"><div v-if="authUser"><span>用户名</span><strong>{{ authUser.username }}</strong></div><div><span>昵称</span><strong>{{ displayName }}</strong></div><div><span>偏好风格</span><strong>休闲 · 通勤 · 简约</strong></div><div><span>身高 / 体重</span><strong>仅本人可见</strong></div></div><form class="profile-name-form" @submit.prevent="saveDisplayName"><label for="display-name">设置社区显示昵称</label><div><input id="display-name" v-model="nameDraft" maxlength="30" placeholder="输入昵称" /><button class="outline-button" type="submit">保存昵称</button></div><small>{{ authUser ? '账号昵称保存在后端数据库' : '游客昵称只保存在当前浏览器' }}</small></form><button v-if="authUser" class="outline-button profile-logout" type="button" @click="signOut">退出登录</button><button v-else class="outline-button profile-logout" type="button" @click="openAuth('login')">登录 / 注册</button></section><aside class="privacy-card"><span>关于隐私</span><h3>你的资料，<br />由你决定分享多少。</h3><p>账号可以注册和登录；私人衣橱保存在当前浏览器，公开发布的穿搭保存在后端，其他账号可见。</p><div class="privacy-line"><span>✓</span> 社区显示昵称</div><div class="privacy-line"><span>✓</span> 私人穿搭不会出现在社区标签</div></aside></div>
        </template>
      </main>
      <footer class="site-footer"><div class="shell-inner"><span>© StyleMate 衣搭智选 · 页面体验 Demo</span><span>用你的衣橱，搭出自己的故事</span></div></footer>
    </div>

    <nav class="mobile-nav" aria-label="移动端导航"><button v-for="link in navigation" :key="link.id" type="button" :class="{ active: page === link.id }" @click="navigate(link.id)"><span>{{ link.icon }}</span>{{ link.label.replace('我的', '') }}</button></nav>

    <div v-if="showAdd" class="modal-backdrop" @click.self="showAdd = false"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="add-title"><div class="modal-head"><div><span class="eyebrow">ADD TO WARDROBE</span><h2 id="add-title">录入一件衣物</h2></div><button class="close-button" type="button" aria-label="关闭" @click="showAdd = false">×</button></div><p class="modal-note">演示版图片保存在当前浏览器，支持 1 MB 以内的图片。</p><div class="form-grid"><label class="full">衣物名称<input v-model="form.name" placeholder="例如：浅绿色针织衫" maxlength="50" /></label><label class="full">衣物图片（可选）<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" @change="chooseWardrobePhoto" /></label><div v-if="form.imageUrl" class="form-photo-preview"><img :src="form.imageUrl" alt="即将录入的衣物预览" /></div><label>品类<select v-model="form.category"><option v-for="category in categories.slice(1)" :key="category">{{ category }}</option></select></label><label>颜色<select v-model="form.color"><option v-for="color in Object.keys(colorTones)" :key="color">{{ color }}</option></select></label><label>季节<select v-model="form.season"><option v-for="season in ['春', '夏', '秋', '冬', '四季']" :key="season">{{ season }}</option></select></label><label>风格<select v-model="form.style"><option v-for="style in ['休闲', '通勤', '运动', '简约', '复古', '甜美', '正式']" :key="style">{{ style }}</option></select></label></div><button class="primary-button modal-submit" type="button" @click="addItem">保存到我的衣橱 <span>→</span></button></section></div>
    <div v-if="showAddOutfit" class="modal-backdrop" @click.self="showAddOutfit = false"><section class="modal outfit-modal" role="dialog" aria-modal="true" aria-labelledby="outfit-add-title"><div class="modal-head"><div><span class="eyebrow">CREATE A LOOK</span><h2 id="outfit-add-title">录入整套穿搭</h2></div><button class="close-button" type="button" aria-label="关闭" @click="showAddOutfit = false">×</button></div><p class="modal-note">上传整套照片，或从衣橱选择至少两件衣物。私人穿搭保存在当前浏览器，发布后会上传到社区。</p><div class="form-grid"><label class="full">穿搭名称<input v-model="outfitForm.title" placeholder="例如：秋日通勤" maxlength="50" /></label><label class="full">整套穿搭照片（可选，1 MB 以内）<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" @change="chooseOutfitPhoto" /></label><div v-if="outfitForm.imageUrl" class="form-photo-preview"><img :src="outfitForm.imageUrl" alt="即将录入的整套穿搭" /></div><label>场景<input v-model="outfitForm.scene" placeholder="例如：上班" maxlength="30" /></label><label>季节<select v-model="outfitForm.season"><option v-for="season in ['春', '夏', '秋', '冬', '四季']" :key="season">{{ season }}</option></select></label><label>主色调<select v-model="outfitForm.color"><option v-for="color in Object.keys(colorTones)" :key="color">{{ color }}</option></select></label><label>风格<select v-model="outfitForm.style"><option v-for="style in ['休闲', '通勤', '运动', '简约', '复古', '甜美', '正式']" :key="style">{{ style }}</option></select></label><label class="full">搭配说明<textarea v-model="outfitForm.description" placeholder="介绍这套搭配的思路" maxlength="300"></textarea></label></div><div class="outfit-picker-label">关联衣橱单品（已选 {{ outfitForm.itemIds.length }} 件）</div><div v-if="items.length" class="garment-groups outfit-picker-groups"><details v-for="group in outfitPickerGroups" :key="group.category" class="garment-group" :open="group.category === '上衣' || group.entries.some(item => outfitForm.itemIds.includes(item.id))"><summary>{{ group.category }} <span>{{ group.entries.length }} 件 · 已选 {{ group.entries.filter(item => outfitForm.itemIds.includes(item.id)).length }} 件</span></summary><div class="outfit-picker"><label v-for="item in group.entries" :key="item.id" class="outfit-picker-item"><input type="checkbox" :checked="outfitForm.itemIds.includes(item.id)" @change="toggleOutfitItem(item.id)" /><span class="picker-thumb" :style="{ background: item.surface }"><img v-if="item.imageUrl" class="garment-photo" :src="item.imageUrl" :alt="item.name" /><GarmentArt v-else :category="item.category" :color="item.tone" compact /></span><span><strong>{{ item.name }}</strong><small>{{ item.category }} · {{ item.color }} · {{ item.season }}</small></span></label></div></details></div><p v-else class="modal-note">衣橱为空，也可以直接上传整套穿搭照片。</p><label class="publish-choice"><input v-model="outfitForm.published" type="checkbox" :disabled="!authUser" /> 同时发布到社区（{{ authUser ? authUser.nickname : '请先登录' }}）</label><button class="primary-button modal-submit" type="button" @click="addOutfit">保存整套穿搭 <span>→</span></button></section></div>
    <div v-if="showAuth" class="modal-backdrop" @click.self="showAuth = false"><section class="modal auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title"><div class="modal-head"><div><span class="eyebrow">STYLEMATE ACCOUNT</span><h2 id="auth-title">{{ authMode === 'login' ? '登录账号' : '创建账号' }}</h2></div><button class="close-button" type="button" aria-label="关闭" @click="showAuth = false">×</button></div><div class="auth-tabs"><button type="button" :class="{ active: authMode === 'login' }" @click="authMode = 'login'; authError = ''">登录</button><button type="button" :class="{ active: authMode === 'register' }" @click="authMode = 'register'; authError = ''">注册</button></div><form class="auth-form" @submit.prevent="submitAuth"><label>用户名<input v-model="authForm.username" autocomplete="username" minlength="3" maxlength="30" pattern="[A-Za-z0-9_]+" placeholder="3–30 位字母、数字或下划线" required /></label><label v-if="authMode === 'register'">昵称<input v-model="authForm.nickname" autocomplete="nickname" maxlength="50" placeholder="社区显示的名字" required /></label><label>密码<input v-model="authForm.password" type="password" :autocomplete="authMode === 'login' ? 'current-password' : 'new-password'" :minlength="authMode === 'register' ? 8 : 1" maxlength="128" placeholder="注册时至少 8 位" required /></label><label v-if="authMode === 'register'">确认密码<input v-model="authForm.confirmPassword" type="password" autocomplete="new-password" minlength="8" maxlength="128" required /></label><p v-if="authError" class="auth-error" role="alert">{{ authError }}</p><p class="auth-hint">账号与公开发布的穿搭保存在后端；私人衣橱和穿搭保存在此浏览器。</p><button class="primary-button modal-submit" type="submit" :disabled="authPending">{{ authPending ? '请稍候…' : authMode === 'login' ? '登录' : '注册并登录' }} →</button></form></section></div>
    <div v-if="toast" class="toast" role="status">{{ toast }}</div>
  </div>
</template>
