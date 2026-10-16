import { ref, watch } from 'vue';
import { getRepositories } from '~/repositories';
import { splitQualitySuffix, variantLabel, qualityLabelRank } from '~/utils/live';
import type { QualityOption } from '~/components/player/PlayerHud.vue';
import type { MediaDetail } from '~/types';

/**
 * Variantes de qualidade de canal live (FHD/HD/H265/SD…) no HUD.
 * Busca pela base do nome ("SPORTV 2") e mantém só títulos com a mesma base;
 * sem variantes suficientes o botão simplesmente não aparece.
 */
export function useLiveQualityVariants(media: () => MediaDetail | null) {
  const qualityOptions = ref<QualityOption[]>([]);

  watch(media, async (value) => {
    qualityOptions.value = [];
    if (!value || value.type !== 'live') return;

    const requestedId = value.id;
    const { base } = splitQualitySuffix(value.title);

    try {
      const repository = getRepositories().media;
      const result = await repository.search({ q: base, type: 'live', limit: 50 });
      if (media()?.id !== requestedId) return;

      const variants = result.items.filter(
        (item) => splitQualitySuffix(item.title).base.toLowerCase() === base.toLowerCase(),
      );
      if (variants.length < 2) return;

      qualityOptions.value = variants
        .map((item) => ({
          label: variantLabel(item.title, item.quality),
          slug: item.slug,
          current: item.id === requestedId,
        }))
        .sort(
          (a, b) =>
            qualityLabelRank(a.label) - qualityLabelRank(b.label) ||
            a.label.localeCompare(b.label),
        );
    } catch {
      /* sem variantes — botão de qualidade não aparece */
    }
  }, { immediate: true });

  function openQualityVariant(slug: string): void {
    navigateTo(`/medias/${slug}`);
  }

  return { qualityOptions, openQualityVariant };
}
