import { computed, defineComponent, nextTick, onBeforeUnmount, ref, watch, type PropType } from 'vue';
import { useYoutubeFeed } from '~/composables/useYoutubeFeed';
import { YOUTUBE_FEED_CATEGORIES } from '~/constants/youtube';
import type { YoutubeVideo } from '~/types';
import { youtubeCardThumb } from '~/utils/imageSize';
import { stopAtRowEdge } from './gridKeys';

function formatDuration(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

function formatViews(count: number): string {
  if (count >= 1e9) return `${(count / 1e9).toFixed(1).replace('.0', '').replace('.', ',')} bi de visualizações`;
  if (count >= 1e6) return `${(count / 1e6).toFixed(1).replace('.0', '').replace('.', ',')} mi de visualizações`;
  if (count >= 1e3) return `${Math.floor(count / 1e3)} mil visualizações`;
  return `${count} visualizações`;
}

function formatAge(iso: string): string {
  const diffSec = (Date.now() - new Date(iso).getTime()) / 1000;
  if (!Number.isFinite(diffSec) || diffSec < 0) return '';
  const units: [number, string, string][] = [
    [31536000, 'ano', 'anos'],
    [2592000, 'mês', 'meses'],
    [604800, 'semana', 'semanas'],
    [86400, 'dia', 'dias'],
    [3600, 'hora', 'horas'],
    [60, 'minuto', 'minutos'],
  ];
  for (const [size, one, many] of units) {
    const n = Math.floor(diffSec / size);
    if (n >= 1) return `há ${n} ${n === 1 ? one : many}`;
  }
  return 'agora';
}

export default defineComponent({
  name: 'YoutubeFeed',

  props: {
    /** Texto buscado (vazio = "em alta"). Vive na URL (`?q=`). */
    query: { type: String, default: '' },
    /** videoCategoryId do "em alta" (null = geral). Vive na URL (`?cat=`). */
    category: { type: String as PropType<string | null>, default: null },
    /** Categoria fixa da seção (Música = '10'): ignora `category` e esconde os chips. */
    fixedCategory: { type: String as PropType<string | null>, default: null },
    searchPlaceholder: { type: String, default: 'Buscar no YouTube' },
  },

  emits: {
    /** Vídeo escolhido + os que vêm depois dele na lista (fila). */
    play: (video: YoutubeVideo, queue: string[]): boolean => !!video && Array.isArray(queue),
    'update:query': (value: string): boolean => typeof value === 'string',
    'update:category': (value: string | null): boolean => value === null || typeof value === 'string',
  },

  setup(props, { emit }) {
    const draft = ref(props.query);
    watch(
      () => props.query,
      (value) => {
        draft.value = value;
      },
    );

    const { items, status, error, hasNext, isLoading, isPending, refresh, loadMore } = useYoutubeFeed(
      () => props.query,
      () => props.fixedCategory ?? props.category,
    );

    function play(video: YoutubeVideo): void {
      const list = items.value;
      const index = list.findIndex((item) => item.videoId === video.videoId);
      emit('play', video, index >= 0 ? list.slice(index + 1).map((item) => item.videoId) : []);
    }

    function submitSearch(event: Event): void {
      const value = draft.value.trim();
      if (value.length === 1) return;
      emit('update:query', value);
      // Fecha o teclado virtual (TV/celular) depois de buscar.
      (event.target as HTMLFormElement | null)?.querySelector('input')?.blur();
    }

    function clearSearch(): void {
      draft.value = '';
      emit('update:query', '');
    }

    /**
     * ←/→ nos chips ficam na fileira. O motor espacial global trata o campo de
     * busca (largo, logo acima) como "mesma linha" e a seta subia pra ele.
     * Nas pontas a seta é engolida — a fileira não "vaza" pra cima.
     */
    function onChipsKeydown(event: KeyboardEvent): void {
      const step =
        event.key === 'ArrowRight' || event.keyCode === 22 ? 1 : event.key === 'ArrowLeft' || event.keyCode === 21 ? -1 : 0;
      if (!step) return;
      const row = event.currentTarget as HTMLElement;
      const chips = Array.from(row.querySelectorAll<HTMLElement>('button'));
      const index = chips.indexOf(document.activeElement as HTMLElement);
      if (index < 0) return;
      event.preventDefault();
      const next = chips[index + step];
      if (!next) return;
      next.focus({ preventScroll: true });
      next.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
    }

    /* ── Infinite scroll ───────────────────────────────────────────────── */

    const sentinelEl = ref<HTMLElement | null>(null);
    let observer: IntersectionObserver | null = null;

    /** O sentinela pode continuar visível depois de uma página curta (muitos
     *  Shorts filtrados) — o observer não dispara de novo, então reconfere. */
    function scrollRoot(el: HTMLElement): HTMLElement | null {
      return el.closest<HTMLElement>('[data-yt-scroll]');
    }

    function sentinelVisible(): boolean {
      const el = sentinelEl.value;
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      const bottom = scrollRoot(el)?.getBoundingClientRect().bottom ?? window.innerHeight;
      return rect.top < bottom + 300;
    }

    watch(sentinelEl, (el) => {
      observer?.disconnect();
      observer = null;
      if (!el || typeof IntersectionObserver === 'undefined') return;
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) void loadMore();
        },
        // Raiz = contêiner que rola (a página não rola): sem isso a margem
        // é medida na viewport e o recorte do contêiner anula a antecedência.
        { root: scrollRoot(el), rootMargin: '300px 0px' },
      );
      observer.observe(el);
    });

    // Só no "em alta" (1 unidade de cota por página) — a busca não tem sentinela.
    watch(status, async (value) => {
      if (value !== 'success' || !hasNext.value || props.query) return;
      await nextTick();
      if (sentinelVisible()) void loadMore();
    });

    onBeforeUnmount(() => observer?.disconnect());

    return {
      youtubeCardThumb,
      emit,
      draft,
      categories: YOUTUBE_FEED_CATEGORIES,
      showCategories: computed(() => props.fixedCategory === null),
      play,
      items,
      status,
      error,
      hasNext,
      isLoading,
      isPending,
      refresh,
      loadMore,
      sentinelEl,
      submitSearch,
      clearSearch,
      onChipsKeydown,
      stopAtRowEdge,
      formatDuration,
      formatViews,
      formatAge,
    };
  },
});
