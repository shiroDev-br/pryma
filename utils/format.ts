/** Segundos -> "1:23:45" / "23:45". Live e valores inválidos viram "—". */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds < 0 || !Number.isFinite(seconds)) return '—';

  const total = Math.trunc(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`;
}

/** Segundos -> "2h 44min" / "44min" — duração de filme em PT-BR. Sem dado: null. */
export function formatRuntime(seconds: number | null | undefined): string | null {
  if (!seconds || seconds < 0 || !Number.isFinite(seconds)) return null;

  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  return `${minutes}min`;
}

/** "Carinha de Anjo 2016 S01E05" -> "Carinha de Anjo 2016" — nome da série. */
export function stripEpisodeToken(title: string): string {
  return title.replace(/\s*S\d{1,2}(?:E\d{1,2})?$/i, '').trim() || title;
}

/** Números grandes -> "1.8K", "302K" (badges de contagem de categoria). */
export function formatCount(value: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

const WEEKDAYS_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'] as const;
const MONTHS_SHORT = [
  'JAN',
  'FEV',
  'MAR',
  'ABR',
  'MAI',
  'JUN',
  'JUL',
  'AGO',
  'SET',
  'OUT',
  'NOV',
  'DEZ',
] as const;

const DAY_MS = 86_400_000;

function localStartOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * Kickoff (epoch s) -> "HOJE · 16:00", "AMANHÃ · 16:00" ou "DOM · 12 OUT · 16:00".
 * Sempre no fuso do aparelho — a UI fala com quem está olhando a tela.
 */
export function formatKickoffLabel(timestamp: number, now: Date = new Date()): string {
  const kickoff = new Date(timestamp * 1000);
  const time = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(kickoff);

  const dayDelta = Math.round((localStartOfDay(kickoff) - localStartOfDay(now)) / DAY_MS);

  if (dayDelta <= 0) return `HOJE · ${time}`;
  if (dayDelta === 1) return `AMANHÃ · ${time}`;
  return `${WEEKDAYS_SHORT[kickoff.getDay()]} · ${kickoff.getDate()} ${MONTHS_SHORT[kickoff.getMonth()]} · ${time}`;
}

/** Partida em andamento — janela de 2h a partir do kickoff (sem custo de request). */
export function isFixtureLive(timestamp: number, now: Date = new Date()): boolean {
  const elapsed = now.getTime() - timestamp * 1000;
  return elapsed >= 0 && elapsed <= 120 * 60_000;
}

/** Jogo já encerrado (kickoff + 2h) — deixa de ser "próximo jogo" na UI. */
export function isFixtureOver(timestamp: number, now: Date = new Date()): boolean {
  return now.getTime() > timestamp * 1000 + 120 * 60_000;
}

/** "Flamengo x Palmeiras" — mandante primeiro, convenção brasileira. */
export function formatMatchup(home: { name: string }, away: { name: string }): string {
  return `${home.name} x ${away.name}`;
}
