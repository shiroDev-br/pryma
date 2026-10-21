<template>
  <section
    class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,0.36fr)] lg:gap-5"
    aria-label="Em destaque"
  >
    <!-- Painel: item em destaque + canais em destaque -->
    <div
      class="grid overflow-hidden rounded-lg border border-white/10 bg-[#06142d]/95 md:grid-cols-[minmax(0,0.78fr)_minmax(0,1fr)]"
    >
      <!-- Item em destaque -->
      <div class="flex items-center gap-3 p-3 sm:gap-4 sm:p-4 md:p-5">
        <template v-if="featured">
          <NuxtLink
            :to="`/medias/${featured.slug}`"
            class="relative block h-[5.5rem] w-[3.75rem] shrink-0 overflow-hidden rounded-md bg-elevated focus:outline-none focus-visible:shadow-focus sm:h-[6.5rem] sm:w-[4.35rem] md:h-[7.5rem] md:w-[5rem]"
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
              <Icon name="material-symbols:theaters" class="h-7 w-7 md:h-8 md:w-8" aria-hidden="true" />
            </span>
          </NuxtLink>

          <div class="min-w-0">
            <p class="text-[0.6rem] font-medium uppercase tracking-[0.14em] text-ink-muted sm:text-[0.68rem]">
              {{ featuredLabel }}
            </p>
            <p class="mt-0.5 truncate text-[0.95rem] font-semibold leading-tight text-ink sm:mt-1 sm:text-[1.15rem]">
              {{ featured.title }}
            </p>
            <p class="mt-0.5 truncate text-[0.78rem] text-ink-muted sm:mt-1 sm:text-[0.9rem]">{{ featuredMeta }}</p>

            <NuxtLink
              :to="`/medias/${featured.slug}`"
              class="mt-2 inline-flex h-9 items-center gap-2 rounded-full border border-blue-dark/60 bg-blue-dark/25 px-4 text-[0.82rem] font-semibold text-ink transition-colors duration-fast hover:bg-blue-dark/45 focus:outline-none focus-visible:shadow-focus sm:mt-3 sm:h-11 sm:gap-2.5 sm:px-6 sm:text-[0.95rem]"
            >
              <Icon name="material-symbols:play-arrow-rounded" class="h-5 w-5 text-blue-light sm:h-6 sm:w-6" aria-hidden="true" />
              Assistir agora
            </NuxtLink>
          </div>
        </template>

        <div v-else class="h-[5.5rem] w-full animate-pulse rounded-md bg-white/5 sm:h-[6.5rem] md:h-[7.5rem]" aria-hidden="true" />
      </div>

      <!-- Canais em destaque -->
      <div class="border-t border-white/10 p-3 sm:p-4 md:p-5 md:border-l md:border-t-0">
        <p class="text-[0.9rem] font-medium text-ink sm:text-[1rem]">Canais em destaque</p>

        <div class="mt-2 flex items-center gap-1 sm:mt-3 sm:gap-2">
          <button
            type="button"
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors duration-fast hover:text-ink focus:outline-none focus-visible:shadow-focus sm:h-8 sm:w-8"
            aria-label="Canais anteriores"
            @click="scrollRail(-1)"
          >
            <Icon name="material-symbols:chevron-left-rounded" class="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
          </button>

          <ul
            ref="rail"
            class="flex min-w-0 flex-1 snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth [scrollbar-width:none] sm:gap-5 [&::-webkit-scrollbar]:hidden"
          >
            <li v-if="channels.length === 0" class="py-4 text-sm text-ink-muted sm:py-5">
              Nenhum canal disponível.
            </li>
            <li v-for="channel in channels" :key="channel.id" class="shrink-0 snap-start">
              <NuxtLink
                :to="`/medias/${channel.slug}`"
                class="group flex w-[4.75rem] flex-col items-center text-center focus:outline-none sm:w-[5.5rem]"
              >
                <span
                  class="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-[#050b1c] text-ink-muted transition-colors duration-fast group-hover:border-accent/70 group-focus-visible:shadow-focus sm:h-14 sm:w-14"
                >
                  <img
                    v-if="channel.logoUrl"
                    :src="channel.logoUrl"
                    :alt="channel.title"
                    loading="lazy"
                    decoding="async"
                    class="h-7 w-7 object-contain sm:h-9 sm:w-9"
                  />
                  <span v-else class="text-sm font-bold text-ink" aria-hidden="true">
                    {{ initials(channel.title) }}
                  </span>
                </span>
                <span class="mt-1.5 w-full truncate text-[0.7rem] font-medium text-ink sm:mt-2 sm:text-[0.78rem]">
                  {{ channel.title }}
                </span>
                <span class="w-full truncate text-[0.62rem] text-ink-muted sm:text-[0.7rem]">
                  {{ channel.categoryName ?? 'Ao vivo' }}
                </span>
              </NuxtLink>
            </li>
          </ul>

          <button
            type="button"
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors duration-fast hover:text-ink focus:outline-none focus-visible:shadow-focus sm:h-8 sm:w-8"
            aria-label="Próximos canais"
            @click="scrollRail(1)"
          >
            <Icon name="material-symbols:chevron-right-rounded" class="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>

    <!-- Painel: qualidade / institucional -->
    <div
      class="flex flex-col justify-between rounded-lg border border-white/10 bg-[#06142d]/95 p-3 sm:p-4 md:p-5"
    >
      <div class="flex items-start gap-3">
        <span
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-[#050b1c]/80 text-[#f3c969] sm:h-12 sm:w-12"
          aria-hidden="true"
        >
          <AppIcon :name="slide.icon" class="h-5 w-5 sm:h-6 sm:w-6" />
        </span>

        <div class="min-w-0 flex-1">
          <p class="truncate text-[0.75rem] text-ink-muted sm:text-[0.82rem]">{{ slide.label }}</p>
          <div class="mt-0.5 flex items-center justify-between gap-2">
            <p class="truncate text-[0.98rem] font-semibold text-ink sm:text-[1.1rem]">{{ slide.value }}</p>
            <span
              v-if="slide.badge"
              class="shrink-0 rounded-full border border-[#f3c969]/70 px-2.5 py-0.5 text-[0.68rem] font-medium text-[#f3c969] sm:px-3 sm:text-[0.75rem]"
            >
              {{ slide.badge }}
            </span>
          </div>
        </div>
      </div>

      <p class="mt-3 text-[0.8rem] text-ink-muted sm:mt-4 sm:text-[0.88rem]">{{ slide.text }}</p>

      <div class="mt-3 flex items-center gap-1.5" role="tablist" aria-label="Destaques">
        <button
          v-for="(item, position) in slides"
          :key="item.label"
          type="button"
          role="tab"
          :aria-selected="position === slideIndex"
          :aria-label="item.label"
          class="h-1.5 rounded-full transition-[width,background-color] duration-normal focus:outline-none focus-visible:shadow-focus"
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
