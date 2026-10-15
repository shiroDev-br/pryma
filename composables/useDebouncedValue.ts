import { ref, watch, onScopeDispose } from 'vue';
import { DEBOUNCE_MS } from '~/constants';

/** Espelha um valor com atraso — base do debounce de busca. */
export function useDebouncedValue<T>(source: Ref<T>, delay = DEBOUNCE_MS): Ref<T> {
  const debounced = ref(source.value) as Ref<T>;
  let timer: ReturnType<typeof setTimeout> | undefined;

  watch(source, (value) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      debounced.value = value;
    }, delay);
  });

  onScopeDispose(() => clearTimeout(timer));

  return debounced;
}
