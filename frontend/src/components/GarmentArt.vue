<script setup lang="ts">
withDefaults(defineProps<{ category: string; color?: string; compact?: boolean }>(), {
  color: '#739a88',
  compact: false,
})
</script>

<template>
  <svg class="garment-art" :class="{ compact }" viewBox="0 0 220 220" role="img" :aria-label="`${category}示意图`">
    <ellipse cx="110" cy="193" rx="67" ry="10" fill="#263b34" opacity=".09" />
    <g v-if="category === '上衣'">
      <path d="M73 38 93 31q17 13 34 0l20 7 31 30-20 27-13-11v99H75V84L62 95 42 68Z" :fill="color" stroke="#335147" stroke-width="3" />
      <path d="M92 32q18 24 36 0" fill="none" stroke="#f9f6ef" stroke-width="5" />
      <path d="M75 91h70M75 107h70M75 123h70M75 139h70M75 155h70" stroke="#fff" stroke-width="7" opacity=".38" />
    </g>
    <g v-else-if="category === '下装'">
      <path d="M63 36h94l-8 142-36 4-8-88-8 88-36-4Z" :fill="color" stroke="#335147" stroke-width="3" />
      <path d="M64 58h92M108 58l-3 36" fill="none" stroke="#263b34" stroke-width="3" opacity=".4" />
      <path d="M75 72v42M145 72v42" stroke="#fff" stroke-width="3" opacity=".25" />
    </g>
    <g v-else-if="category === '连衣裙'">
      <path d="m79 35 17-8q14 13 28 0l17 8-6 50 37 91q-62 20-124 0l37-91Z" :fill="color" stroke="#335147" stroke-width="3" />
      <path d="M96 27q14 20 28 0M84 85q26 16 52 0" fill="none" stroke="#fff" stroke-width="4" opacity=".7" />
      <path d="m79 36-18 33 18 12m62-45 18 33-18 12" fill="none" stroke="#335147" stroke-width="17" stroke-linecap="round" />
    </g>
    <g v-else-if="category === '外套'">
      <path d="m73 33 24-9 13 14 13-14 24 9 25 36-17 20-12-12v105H77V77L65 89 48 69Z" :fill="color" stroke="#335147" stroke-width="3" />
      <path d="m97 24 13 14-11 31 11 17m13-62-13 14 11 31-11 17M110 86v96" fill="none" stroke="#f8f5ee" stroke-width="4" />
      <circle cx="118" cy="107" r="3" fill="#f8f5ee" /><circle cx="118" cy="131" r="3" fill="#f8f5ee" />
    </g>
    <g v-else-if="category === '鞋子'">
      <path d="M31 121q24-4 40-29l26 20q12 13 39 17 15 3 17 18v18H29q-5-22 2-44Z" :fill="color" stroke="#335147" stroke-width="3" />
      <path d="M104 127q22 13 46 13l26-15 15 11v29h-71l-20-18Z" :fill="color" stroke="#335147" stroke-width="3" />
      <path d="M31 155h122m-32 0h69M53 118l18 11m-7-21 18 11" stroke="#fff" stroke-width="4" opacity=".8" />
    </g>
    <g v-else>
      <path d="M54 86h112l10 91H44Z" :fill="color" stroke="#335147" stroke-width="3" />
      <path d="M78 89V72a32 32 0 0 1 64 0v17" fill="none" stroke="#335147" stroke-width="8" />
      <path d="M55 105h110" stroke="#fff" stroke-width="4" opacity=".5" />
    </g>
  </svg>
</template>
