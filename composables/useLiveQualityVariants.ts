import { ref, shallowRef, watch } from 'vue';
import { getRepositories } from '~/repositories';
import { splitQualitySuffix, variantLabel, qualityLabelRank } from '~/utils/live';
import type { QualityOption } from '~/components/player/PlayerHud.vue';
import type { MediaSummary } from '~/types';

/** Variante de um canal pronta pra listar (rótulo FHD/HD/SD/H265 + o canal em si). */
export interface LiveVariant {
  label: string;
  media: MediaSummary;
}

/** Variantes já buscadas, por nome-base — voltar a um canal não repete a busca. */
const variantCache = new Map<string, MediaSummary[]>();

interface UseLiveQualityVariantsOptions {
  /** Espera antes de buscar (ms) — lista navegada por seta troca de canal a cada passo. */
  delay?: number;
}

/**
 * Variantes de qualidade de canal live (FHD/HD/H265/SD…) no HUD e na prévia.
 * Busca pela base do nome ("SPORTV 2") e mantém só títulos com a mesma base;
 * sem variantes suficientes as opções simplesmente não aparecem.
 */
export function useLiveQualityVariants(
  media: () => MediaSummary | null,
  options: UseLiveQualityVariantsOptions = {},
) {
  const variants = ref<LiveVariant[]>([]);
  const qualityOptions = ref<QualityOption[]>([]);
  /** Todas as entradas do canal (inclusive duas "HD" iguais), da melhor pra pior — fontes do failover. */
  const groupItems = shallowRef<MediaSummary[]>([]);
  let timer: ReturnType<typeof setTimeout> | undefined;

  function apply(items: MediaSummary[], currentId: string): void {
    groupItems.value = [...items].sort(
      (a, b) =>
        qualityLabelRank(variantLabel(a.title, a.quality)) - qualityLabelRank(variantLabel(b.title, b.quality)),
    );
    // Um botão por rótulo: dois "HD" são indistinguíveis pra quem escolhe (fica o atual, se houver).
    const byLabel = new Map<string, LiveVariant>();
    for (const item of items) {
      const label = variantLabel(item.title, item.quality);
      if (!byLabel.has(label) || item.id === currentId) byLabel.set(label, { label, media: item });
    }
    if (byLabel.size < 2) return;
    variants.value = [...byLabel.values()]
      .sort(
        (a, b) =>
          qualityLabelRank(a.label) - qualityLabelRank(b.label) ||
          a.label.localeCompare(b.label),
      );
    qualityOptions.value = variants.value.map((variant) => ({
      label: variant.label,
      slug: variant.media.slug,
      current: variant.media.id === currentId,
    }));
  }

  async function load(value: MediaSummary): Promise<void> {
    const requestedId = value.id;
    const { base } = splitQualitySuffix(value.title);
    const key = base.toLowerCase();

    let items = variantCache.get(key);
    if (!items) {
      try {
        const repository = getRepositories().media;
        const result = await repository.search({ q: base, type: 'live', limit: 50 });
        items = result.items.filter((item) => splitQualitySuffix(item.title).base.toLowerCase() === key);
        variantCache.set(key, items);
      } catch {
        return; // sem variantes — as opções não aparecem
      }
    }
    if (media()?.id !== requestedId) return;
    apply(items, requestedId);
  }

  watch(
    () => media()?.id,
    () => {
      if (timer) clearTimeout(timer);
      const value = media();
      // Mesmo grupo de variantes (ex.: trocou de HD pra FHD): mantém a lista, só marca a atual.
      const sameGroup = value && variants.value.some((variant) => variant.media.id === value.id);
      if (sameGroup) {
        qualityOptions.value = qualityOptions.value.map((option) => ({
          ...option,
          current: option.slug === value.slug,
        }));
        return;
      }
      variants.value = [];
      qualityOptions.value = [];
      groupItems.value = [];
      if (!value || value.type !== 'live') return;
      if (options.delay) timer = setTimeout(() => void load(value), options.delay);
      else void load(value);
    },
    { immediate: true },
  );

  onScopeDispose(() => {
    if (timer) clearTimeout(timer);
  });

  /** Troca a variante no lugar (replace): é o mesmo canal, não uma tela nova —
   *  com push, o Voltar caía na qualidade anterior em vez da TV ao vivo. */
  function openQualityVariant(slug: string): void {
    // `pick=1`: escolha explícita — o failover não troca pela fonte lembrada.
    navigateTo(`/medias/${slug}?pick=1`, { replace: true });
  }

  return { variants, qualityOptions, groupItems, openQualityVariant };
}
