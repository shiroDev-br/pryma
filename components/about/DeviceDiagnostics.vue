<template>
  <!-- Diagnóstico do aparelho: o que a WebView desta TV/Fire Stick suporta.
       Sem flex gap (WebView < 84 ignora) — espaçamento por margem. -->
  <section class="mb-8 rounded-md border border-line bg-surface/50 p-5" aria-labelledby="diag-title">
    <h2 id="diag-title" class="text-base font-semibold text-ink">Diagnóstico do aparelho</h2>
    <p class="mt-1 text-sm text-ink-muted">
      Tire uma foto desta área e mande para o suporte se algo não funcionar.
    </p>

    <dl class="mt-4 grid grid-cols-1 text-sm sm:grid-cols-2">
      <div v-for="row in rows" :key="row.label" class="flex items-baseline border-t border-white/[0.06] py-2 pr-6">
        <dt class="w-44 shrink-0 text-ink-muted">{{ row.label }}</dt>
        <dd class="min-w-0 font-medium tabular-nums" :class="toneClass(row.tone)">{{ row.value }}</dd>
      </div>
    </dl>

    <div class="mt-4 flex flex-wrap items-center">
      <button
        type="button"
        class="mr-4 inline-flex h-10 items-center rounded-full border border-line bg-elevated/70 px-5 text-sm font-medium text-ink transition-colors duration-fast hover:border-blue/50 focus:outline-none focus-visible:shadow-focus disabled:opacity-60"
        :disabled="testing"
        @click="testDecoders"
      >
        {{ testing ? 'Testando…' : 'Testar vídeos simultâneos' }}
      </button>
      <span v-if="decoderResult" class="text-sm" :class="toneClass(decoderTone)">{{ decoderResult }}</span>
    </div>

    <!-- Vídeos do teste: fora da área visível, mas do tamanho de um vídeo real. -->
    <div class="pointer-events-none fixed -left-[9999px] top-0" aria-hidden="true">
      <video
        v-for="n in testCount"
        :key="n"
        ref="testVideos"
        :src="INTRO_SRC"
        :poster="BLANK_POSTER"
        width="320"
        height="180"
        muted
        playsinline
        preload="auto"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { BLANK_POSTER } from '~/constants';
import { releaseVideo } from '~/utils/video';

type Tone = 'ok' | 'warn' | 'bad' | 'info';

interface Row {
  label: string;
  value: string;
  tone: Tone;
}

/** Vídeo local do app (H.264 1080p) — o teste não depende de rede nem de provedor. */
const INTRO_SRC = '/intro/pryma-intro.mp4';
/** Quantos vídeos o teste tenta tocar juntos (fundo + prévia + intro = 3 no pior caso). */
const TEST_MAX = 3;

const rows = ref<Row[]>([]);

function toneClass(tone: Tone): string {
  if (tone === 'ok') return 'text-[#3ddc84]';
  if (tone === 'warn') return 'text-[#ffc94d]';
  if (tone === 'bad') return 'text-[#ff6b6b]';
  return 'text-ink';
}

function yesNo(value: boolean, whenNo: Tone = 'bad'): Pick<Row, 'value' | 'tone'> {
  return value ? { value: 'Sim', tone: 'ok' } : { value: 'Não', tone: whenNo };
}

function mseSupports(type: string): boolean {
  const ms = (window as Window & { MediaSource?: typeof MediaSource }).MediaSource;
  try {
    return !!ms && ms.isTypeSupported(type);
  } catch {
    return false;
  }
}

/** `powerEfficient` ≈ decodificação por hardware (quando a WebView informa). */
async function hardwareHint(contentType: string): Promise<string> {
  const capabilities = (navigator as Navigator & { mediaCapabilities?: MediaCapabilities }).mediaCapabilities;
  if (!capabilities?.decodingInfo) return 'não informado';
  try {
    const info = await capabilities.decodingInfo({
      type: 'media-source',
      video: { contentType, width: 1920, height: 1080, bitrate: 6_000_000, framerate: 30 },
    });
    if (!info.supported) return 'não suportado';
    return info.powerEfficient ? 'hardware' : info.smooth ? 'software (fluido)' : 'software (lento)';
  } catch {
    return 'não informado';
  }
}

/** flex gap (Chrome 84+): mede um flex com gap de 1px. */
function supportsFlexGap(): boolean {
  const flex = document.createElement('div');
  flex.style.display = 'flex';
  flex.style.flexDirection = 'column';
  flex.style.rowGap = '1px';
  flex.appendChild(document.createElement('div'));
  flex.appendChild(document.createElement('div'));
  document.body.appendChild(flex);
  const supported = flex.scrollHeight === 1;
  flex.remove();
  return supported;
}

function cssSupports(condition: string): boolean {
  try {
    return typeof CSS !== 'undefined' && CSS.supports(condition);
  } catch {
    return false;
  }
}

onMounted(async () => {
  const ua = navigator.userAgent;
  const chrome = ua.match(/Chrom(?:e|ium)\/([\d.]+)/)?.[1] ?? '?';
  const major = Number.parseInt(chrome, 10) || 0;
  const android = ua.match(/Android ([\d.]+)/)?.[1];
  const fire = /AFT|Amazon|Silk/i.test(ua);
  const nav = navigator as Navigator & { deviceMemory?: number };

  const h264 = 'video/mp4; codecs="avc1.640028"';
  const hevc = 'video/mp4; codecs="hvc1.1.6.L120.90"';
  const [h264Hw, hevcHw] = await Promise.all([hardwareHint(h264), hardwareHint(hevc)]);

  rows.value = [
    {
      label: 'Navegador (WebView)',
      value: `Chrome ${chrome}`,
      tone: !major ? 'info' : major >= 88 ? 'ok' : major >= 69 ? 'warn' : 'bad',
    },
    { label: 'Sistema', value: `${fire ? 'Fire OS · ' : ''}Android ${android ?? '?'}`, tone: 'info' },
    {
      label: 'Tela',
      value: `${window.innerWidth}×${window.innerHeight} · DPR ${window.devicePixelRatio || 1}`,
      tone: 'info',
    },
    {
      label: 'Memória · núcleos',
      value: `${nav.deviceMemory ? `${nav.deviceMemory} GB` : '?'} · ${navigator.hardwareConcurrency || '?'}`,
      tone: 'info',
    },
    { label: 'MediaSource (MSE)', ...yesNo(!!(window as Window & { MediaSource?: unknown }).MediaSource) },
    { label: 'H.264 (MSE)', value: mseSupports(h264) ? `Sim · ${h264Hw}` : 'Não', tone: mseSupports(h264) ? 'ok' : 'bad' },
    {
      label: 'H.265/HEVC (MSE)',
      value: mseSupports(hevc) ? `Sim · ${hevcHw}` : 'Não',
      tone: mseSupports(hevc) ? 'ok' : 'warn',
    },
    { label: 'CSS :where()', ...yesNo(cssSupports('selector(:where(a))'), 'warn') },
    { label: 'CSS flex gap', ...yesNo(supportsFlexGap(), 'warn') },
    { label: 'CSS aspect-ratio', ...yesNo(cssSupports('aspect-ratio: 1 / 1'), 'warn') },
  ];
});

/* ── Teste de vídeos simultâneos (limite de decodificadores) ───────────── */

const testing = ref(false);
const testCount = ref(0);
const testVideos = ref<HTMLVideoElement[]>([]);
const decoderResult = ref('');
const decoderTone = ref<Tone>('info');

function playing(video: HTMLVideoElement, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(video.currentTime > 0), timeoutMs);
    video.addEventListener('timeupdate', function onTime() {
      if (video.currentTime > 0.2) {
        clearTimeout(timer);
        video.removeEventListener('timeupdate', onTime);
        resolve(true);
      }
    });
    video.addEventListener('error', () => {
      clearTimeout(timer);
      resolve(false);
    }, { once: true });
    void video.play().catch(() => resolve(false));
  });
}

/** Toca 1, depois 2, depois 3 vídeos juntos — para no primeiro que falhar. */
async function testDecoders(): Promise<void> {
  testing.value = true;
  decoderResult.value = '';
  let ok = 0;
  try {
    for (let n = 1; n <= TEST_MAX; n += 1) {
      testCount.value = n;
      await nextTick();
      const results = await Promise.all(testVideos.value.slice(0, n).map((video) => playing(video, 5000)));
      testVideos.value.forEach(releaseVideo);
      if (!results.every(Boolean)) break;
      ok = n;
      // Recarrega os <video> do zero para a próxima rodada.
      testCount.value = 0;
      await nextTick();
    }
  } finally {
    testVideos.value.forEach(releaseVideo);
    testCount.value = 0;
    testing.value = false;
  }
  decoderResult.value =
    ok >= TEST_MAX ? `${TEST_MAX}+ vídeos juntos` : ok === 0 ? 'Nenhum vídeo tocou' : `Até ${ok} vídeo${ok > 1 ? 's' : ''} juntos`;
  decoderTone.value = ok >= 2 ? 'ok' : ok === 1 ? 'warn' : 'bad';
}
</script>
