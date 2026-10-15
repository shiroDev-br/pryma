import { computed } from 'vue';
import { useRoute, useRouter } from '#imports';

/**
 * Sincroniza um valor com um parâmetro de query da URL (busca, filtro, página).
 * URLs compartilhistáveis + voltar/avançar do navegador funcionam sem esforço.
 */
export function useRouteQueryState(key: string, defaultValue = ''): Ref<string> {
  const route = useRoute();
  const router = useRouter();

  return computed({
    get() {
      const value = route.query[key];
      return typeof value === 'string' ? value : defaultValue;
    },
    set(value: string) {
      const query = { ...route.query };

      if (value && value !== defaultValue) query[key] = value;
      else delete query[key];

      router.replace({ query });
    },
  }) as Ref<string>;
}
