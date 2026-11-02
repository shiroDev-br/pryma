import { onBeforeUnmount, ref } from 'vue';
import type { Ref } from 'vue';
import { STORAGE_KEYS } from '~/constants';
import { getRepositories } from '~/repositories';
import { splitQualitySuffix, variantLabel } from '~/utils/live';
import type { MediaSummary, PlaybackProtocol, PlaybackSession } from '~/types';

/** Uma fonte tocável do canal: uma versão (FHD/HD/SD…) num formato (MPEG-TS ou HLS). */
export interface LiveSource {
  mediaId: string;
  url: string;
  protocol: PlaybackProtocol;
  /** Rótulo da versão (FHD, HD…) — o HUD marca a que está tocando. */
  label: string;
}

/** Formato pela URL — é o que o motor usa para escolher hls.js ou mpegts.js. */
function formatOf(url: string): 'hls' | 'ts' {
  return /m3u8/i.test(url) ? 'hls' : 'ts';
}

function sourceKey(mediaId: string, url: string): string {
  return `${mediaId}|${formatOf(url)}`;
}

/* ── Fonte boa por canal (localStorage) ───────────────────────────────── */

interface GoodSource {
  mediaId: string;
  format: 'hls' | 'ts';
  at: number;
}

/** Fonte lembrada vale por um tempo: o provedor que travou ontem pode estar bem hoje. */
const GOOD_SOURCE_TTL_MS = 12 * 60 * 60 * 1000;
const GOOD_SOURCE_MAX = 300;

function groupKey(media: MediaSummary): string {
  return splitQualitySuffix(media.title).base.toLowerCase();
}

function readGoodSources(): Record<string, GoodSource> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.liveGoodSources);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, GoodSource>) : {};
  } catch {
    return {};
  }
}

function rememberGoodSource(group: string, source: LiveSource): void {
  try {
    const all = readGoodSources();
    all[group] = { mediaId: source.mediaId, format: formatOf(source.url), at: Date.now() };
    const entries = Object.entries(all).sort((a, b) => b[1].at - a[1].at).slice(0, GOOD_SOURCE_MAX);
    localStorage.setItem(STORAGE_KEYS.liveGoodSources, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Sem storage: só não lembra.
  }
}

function recallGoodSource(group: string): GoodSource | null {
  const entry = readGoodSources()[group];
  if (!entry || Date.now() - entry.at > GOOD_SOURCE_TTL_MS) return null;
  return entry;
}

/* ── Composable ───────────────────────────────────────────────────────── */

/** Imagem parada por isso (já tendo tocado) = travou. */
const STALL_MS = 5000;
/** Primeiro quadro de uma fonte nova: conectar no provedor demora mais que um engasgo. */
const START_MS = 10_000;
/** Tocando firme por isso: a fonte volta a ter direito a uma reconexão e a lista recomeça. */
const STABLE_MS = 60_000;
/** Aviso "Conectado" some depois disso. */
const NOTICE_OK_MS = 1500;
/** Outras versões tentadas no máximo — canal com dezenas de homônimos não vira maratona. */
const MAX_ALTERNATIVES = 4;
/** Pausa antes de cada nova tentativa: fonte que cai na hora não martela o provedor
 *  (nem o aviso pisca rápido demais para ler). */
const RETRY_GAP_MS = 1000;

export interface UseLiveFailoverOptions {
  videoEl: Ref<HTMLVideoElement | null>;
  /** Canal pedido (o failover só age em canal ao vivo). */
  media: () => MediaSummary | null;
  /** Todas as entradas do mesmo canal, melhor → pior (`groupItems` de useLiveQualityVariants). */
  alternatives: Ref<MediaSummary[]>;
  /** Liga a fonte no <video> (o chamador derruba a anterior antes). */
  attach: (source: LiveSource) => void | Promise<void>;
  /** Derruba o stream atual (conexão + decoder). */
  detach: () => void;
  /** false = escolha explícita do usuário (ex.: botão de qualidade): não troca pela fonte lembrada. */
  useRemembered?: () => boolean;
  /** Imagem parada por mais que isso = travou (padrão STALL_MS). */
  stallMs?: number;
  /** Prazo para o 1º quadro de uma fonte (padrão START_MS). */
  startMs?: number;
}

/**
 * Failover de canal ao vivo: imagem parada por 5 s (ou erro fatal do motor)
 * → reconecta a mesma fonte uma vez → passa para a próxima: o mesmo canal no
 * outro formato (.ts ↔ .m3u8) e depois as outras versões (FHD/HD/SD…), cada
 * uma nos dois formatos. A fonte que funcionou fica lembrada por canal.
 *
 * Sempre uma conexão por vez: a fonte anterior é derrubada antes da próxima
 * (provedores IPTV costumam aceitar uma só por conta).
 */
export function useLiveFailover(options: UseLiveFailoverOptions) {
  const { videoEl } = options;
  const stallMs = options.stallMs ?? STALL_MS;
  const startMs = options.startMs ?? START_MS;

  /** Aviso na tela ("Reconectando…", "Trocando de fonte (2/4)…") — null = nada. */
  const notice = ref<string | null>(null);
  /** Todas as fontes travaram — a tela mostra o erro com "Tentar de novo". */
  const exhausted = ref(false);
  const current = ref<LiveSource | null>(null);

  const repository = getRepositories().media;
  const sessionCache = new Map<string, LiveSource[]>();
  const tried = new Set<string>();
  let reconnected = false;
  let attempt = 0;
  let generation = 0;
  let watchTimer: ReturnType<typeof setInterval> | undefined;
  let noticeTimer: ReturnType<typeof setTimeout> | undefined;
  let attachedAt = 0;
  let lastTime = -1;
  let lastProgressAt = 0;
  let playingSince = 0;
  let confirmed = false;
  /** Troca em andamento — o vigia e erros do motor esperam ela terminar. */
  let busy = false;
  /** A fonte nova deu erro enquanto ainda ligava — trata assim que a troca termina. */
  let pendingFail = false;

  function sourcesOf(session: PlaybackSession, label: string): LiveSource[] {
    return [
      { mediaId: session.mediaId, url: session.url, protocol: session.protocol, label },
      ...(session.alternates ?? []).map((alt) => ({
        mediaId: session.mediaId,
        url: alt.url,
        protocol: alt.protocol,
        label,
      })),
    ];
  }

  async function resolve(media: MediaSummary): Promise<LiveSource[]> {
    const cached = sessionCache.get(media.id);
    if (cached) return cached;
    try {
      const session = await repository.getPlayback(media.id);
      const sources = sourcesOf(session, variantLabel(media.title, media.quality));
      sessionCache.set(media.id, sources);
      return sources;
    } catch {
      sessionCache.set(media.id, []);
      return [];
    }
  }

  /** Versões na ordem de tentativa: a pedida primeiro, depois as outras (melhor → pior). */
  function candidates(): MediaSummary[] {
    const requested = options.media();
    if (!requested) return [];
    const others = options.alternatives.value.filter((media) => media.id !== requested.id);
    return [requested, ...others.slice(0, MAX_ALTERNATIVES)];
  }

  /** Total estimado de fontes (versão não resolvida conta 2: .ts + .m3u8). */
  function estimatedTotal(): number {
    return candidates().reduce((sum, media) => sum + (sessionCache.get(media.id)?.length ?? 2), 0);
  }

  async function nextSource(): Promise<LiveSource | null> {
    for (const media of candidates()) {
      const sources = await resolve(media);
      const source = sources.find((item) => !tried.has(sourceKey(item.mediaId, item.url)));
      if (source) return source;
    }
    return null;
  }

  function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function setNotice(text: string | null, autoHideMs?: number): void {
    clearTimeout(noticeTimer);
    notice.value = text;
    if (text && autoHideMs) noticeTimer = setTimeout(() => (notice.value = null), autoHideMs);
  }

  async function play(source: LiveSource): Promise<void> {
    tried.add(sourceKey(source.mediaId, source.url));
    current.value = source;
    attachedAt = performance.now();
    lastTime = -1;
    lastProgressAt = 0;
    playingSince = 0;
    confirmed = false;
    options.detach();
    await options.attach(source);
  }

  function startWatch(): void {
    clearInterval(watchTimer);
    watchTimer = setInterval(check, 1000);
  }

  /** Vigia: o tempo do vídeo precisa andar enquanto ele devia estar tocando. */
  function check(): void {
    const video = videoEl.value;
    if (!video || !current.value || exhausted.value || busy) return;
    if (typeof document !== 'undefined' && document.hidden) return;

    const now = performance.now();
    if (video.currentTime !== lastTime && video.currentTime > 0) {
      lastTime = video.currentTime;
      lastProgressAt = now;
      if (!playingSince) playingSince = now;
      onHealthy(now);
      return;
    }
    // Pausa do próprio usuário (antes de travar) não é travamento.
    if (video.paused && lastProgressAt && video.readyState >= 3) return;

    const stalled = lastProgressAt ? now - lastProgressAt > stallMs : now - attachedAt > startMs;
    if (stalled) void failover();
  }

  function onHealthy(now: number): void {
    const source = current.value;
    const media = options.media();
    if (!source || !media) return;
    if (!confirmed) {
      confirmed = true;
      rememberGoodSource(groupKey(media), source);
      if (notice.value) setNotice('Conectado', NOTICE_OK_MS);
    }
    if (now - playingSince > STABLE_MS && (reconnected || tried.size > 1)) {
      // Fonte firme: próximo travamento começa reconectando e pode revisitar as outras.
      reconnected = false;
      tried.clear();
      tried.add(sourceKey(source.mediaId, source.url));
    }
  }

  /** Travou (vigia) ou o motor desistiu: reconecta uma vez, depois troca de fonte. */
  async function failover(): Promise<void> {
    const source = current.value;
    if (!source || exhausted.value || busy) return;
    const gen = ++generation;
    busy = true;
    try {
      await switchSource(source, gen);
    } finally {
      if (gen === generation) {
        busy = false;
        if (pendingFail) {
          pendingFail = false;
          void failover();
        }
      }
    }
  }

  async function switchSource(source: LiveSource, gen: number): Promise<void> {
    options.detach();
    if (!reconnected) {
      reconnected = true;
      setNotice('Reconectando…');
      await wait(RETRY_GAP_MS);
      if (gen !== generation) return;
      await play(source);
      return;
    }

    setNotice('Trocando de fonte…');
    const [next] = await Promise.all([nextSource(), wait(RETRY_GAP_MS)]);
    if (gen !== generation) return;
    if (!next) {
      clearInterval(watchTimer);
      options.detach();
      current.value = null;
      exhausted.value = true;
      setNotice(null);
      return;
    }
    reconnected = true; // a fonte nova já conta como tentativa — sem reconexão extra nela
    attempt += 1;
    setNotice(`Trocando de fonte (${Math.min(attempt + 1, estimatedTotal())}/${estimatedTotal()})…`);
    await play(next);
  }

  /** Abre o canal. `session` = sessão já carregada da versão pedida (evita outro request). */
  async function start(session?: PlaybackSession | null): Promise<void> {
    stop();
    const media = options.media();
    if (!media) return;
    const gen = generation;

    if (session && session.mediaId === media.id) {
      sessionCache.set(media.id, sourcesOf(session, variantLabel(media.title, media.quality)));
    }

    let first: LiveSource | null = null;
    const remembered = options.useRemembered?.() === false ? null : recallGoodSource(groupKey(media));
    if (remembered) {
      const rememberedMedia = candidates().find((item) => item.id === remembered.mediaId);
      if (rememberedMedia) {
        const sources = await resolve(rememberedMedia);
        first = sources.find((item) => formatOf(item.url) === remembered.format) ?? null;
      }
    }
    if (gen !== generation) return;
    first ??= (await resolve(media))[0] ?? null;
    if (gen !== generation) return;
    if (!first) {
      exhausted.value = true;
      return;
    }
    await play(first);
    startWatch();
  }

  /** Motor desistiu (erro fatal) — trata como travamento. */
  function fail(): void {
    if (busy) pendingFail = true;
    else void failover();
  }

  /** "Tentar de novo" depois de esgotar: recomeça a lista inteira. */
  function retry(): void {
    void start();
  }

  function stop(): void {
    generation += 1;
    clearInterval(watchTimer);
    clearTimeout(noticeTimer);
    tried.clear();
    reconnected = false;
    busy = false;
    pendingFail = false;
    attempt = 0;
    current.value = null;
    exhausted.value = false;
    notice.value = null;
  }

  onBeforeUnmount(stop);

  return { notice, exhausted, current, start, fail, retry, stop };
}
