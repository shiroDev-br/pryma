<template>
  <NuxtLink
    :to="item.to"
    class="nav-card group absolute left-1/2 top-1/2 block"
    :class="depthClass"
    :style="cardStyle"
    :aria-current="isActive ? 'true' : undefined"
    :aria-label="item.title"
    @click="onClick"
  >
    <span v-if="isActive" class="nav-card__ring-outer pointer-events-none absolute" aria-hidden="true" />
    <span v-if="isActive" class="nav-card__ring pointer-events-none absolute" aria-hidden="true" />

    <span class="nav-card__surface absolute inset-0 overflow-hidden rounded-[var(--radius-lg)] border" aria-hidden="true">
      <span class="nav-card__art" :class="`nav-card__art--${item.art}`" />
      <span class="nav-card__scrim" />
      <span class="nav-card__shine" />
    </span>

    <span class="relative flex h-full flex-col items-center justify-center px-6 py-7 text-center">
      <span
        class="nav-card__icon flex shrink-0 items-center justify-center rounded-2xl border"
        :class="isActive ? 'is-active' : ''"
        aria-hidden="true"
      >
        <Icon :name="item.icon" class="h-7 w-7" />
      </span>

      <span
        class="block truncate font-bold uppercase"
        :class="isActive
          ? 'mt-5 max-w-full text-[2rem] leading-none tracking-[0.04em] text-white'
          : 'mt-4 max-w-full text-[0.82rem] leading-none tracking-[0.14em] text-white/90'"
      >
        {{ item.title }}
      </span>

      <span
        v-if="isActive"
        class="mt-4 max-w-[18rem] text-[0.9rem] leading-6 tracking-wide text-white/70"
      >
        {{ item.description }}
      </span>

      <span v-if="isActive" class="nav-card__arrow mt-5" aria-hidden="true">
        <Icon name="material-symbols:arrow-forward" class="h-5 w-5" />
      </span>
    </span>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { CSSProperties } from 'vue';
import type { HomeMenuItem } from '~/composables/useHomeMenu';

const props = defineProps<{
  item: HomeMenuItem;
  offset: number;
  isActive: boolean;
}>();

const emit = defineEmits<{ activate: [] }>();

const depth = computed(() => {
  const abs = Math.abs(props.offset);
  if (abs === 0) return 'active';
  if (abs === 1) return 'near';
  return 'far';
});

const depthClass = computed(() => ({
  'z-30': depth.value === 'active',
  'z-20': depth.value === 'near',
  'z-10': depth.value === 'far',
}));

const cardStyle = computed<CSSProperties>(() => {
  const abs = Math.abs(props.offset);
  const sign = Math.sign(props.offset);
  const scale = abs === 0 ? 1 : abs === 1 ? 0.82 : 0.7;
  const z = abs === 0 ? 0 : abs === 1 ? -30 : -80;
  const rotateY = abs === 0 ? 0 : sign * 8;
  const opacity = abs === 0 ? 1 : abs === 1 ? 0.82 : 0.52;

  return {
    transform: `translate(-50%, -50%) translateX(calc(${props.offset} * var(--carousel-step))) translateZ(${z}px) rotateY(${rotateY}deg) scale(${scale})`,
    opacity,
    filter: abs === 0 ? 'none' : 'brightness(.78)',
    transition: 'transform var(--transition-slow), opacity var(--transition-slow), filter var(--transition-slow)',
    willChange: 'transform, opacity',
  };
});

function onClick(event: MouseEvent): void {
  if (props.isActive) return;
  event.preventDefault();
  emit('activate');
}
</script>

<style scoped>
.nav-card {
  width: clamp(17rem, 27vw, 29rem);
  aspect-ratio: 1.32 / 1;
  transform-style: preserve-3d;
}

.nav-card__surface,
.nav-card__ring,
.nav-card__ring-outer {
  transition: box-shadow var(--transition-slow), border-color var(--transition-slow);
}

.nav-card__surface {
  border-color: rgba(255, 255, 255, 0.14);
  background: rgba(7, 10, 18, 0.78);
  box-shadow: 0 26px 70px rgba(0, 0, 0, 0.5);
}

.nav-card__art,
.nav-card__scrim,
.nav-card__shine {
  position: absolute;
  inset: 0;
}

.nav-card__art {
  transform: scale(1.04);
  transition: transform 700ms ease, filter 700ms ease;
}

.nav-card:hover .nav-card__art {
  transform: scale(1.08);
}

.nav-card__art--live {
  background:
    radial-gradient(circle at 75% 28%, rgba(55, 180, 255, .85), transparent 18%),
    linear-gradient(135deg, rgba(7, 65, 125, .95), rgba(8, 15, 37, .95) 55%, rgba(12, 39, 74, .9));
}

.nav-card__art--movies {
  background:
    radial-gradient(circle at 70% 28%, rgba(255, 173, 93, .8), transparent 16%),
    linear-gradient(135deg, rgba(31, 18, 54, .95), rgba(20, 34, 63, .9) 52%, rgba(67, 26, 24, .9));
}

.nav-card__art--plans {
  background:
    radial-gradient(circle at 50% 25%, rgba(52, 145, 255, .9), transparent 25%),
    linear-gradient(145deg, rgba(10, 45, 100, .95), rgba(7, 17, 45, .94) 55%, rgba(16, 44, 90, .92));
}

.nav-card__art--series {
  background:
    radial-gradient(circle at 24% 28%, rgba(255, 92, 76, .7), transparent 20%),
    linear-gradient(135deg, rgba(28, 23, 52, .95), rgba(58, 27, 49, .92) 58%, rgba(15, 26, 57, .95));
}

.nav-card__art--animation {
  background:
    radial-gradient(circle at 68% 32%, rgba(117, 191, 255, .85), transparent 18%),
    linear-gradient(135deg, rgba(54, 31, 82, .96), rgba(17, 45, 83, .94) 55%, rgba(35, 76, 91, .9));
}

.nav-card__scrim {
  background:
    linear-gradient(180deg, rgba(0, 0, 0, .08), rgba(0, 0, 0, .68)),
    linear-gradient(90deg, rgba(0, 0, 0, .35), transparent 50%, rgba(0, 0, 0, .3));
}

.nav-card__shine {
  background: linear-gradient(135deg, rgba(255,255,255,.16), transparent 28%, transparent 72%, rgba(255,255,255,.03));
}

.nav-card__icon {
  width: 4.1rem;
  height: 4.1rem;
  border-color: rgba(255,255,255,.65);
  color: white;
  background: rgba(0,0,0,.28);
  backdrop-filter: blur(8px);
}

.nav-card__icon.is-active {
  width: 4.7rem;
  height: 4.7rem;
  border-color: rgba(255,255,255,.85);
  box-shadow: 0 8px 35px rgba(0, 132, 255, .22);
}

.nav-card__ring {
  inset: -6px;
  border-radius: calc(var(--radius-lg) + 6px);
  border: 2px solid rgba(39, 145, 255, .95);
  box-shadow:
    0 0 26px rgba(0, 132, 255, .55),
    0 0 70px rgba(0, 95, 255, .25),
    0 28px 80px rgba(0, 0, 0, .65);
}

.nav-card__ring-outer {
  inset: -11px;
  border-radius: calc(var(--radius-lg) + 11px);
  border: 1px solid rgba(143, 205, 255, .72);
}

.nav-card__arrow {
  display: inline-flex;
  width: 2.8rem;
  height: 2.8rem;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(91, 176, 255, .8);
  border-radius: 999px;
  background: rgba(0, 67, 155, .28);
  color: white;
}

@media (max-width: 900px) {
  .nav-card {
    width: min(68vw, 27rem);
  }
}
</style>
