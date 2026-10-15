<template>
  <div v-if="isLoading" class="space-y-1">
    <LoadingState message="Carregando grade…" class="h-24 justify-center" />
  </div>

  <div v-else-if="error" class="space-y-1">
    <ErrorState
      title="Erro ao carregar grade"
      :message="error"
      :on-retry="load"
    />
  </div>

  <div v-else-if="guide.length > 0" class="space-y-0.5 max-h-60 overflow-y-auto pr-1">
    <button
      v-for="program in guide"
      :key="program.startsAt + program.title"
      type="button"
      class="w-full flex items-start gap-2.5 rounded-md border px-2.5 py-2 text-left transition-colors duration-fast border-line bg-surface/30 hover:border-blue-dark/60 hover:bg-elevated/60"
      @click="pickChannel"
    >
      <div class="flex flex-col items-center justify-center shrink-0 w-14 text-center">
        <span class="text-[0.65rem] font-bold tabular-nums text-ink">{{ formatTimeLocal(program.startsAt) }}</span>
        <span class="text-[0.55rem] text-ink-muted">{{ formatTimeLocal(program.endsAt) }}</span>
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-1.5">
          <p class="truncate text-sm font-medium text-ink">{{ program.title }}</p>
          <span v-if="program.isNow" class="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[0.55rem] font-bold bg-green/20 text-green">AGORA</span>
        </div>
        <p v-if="program.description" class="mt-0.5 line-clamp-2 text-[0.6rem] text-ink-muted">{{ program.description }}</p>
      </div>
      <Icon name="material-symbols:play-arrow-rounded" class="h-4 w-4 shrink-0 text-blue" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { getRepositories } from '~/repositories';
import { formatTime } from '~/utils/live';
import type { GuideProgram, MediaSummary } from '~/types';

interface Props {
  channelId: string;
  channel: MediaSummary;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  pickChannel: [channel: MediaSummary];
}>();

const guideCache = ref<Map<string, GuideProgram[]>>(new Map());
const guideLoading = ref<Set<string>>(new Set());
const guideError = ref<Map<string, string>>(new Map());

const isLoading = computed(() => guideLoading.value.has(props.channelId));
const error = computed(() => guideError.value.get(props.channelId));
const guide = computed(() => guideCache.value.get(props.channelId) ?? []);

function formatTimeLocal(isoString: string): string {
  return formatTime(isoString);
}

async function load(): Promise<void> {
  if (guideCache.value.has(props.channelId)) return;
  if (guideLoading.value.has(props.channelId)) return;

  guideLoading.value.add(props.channelId);
  guideError.value.delete(props.channelId);

  try {
    const repository = getRepositories().media;
    const nowNext = await repository.getNowNext(props.channelId);
    
    const guideData: GuideProgram[] = [];
    if (nowNext.now) guideData.push({ ...nowNext.now, isNow: true });
    if (nowNext.next) guideData.push({ ...nowNext.next, isNow: false });
    
    guideCache.value.set(props.channelId, guideData);
    guideError.value.delete(props.channelId);
  } catch (err: any) {
    guideError.value.set(props.channelId, err?.message || 'Não foi possível carregar a grade');
    guideCache.value.set(props.channelId, []);
  } finally {
    guideLoading.value.delete(props.channelId);
  }
}

function pickChannel(): void {
  emit('pickChannel', props.channel);
}

// Auto-load when component mounts
onMounted(() => {
  load();
});

watch(
  () => props.channelId,
  () => {
    load();
  },
);
</script>

<style scoped>
/* Scrollbar fina */
.max-h-60::-webkit-scrollbar {
  width: 3px;
}
.max-h-60::-webkit-scrollbar-track {
  background: transparent;
}
.max-h-60::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
}
.max-h-60::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>