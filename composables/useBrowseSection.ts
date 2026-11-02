import { computed } from 'vue';
import { SECTIONS, isSectionKey } from '~/constants';
import { categoryBelongsToSection } from '~/utils/categorySections';
import type { SectionKey } from '~/constants';

/** Conteúdo adulto fica fora até o desbloqueio (flag pronta, nunca vem do servidor). */
export function useAdultUnlocked() {
  return useState<boolean>('adult.unlocked', () => false);
}

/** Seção de `/browse/[section]` — fora da lista, 404. */
export function useBrowseSection() {
  const param = String(useRoute().params.section);
  if (!isSectionKey(param)) {
    throw createError({ statusCode: 404, statusMessage: 'Seção não encontrada', fatal: true });
  }
  return { section: param, sectionDef: SECTIONS[param] };
}

/** Categorias de uma seção (useCategories já tira as adultas). */
export function useSectionCategories(section: SectionKey) {
  const categories = useCategories();
  const sectionCategories = computed(() =>
    categories.categories.value.filter((category) => categoryBelongsToSection(category, section)),
  );
  return { categories, sectionCategories };
}
