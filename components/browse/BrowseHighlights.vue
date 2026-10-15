<template>
  <section
    class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,0.36fr)] lg:gap-5"
    aria-label="Em destaque"
  >
    <!-- Painel: item em destaque + canais em destaque -->
    <div
      class="grid overflow-hidden rounded-lg border border-white/10 bg-[#06142d]/70 backdrop-blur-md md:grid-cols-[minmax(0,0.78fr)_minmax(0,1fr)]"
    >
      <!-- Item em destaque -->
      <div class="flex items-center gap-4 p-4 sm:p-5">
        <template v-if="featured">
          <NuxtLink
            :to="`/medias/${featured.slug}`"
            class="relative block h-[7.5rem] w-[5rem] shrink-0 overflow-hidden rounded-md bg-elevated focus:outline-none focus-visible:shadow-focus"
            :aria-label="featured.title"
          >
            <img
              v-if="!posterFailed && featured.thumbnailUrl"
              :src="featured.thumbnailUrl"
              :alt="featured.title"
              loading="lazy"
              decoding="async"
              class="h-full w-full object-cover"
              @error="posterFailed = true"
            />
            <span v-else class="flex h-full w-full items-center justify-center text-blue-dark">
              <Icon name="material-symbols:theaters" class="h-8 w-8" aria-hidden="true" />
            </span>
          </NuxtLink>

          <div class="min-w-0">
            <p class="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-ink-muted">
              {{ featuredLabel }}
            </p>
            <p class="mt-1 truncate text-[1.15rem] font-semibold leading-tight text-ink">
              {{ featured.title }}
            </p>
            <p class="mt-1 truncate text-[0.9rem] text-ink-muted">{{ featuredMeta }}</p>

            <NuxtLink
              :to="`/medias/${featured.slug}`"
              class="mt-3 inline-flex h-11 items-center gap-2.5 rounded-full border border-blue-dark/60 bg-blue-dark/25 px-6 text-[0.95rem] font-semibold text-ink transition-colors duration-fast hover:bg-blue-dark/45 focus:outline-none focus-visible:shadow-focus"
            >
              <Icon name="material-symbols:play-arrow-rounded" class="h-6 w-6 text-blue-light" aria-hidden="true" />
              Assistir agora
            </NuxtLink>
          </div>
        </template>

        <div v-else class="h-[7.5rem] w-full animate-pulse rounded-md bg-white/5" aria-hidden="true" />
      </div>

      <!-- Canais em destaque -->
      <div class="border-t border-white/10 p-4 sm:p-5 md:border-l md:border-t-0">
        <p class="text-[1rem] font-medium text-ink">Canais em destaque</p>

        <div class="mt-3 flex items-center gap-2">
          <button
            type="button"
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors duration-fast hover:text-ink focus:outline-none focus-visible:shadow-focus"
            aria-label="Canais anteriores"
            @click="scrollRail(-1)"
          >
            <Icon name="material-symbols:chevron-left-rounded" class="h-6 w-6" aria-hidden="true" />
          </button>

          <ul
            ref="rail"
            class="flex min-w-0 flex-1 snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <li v-if="channels.length === 0" class="py-5 text-sm text-ink-muted">
              Nenhum canal disponível.
            </li>
            <li v-for="channel in channels" :key="channel.id" class="shrink-0 snap-start">
              <NuxtLink
                :to="`/medias/${channel.slug}`"
                class="group flex w-[5.5rem] flex-col items-center text-center focus:outline-none"
              >
                <span
                  class="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-[#050b1c] text-ink-muted transition-colors duration-fast group-hover:border-accent/70 group-focus-visible:shadow-focus"
                >
                  <img
                    v-if="channel.logoUrl"
                    :src="channel.logoUrl"
                    :alt="channel.title"
                    loading="lazy"
                    decoding="async"
                    class="h-9 w-9 object-contain"
                  />
                  <span v-else class="text-sm font-bold text-ink" aria-hidden="true">
                    {{ initials(channel.title) }}
                  </span>
                </span>
                <span class="mt-2 w-full truncate text-[0.78rem] font-medium text-ink">
                  {{ channel.title }}
                </span>
                <span class="w-full truncate text-[0.7rem] text-ink-muted">
                  {{ channel.categoryName ?? 'Ao vivo' }}
                </span>
              </NuxtLink>
            </li>
          </ul>

          <button
            type="button"
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors duration-fast hover:text-ink focus:outline-none focus-visible:shadow-focus"
            aria-label="Próximos canais"
            @click="scrollRail(1)"
          >
            <Icon name="material-symbols:chevron-right-rounded" class="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>

    <!-- Painel: qualidade / institucional -->
    <div
      class="flex flex-col justify-between rounded-lg border border-white/10 bg-[#06142d]/70 p-4 backdrop-blur-md sm:p-5"
    >
      <div class="flex items-start gap-3.5">
        <span
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-[#050b1c]/80 text-[#f3c969]"
          aria-hidden="true"
        >
          <AppIcon :name="slide.icon" class="h-6 w-6" />
        </span>

        <div class="min-w-0 flex-1">
          <p class="truncate text-[0.82rem] text-ink-muted">{{ slide.label }}</p>
          <div class="mt-0.5 flex items-center justify-between gap-2">
            <p class="truncate text-[1.1rem] font-semibold text-ink">{{ slide.value }}</p>
            <span
              v-if="slide.badge"
              class="shrink-0 rounded-full border border-[#f3c969]/70 px-3 py-0.5 text-[0.75rem] font-medium text-[#f3c969]"
            >
              {{ slide.badge }}
            </span>
          </div>
        </div>
      </div>

      <p class="mt-4 text-[0.88rem] text-ink-muted">{{ slide.text }}</p>

      <div class="mt-3 flex items-center gap-1.5" role="tablist" aria-label="Destaques">
        <button
          v-for="(item, position) in slides"
          :key="item.label"
          type="button"
          role="tab"
          :aria-selected="position === slideIndex"
          :aria-label="item.label"
          class="h-1.5 rounded-full transition-all duration-normal focus:outline-none focus-visible:shadow-focus"
          :class="position === slideIndex ? 'w-10 bg-accent' : 'w-1.5 bg-white/30 hover:bg-white/50'"
          @click="slideIndex = position"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { SECTIONS } from '~/constants';
import type { SectionKey } from '~/constants';

const props = defineProps<{
  section: SectionKey;
}>();

const sectionDef = computed(() => SECTIONS[props.section]);

/* ── Item em destaque: o mais recente da seção atual ── */
const featuredParams = computed(() => ({
  type: sectionDef.value.type,
  sort: '-added' as const,
  limit: 1,
}));
const featuredList = useMediaList(featuredParams);
const featured = computed(() => featuredList.items.value[0] ?? null);

const featuredLabel = computed(() => {
  if (props.section === 'filmes') return 'Filme em destaque';
  if (props.section === 'series') return 'Série em destaque';
  return 'Canal em destaque';
});

const featuredMeta = computed(() => {
  const item = featured.value;
  if (!item) return '';
  return [item.categoryName, item.year].filter(Boolean).join(' • ');
});

const posterFailed = ref(false);
watch(featured, () => {
  posterFailed.value = false;
});

/* ── Canais em destaque: sempre canais ao vivo, independente da seção ── */
const channelParams = { type: 'live', sort: '-added', limit: 10 } as const;
const channelList = useMediaList(channelParams);
const channels = computed(() => channelList.items.value);

// SSR: destaque + canais no HTML (sem flash de skeleton na hidratação).
await Promise.all([featuredList.ready, channelList.ready]);

const rail = ref<HTMLElement | null>(null);

function scrollRail(direction: 1 | -1): void {
  const element = rail.value;
  if (!element) return;
  element.scrollBy({ left: direction * element.clientWidth * 0.8, behavior: 'smooth' });
}

function initials(title: string): string {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

/* ── Painel institucional (texto de divulgação, não vem da API) ── */
interface Slide {
  icon: string;
  label: string;
  value: string;
  badge?: string;
  text: string;
}

const slides: Slide[] = [
  {
    icon: 'prysma:crown',
    label: 'Qualidade de imagem',
    value: 'Full HD / 4K',
    badge: 'Premium',
    text: 'Seus favoritos, sempre com você.',
  },
  {
    icon: 'material-symbols:movie-filter-outline',
    label: 'Catálogo',
    value: '+ de 20.000 filmes',
    text: 'E mais de 8.000 séries para maratonar.',
  },
  {
    icon: 'material-symbols:devices',
    label: 'Onde quiser',
    value: 'Todos os dispositivos',
    text: 'Comece na TV e continue no celular.',
  },
];

const slideIndex = ref(0);
const slide = computed(() => slides[slideIndex.value]);
</script>
