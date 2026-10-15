import { computed, onBeforeUnmount, onMounted, ref, shallowRef, toValue, watch } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import { getRepositories } from '~/repositories';
import type { GuideProgram } from '~/types';

const TICK_MS = 30_000;
const UPCOMING_LIMIT = 4;

interface TimedProgram extends GuideProgram {
  start: number;
  end: number;
}

export function useChannelGuide(channelId: MaybeRefOrGetter<string | null>) {
  const programs = shallowRef<TimedProgram[]>([]);
  const now = ref(Date.now());
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  let requestId = 0;
  let timer: ReturnType<typeof setInterval> | undefined;

  async function loadGuide(id: string): Promise<void> {
    isLoading.value = true;
    error.value = null;

    const current = ++requestId;
    try {
      const repository = getRepositories().media;
      const nowNext = await repository.getNowNext(id);
      
      if (current !== requestId) return;

      const guideData: GuideProgram[] = [];
      if (nowNext.now) guideData.push({ ...nowNext.now, isNow: true });
      if (nowNext.next) guideData.push({ ...nowNext.next, isNow: false });

      programs.value = guideData
        .map((program) => ({
          ...program,
          start: Date.parse(program.startsAt),
          end: Date.parse(program.endsAt),
        }))
        .filter((program) => Number.isFinite(program.start) && Number.isFinite(program.end))
        .sort((a, b) => a.start - b.start);

      error.value = null;
    } catch (err: any) {
      if (current === requestId) {
        programs.value = [];
        error.value = err?.message || 'Não foi possível carregar a grade';
      }
    } finally {
      if (current === requestId) {
        isLoading.value = false;
      }
    }
  }

  watch(
    () => toValue(channelId),
    async (id) => {
      programs.value = [];
      if (!id || import.meta.server) return;
      await loadGuide(id);
    },
    { immediate: true },
  );

  onMounted(() => {
    now.value = Date.now();
    timer = setInterval(() => {
      now.value = Date.now();
    }, TICK_MS);
  });

  onBeforeUnmount(() => clearInterval(timer));

  const current = computed(
    () => programs.value.find((program) => program.start <= now.value && now.value < program.end) ?? null,
  );

  const upcoming = computed(() =>
    programs.value.filter((program) => program.start > now.value).slice(0, UPCOMING_LIMIT),
  );

  /** Programa atual + próximos — a lista "Programação". */
  const schedule = computed(() => (current.value ? [current.value, ...upcoming.value] : upcoming.value));

  /** 0–1 — quanto do programa atual já passou. */
  const progress = computed(() => {
    const program = current.value;
    if (!program) return 0;
    return Math.min(1, Math.max(0, (now.value - program.start) / (program.end - program.start)));
  });

  const remainingMinutes = computed(() => {
    const program = current.value;
    return program ? Math.max(0, Math.ceil((program.end - now.value) / 60_000)) : 0;
  });

  return { current, upcoming, schedule, progress, remainingMinutes, isLoading, error };
}