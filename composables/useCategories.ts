import { computed } from 'vue';
import { useAsyncData } from '#imports';
import { getRepositories } from '~/repositories';
import { isAdultCategory } from '~/utils/adult';
import type { Category } from '~/types';

export interface CategoriesResult {
  categories: ComputedRef<Category[]>;
  isLoading: ComputedRef<boolean>;
  error: Ref<Error | null>;
  refresh: () => Promise<void>;
}

/** Categorias são poucas e estáveis — cacheadas em sessão (payload/SSR + hidratação). */
export function useCategories(): CategoriesResult {
  const repository = getRepositories().media;
  const adultUnlocked = useState<boolean>('adult.unlocked', () => false);

  const { data, status, error, refresh } = useAsyncData(
    'categories',
    () => repository.listCategories(),
    { transform: (result) => result.items },
  );

  // Adulto fora da lista até o desbloqueio — vale pra home, abas, sidebar e cards.
  const categories = computed(() => {
    const items = data.value ?? [];
    return adultUnlocked.value ? items : items.filter((item) => !isAdultCategory(item.slug));
  });
  const isLoading = computed(() => status.value === 'pending');

  return { categories, isLoading, error, refresh };
}
