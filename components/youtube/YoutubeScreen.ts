import { computed, defineComponent, nextTick, onBeforeUnmount, onMounted, shallowRef, watch, type PropType } from 'vue';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import {
  YOUTUBE_SECTION,
  youtubeCoverUrl,
  youtubeVideoEntry,
  youtubeWatchUrl,
  type YoutubeEntry,
  type YoutubeSection,
} from '~/constants/youtube';
import type { YoutubeVideo } from '~/types';
import YoutubeFeed from './YoutubeFeed.vue';
import { stopAtRowEdge } from './gridKeys';
import YoutubePlayer from './YoutubePlayer.vue';

/** Lê um parâmetro de query como string não vazia. */
function queryString(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

export default defineComponent({
  name: 'YoutubeScreen',

  components: { YoutubeFeed, YoutubePlayer },

  props: {
    /** Configuração da tela — aba YouTube (padrão) ou aba Música. */
    section: { type: Object as PropType<YoutubeSection>, default: () => YOUTUBE_SECTION },
  },

  setup(props) {
    const route = useRoute();
    const router = useRouter();
    const tabs = props.section.tabs;

    /**
     * Estado na URL — sobrevive ao Voltar e ao reload:
     * `aba` (sub-aba), `q`/`cat` (busca/categoria do feed),
     * `play` (playlist da grade) ou `v` (vídeo do feed).
     */
    const activeTab = computed(() => tabs.find((tab) => tab.id === route.query.aba) ?? tabs[0]);
    const feedQuery = computed(() => queryString(route.query.q) ?? '');
    const feedCategory = computed(() => queryString(route.query.cat));

    /** Vídeo escolhido no feed — guarda título/canal e a fila sem depender da lista. */
    const pickedVideo = shallowRef<YoutubeVideo | null>(null);
    const pickedQueue = shallowRef<string[]>([]);

    /** Grade da sub-aba agrupada por `group` (gêneros); sem grupo = um bloco com o nome da aba. */
    const entryGroups = computed(() => {
      const groups: { label: string; entries: YoutubeEntry[] }[] = [];
      for (const entry of activeTab.value.entries) {
        const label = entry.group ?? activeTab.value.label;
        let group = groups.find((item) => item.label === label);
        if (!group) {
          group = { label, entries: [] };
          groups.push(group);
        }
        group.entries.push(entry);
      }
      return groups;
    });

    const selected = computed<YoutubeEntry | null>(() => {
      const videoId = queryString(route.query.v);
      if (videoId) {
        const picked = pickedVideo.value;
        return picked?.videoId === videoId
          ? youtubeVideoEntry(picked, pickedQueue.value)
          : youtubeVideoEntry({ videoId });
      }
      const id = queryString(route.query.play);
      if (!id) return null;
      return activeTab.value.entries.find((entry) => entry.id === id && entry.embeddable) ?? null;
    });

    /** Card que abriu o player — recebe o foco de volta ao fechar (Voltar),
     *  senão o foco caía no <body> e a lista "esquecia" onde a pessoa estava. */
    let opener: HTMLElement | null = null;
    function rememberOpener(): void {
      const active = document.activeElement;
      opener = active instanceof HTMLElement && active !== document.body ? active : null;
    }

    watch(
      () => selected.value !== null,
      (open, wasOpen) => {
        if (open || !wasOpen) return;
        const target = opener;
        opener = null;
        void nextTick(() => {
          if (!target?.isConnected || target.getClientRects().length === 0) return;
          target.focus({ preventScroll: true });
          target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
        });
      },
    );

    /** Query da lista atual (sem o player aberto). */
    function listQuery(overrides: Record<string, string | undefined> = {}): Record<string, string> {
      const base: Record<string, string | undefined> = {
        aba: activeTab.value.id,
        q: feedQuery.value || undefined,
        cat: feedCategory.value ?? undefined,
        ...overrides,
      };
      return Object.fromEntries(Object.entries(base).filter(([, v]) => v)) as Record<string, string>;
    }

    function selectTab(id: string): void {
      void router.replace({ query: { aba: id } });
    }

    function setFeedQuery(q: string): void {
      void router.replace({ query: listQuery({ q: q || undefined }) });
    }

    function setFeedCategory(cat: string | null): void {
      void router.replace({ query: listQuery({ cat: cat ?? undefined, q: undefined }) });
    }

    function openExternal(url: string): void {
      if (Capacitor.isNativePlatform()) void Browser.open({ url });
      else window.open(url, '_blank', 'noopener');
    }

    function openEntry(entry: YoutubeEntry): void {
      if (!entry.embeddable) {
        openExternal(youtubeWatchUrl(entry));
        return;
      }
      rememberOpener();
      void router.push({ query: listQuery({ play: entry.id }) });
    }

    function playVideo(video: YoutubeVideo, queue: string[] = []): void {
      pickedVideo.value = video;
      pickedQueue.value = queue;
      rememberOpener();
      void router.push({ query: listQuery({ v: video.videoId }) });
    }

    function backToList(): void {
      if (window.history.state?.back) router.back();
      else void router.replace({ query: listQuery() });
    }

    function onKeydown(event: KeyboardEvent): void {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (!selected.value || document.fullscreenElement) return;
      event.preventDefault();
      backToList();
    }

    /** Foco inicial no 1º card (o feed chega depois da montagem). Sem foco,
     *  o OK do controle não fazia nada e a 1ª seta entrava pelo meio da tela. */
    let focusTimer: ReturnType<typeof setTimeout> | null = null;
    function focusFirstCard(attempt = 0): void {
      focusTimer = null;
      const active = document.activeElement;
      if (selected.value || (active && active !== document.body)) return;
      const card = document.querySelector<HTMLElement>('[data-yt-scroll] .yt-card');
      if (card && card.getClientRects().length > 0) {
        card.focus({ preventScroll: true });
        return;
      }
      if (attempt < 40) focusTimer = setTimeout(() => focusFirstCard(attempt + 1), 150);
    }

    onMounted(() => {
      window.addEventListener('keydown', onKeydown);
      focusFirstCard();
    });
    onBeforeUnmount(() => {
      window.removeEventListener('keydown', onKeydown);
      if (focusTimer) clearTimeout(focusTimer);
    });

    return {
      tabs,
      activeTab,
      entryGroups,
      stopAtRowEdge,
      feedQuery,
      feedCategory,
      selected,
      selectTab,
      setFeedQuery,
      setFeedCategory,
      openEntry,
      playVideo,
      backToList,
      coverUrl: youtubeCoverUrl,
    };
  },
});
