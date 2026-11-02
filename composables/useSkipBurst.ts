import { computed, onBeforeUnmount, ref, watch } from 'vue';
import type { Ref } from 'vue';
import { formatDuration } from '~/utils/format';

/** Pausa entre toques que fecha a rajada e faz o seek de verdade (um só, não um por toque). */
const COMMIT_MS = 550;
/** Quanto o selo "+30s" fica na tela depois do último toque. */
const BADGE_MS = 1200;
/** Segura a barra no alvo até o vídeo chegar lá; depois disso desiste (stream não respondeu). */
const SETTLE_MS = 4000;
/** Tempo do vídeo a essa distância do alvo já conta como "chegou". */
const ARRIVED_S = 1.5;

export interface UseSkipBurstOptions {
  currentTime: Ref<number>;
  duration: Ref<number>;
  seek: (seconds: number) => void;
}

/**
 * ±10 s acumulados: cada toque soma ao alvo e a barra anda na hora; o seek no
 * vídeo só sai quando o usuário para de apertar (HLS na TV engasgava com um seek
 * por toque).
 */
export function useSkipBurst({ currentTime, duration, seek }: UseSkipBurstOptions) {
  /** Posição para onde a rajada vai — a barra e o relógio já mostram ela. */
  const target = ref<number | null>(null);
  /** Segundos pulados na rajada atual (soma dos toques, já limitada ao início/fim). */
  const total = ref(0);
  const badgeVisible = ref(false);

  let origin = 0;
  let commitTimer: ReturnType<typeof setTimeout> | undefined;
  let badgeTimer: ReturnType<typeof setTimeout> | undefined;
  let settleTimer: ReturnType<typeof setTimeout> | undefined;

  const displayTime = computed(() => target.value ?? currentTime.value);

  const label = computed(() => {
    const seconds = Math.abs(Math.round(total.value));
    const text = seconds >= 60 ? formatDuration(seconds) : `${seconds}s`;
    return `${total.value < 0 ? '−' : '+'}${text}`;
  });

  function skipBy(delta: number): void {
    clearTimeout(settleTimer);

    if (!badgeVisible.value) {
      origin = target.value ?? currentTime.value;
      total.value = 0;
    }
    const end = duration.value > 0 ? duration.value : Number.POSITIVE_INFINITY;
    const next = Math.min(Math.max((target.value ?? currentTime.value) + delta, 0), end);
    target.value = next;
    total.value = next - origin;

    badgeVisible.value = true;
    clearTimeout(badgeTimer);
    badgeTimer = setTimeout(() => {
      badgeVisible.value = false;
    }, BADGE_MS);

    clearTimeout(commitTimer);
    commitTimer = setTimeout(() => {
      commitTimer = undefined;
      seek(next);
      settleTimer = setTimeout(() => {
        target.value = null;
      }, SETTLE_MS);
    }, COMMIT_MS);
  }

  watch(currentTime, (time) => {
    if (target.value === null || commitTimer) return;
    if (Math.abs(time - target.value) < ARRIVED_S) {
      clearTimeout(settleTimer);
      target.value = null;
    }
  });

  onBeforeUnmount(() => {
    clearTimeout(commitTimer);
    clearTimeout(badgeTimer);
    clearTimeout(settleTimer);
  });

  return { skipBy, displayTime, total, label, badgeVisible };
}
