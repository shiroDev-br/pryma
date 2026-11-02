/**
 * Aba YouTube — sub-abas com playlists fixas (sem API: tudo client-side,
 * tocado pela IFrame API do YouTube).
 *
 * `embeddable: false` = o dono bloqueou embed (erro 101/150): o card abre o
 * vídeo/playlist no YouTube em vez do player interno.
 */

export interface YoutubeEntry {
  /** Id estável na URL (`?play=<id>`). */
  id: string;
  title: string;
  channel: string;
  kind: 'playlist' | 'video';
  /** Id da playlist (PL…) ou do vídeo no YouTube. */
  youtubeId: string;
  /** Vídeo usado como capa (`i.ytimg.com/vi/<id>/hqdefault.jpg`). */
  coverVideoId: string;
  embeddable: boolean;
  /** Seção dentro da sub-aba (ex.: gênero) — a grade agrupa por ela. */
  group?: string;
  /** Vídeo avulso do feed: fila que segue depois dele (ids do YouTube). */
  queue?: string[];
}

export interface YoutubeTab {
  id: string;
  label: string;
  icon: string;
  /** `feed` = vídeos em alta + busca (API); `playlists` = grade fixa de `entries`. */
  kind: 'feed' | 'playlists';
  entries: YoutubeEntry[];
}

/** Configuração de uma tela baseada no YouTube (aba YouTube, aba Música). */
export interface YoutubeSection {
  brand: { label: string; icon: string };
  tabs: YoutubeTab[];
  feed: {
    /** Categoria fixa (ex.: '10' = Música) — vale pro "em alta" e pra busca; some os chips. */
    fixedCategory: string | null;
    searchPlaceholder: string;
  };
}

/** Categorias do feed — videoCategoryId do YouTube que têm "em alta" no Brasil
 *  (Educação, Viagens e ONGs devolvem erro na região e ficaram de fora). */
export const YOUTUBE_FEED_CATEGORIES: { id: string | null; label: string }[] = [
  { id: null, label: 'Em alta' },
  { id: '10', label: 'Música' },
  { id: '20', label: 'Jogos' },
  { id: '17', label: 'Esportes' },
  { id: '24', label: 'Entretenimento' },
  { id: '23', label: 'Comédia' },
  { id: '1', label: 'Filmes e animação' },
  { id: '28', label: 'Ciência e tecnologia' },
  { id: '25', label: 'Notícias' },
];

const YOUTUBE_TABS: YoutubeTab[] = [
  {
    id: 'inicio',
    label: 'Início',
    icon: 'material-symbols:whatshot-rounded',
    kind: 'feed',
    entries: [],
  },
  {
    id: 'infantis',
    label: 'Infantis',
    icon: 'material-symbols:child-care-rounded',
    kind: 'playlists',
    entries: [
      {
        id: 'desenhos-antigos',
        title: 'Desenhos Antigos',
        channel: 'RÁDIOLOKA 715FM',
        kind: 'playlist',
        youtubeId: 'PLlroT-o3k4m9EgWOKE8Gy8RNG0XogzTkd',
        coverVideoId: 'Aeud0QG2wu4',
        embeddable: true,
      },
      {
        id: 'desenhos-bons-tempos',
        title: 'Desenhos Antigos dos bons tempos',
        channel: 'Quatro Artes Animações',
        kind: 'playlist',
        youtubeId: 'PLHUDw0YoH67kF2sM6wMVYwoEO9c-0FJG3',
        coverVideoId: 'OwPUIkoQ2BU',
        embeddable: true,
      },
      {
        id: 'bom-dia-e-cia',
        title: 'Bom Dia & Cia — Desenhos',
        channel: 'Gibis da Ana',
        kind: 'playlist',
        youtubeId: 'PL2lgKTHSgvu4FHHSQ_3ZNcBOJ99b3uhj7',
        coverVideoId: 'QgMcA7jJ2J0',
        embeddable: true,
      },
      {
        id: 'changeman',
        title: 'Esquadrão Relâmpago Changeman',
        channel: 'Urbs Fluminensis',
        kind: 'playlist',
        youtubeId: 'PLCcWr6nZW_pVAwvM_B5YYIXwUYbUIYUVB',
        coverVideoId: '-96fOdbdgLI',
        embeddable: true,
      },
      {
        id: 'power-rangers-galaxia-perdida',
        title: 'Power Rangers Galáxia Perdida (1999)',
        channel: 'My Playlists BR',
        kind: 'playlist',
        youtubeId: 'PL-t1336xq7yl8kMx1gWQclolE5gykQtql',
        coverVideoId: '2P0NbeULPHU',
        embeddable: true,
      },
      {
        id: 'jaspion',
        title: 'Jaspion — Episódios 1 a 32 (dublado)',
        channel: 'TokuSato',
        kind: 'playlist',
        youtubeId: 'PL60SfTrykhMwuIbgWhdMMB0yPQuoVWqmi',
        coverVideoId: 'jJBVq19hUgg',
        embeddable: false,
      },
      {
        id: 'jiraiya-ep1',
        title: 'Jiraiya — Ep. 1: Pako, a Cápsula Miraculosa',
        channel: 'TokuSato',
        kind: 'video',
        youtubeId: 's0OJxWcwORg',
        coverVideoId: 's0OJxWcwORg',
        embeddable: false,
      },
    ],
  },
];

export const YOUTUBE_SECTION: YoutubeSection = {
  brand: { label: 'YouTube', icon: 'logos:youtube-icon' },
  tabs: YOUTUBE_TABS,
  feed: { fixedCategory: null, searchPlaceholder: 'Buscar no YouTube' },
};

/* ── Aba Música ──────────────────────────────────────────────────────── */

/** Playlist de gênero — escolhidas por tamanho e canal (gravadoras quando
 *  dá: Som Livre, Filtr/Sony), com os primeiros vídeos conferidos com embed liberado. */
function pl(groupId: string, group: string, playlistId: string, title: string, channel: string, cover: string): YoutubeEntry {
  return {
    id: `${groupId}-${playlistId.slice(-6).toLowerCase()}`,
    title,
    channel,
    kind: 'playlist',
    youtubeId: playlistId,
    coverVideoId: cover,
    embeddable: true,
    group,
  };
}

const MUSIC_GENRES: YoutubeEntry[] = [
  pl('sertanejo', 'Sertanejo', 'PLxFfose56Ajew2XuBBuMspTxQdTjLwGhR', "Top Sertanejo — Atualizado", "Som Livre", 'N2boHnDVzqY'),
  pl('sertanejo', 'Sertanejo', 'PLJn4hP4ODKFyK5lm2QzwndOaAmzgesIRK', "Sertanejo Atualizado", "Filtr Music Brasil", 'lBDDMrUCz1A'),
  pl('sertanejo', 'Sertanejo', 'PLCwAHfhr-Gc_wCv4yrPBiZFFyaRDMraMl', "Sertanejo: Top Mais Tocadas", "Músicas Mais Tocadas - Lançamentos 2026", 'FeD9wvOq1yY'),
  pl('funk', 'Funk', 'PLMCXB6VwCoEeSEp9CXRR9arP8vQDGa1jS', "Funk — Só as Melhores", "Bianca my blocka", 'oL1gg1TwXAA'),
  pl('funk', 'Funk', 'PLdQur9T5_P42PwjlMiG1l7NzjJ2x1lQHL', "Funk — Lançamentos Mais Tocados", "YouTube.comTopBrasilSpotify2025", 'fXQj5TarYkc'),
  pl('funk', 'Funk', 'PLCwAHfhr-Gc_cfuw9iGLta4-hGZDeBdEM', "Funk Consciente", "Músicas Mais Tocadas - Lançamentos 2026", '6Eb2WnVyhys'),
  pl('pagode', 'Pagode e Samba', 'PLJn4hP4ODKFxmshJrplAALhVr6n6trSjN', "Pagode Atualizado", "Filtr Music Brasil", 'DW2ZW4nBqKY'),
  pl('pagode', 'Pagode e Samba', 'PLCwAHfhr-Gc_Ra3WPBZZDdzS1MNRgO1lq', "Top 100 Pagode e Samba", "Músicas Mais Tocadas - Lançamentos 2026", 'zKAAFsovtM4'),
  pl('pagode', 'Pagode e Samba', 'PL0ao6cotJFFU34ZCy3XJBAJNPsZdGbb5F', "Samba e Pagode — Lançamentos", "Minha Playlist", 'rWRT4i43Lgs'),
  pl('forro-piseiro', 'Forró e Piseiro', 'PLJn4hP4ODKFxQhyzWIGZP0P_MqUj9z-Jh', "Forró e Piseiro Atualizado", "Filtr Music Brasil", 'TX-MGLcRJ1s'),
  pl('forro-piseiro', 'Forró e Piseiro', 'PLz5qkjG8i6lP0xvJNUF_F1NGcNjmyEQ6Z', "Forró Mais Tocados", "Minhas Listas De Músicas", '8GytQylUAlc'),
  pl('forro-piseiro', 'Forró e Piseiro', 'PL9f9ivHDoI0MFdWvvExzeJCKRIUwm6pJK', "Piseiro — Hits do Paredão", "DJ Morena do Piseiro", 'VQ_KtsZm0Ic'),
  pl('gospel', 'Gospel', 'PL_Q15fKxrBb7U_myBt1L3WjtEGx016gga', "Gospel Mais Tocadas nas Rádios", "Redlist - Músicas Mais Tocadas", 'ldK43s9UyQI'),
  pl('gospel', 'Gospel', 'PLveUSFqkZWtOQ252_YytOiV-ckTFMKCeg', "Gospel — Top Mais Tocadas", "TopSongs: Spotify", 'ldK43s9UyQI'),
  pl('gospel', 'Gospel', 'PL_Q15fKxrBb4pxTp2zQm6zZU3-h4dlm05', "Gospel Nacional de Todos os Tempos", "Redlist - Músicas Mais Tocadas", 'LYsaKn8FRhc'),
  pl('rap-trap', 'Rap e Trap', 'PLhBSkXNVJ_usvw6gNaawfJPp_3Zy1zthQ', "Trap BR — Mais Tocadas", "deGe", 'QojMJ0qykXA'),
  pl('rap-trap', 'Rap e Trap', 'PLdxfTh4VWPt1Eu9gosokkx-_MYyMh2bys', "1 Kilo de Rap Nacional", "Palco Favela", 'TQ5DUv_ZwRg'),
  pl('rap-trap', 'Rap e Trap', 'PLfU8kqCtG9UYJZLSa_lkYM2kiTrV8NjD4', "Trap Brasil — Melhores", "#SET7Music: Top Rádios 2023", 'wkJ7gzoOqxE'),
  pl('mpb', 'MPB', 'PL_Q15fKxrBb7C163SjzBIPYMrGcNzb_-X', "MPB — As Melhores de Todos os Tempos", "Redlist - Músicas Mais Tocadas", 'FUz0a2cl_RM'),
  pl('mpb', 'MPB', 'PLDUAx1zZF7lvdS9HO5_hKUPp_6D9Afsl9', "MPB Barzinho", "Best Music Brasil", '4QiuEe43YJw'),
  pl('mpb', 'MPB', 'PLJNoUcE5UFl-v9ruNhXE634RxMhCx4qHl', "MPB Antigas — Anos 80, 90 e 2000", "Rodrigo Mattos Music", '4QiuEe43YJw'),
  pl('pop', 'Pop e Hits do Brasil', 'PLQGx8UJi4WEx6f-0mr1j_Pv0TQl2S5lTl', "Top Brasil — Mais Tocadas", "RDP Divulgações", 'eAIivxKZYZw'),
  pl('pop', 'Pop e Hits do Brasil', 'PL2DA6SQLteYWf7EVxbbrJ4D17sXfpzSwr', "Músicas Mais Tocadas", "Minha Playlist De Músicas", 'iYjz1Ap1VvU'),
  pl('pop', 'Pop e Hits do Brasil', 'PLyXUGQy5iOfVGedgb3_lJUOYQ0tT6erZB', "Pop Leve e Nova MPB", "Enjoy Pop Music", 'TXtXUGxWATw'),
  pl('internacional', 'Internacional', 'PLHg022HMFzFCRq-5ZVR3hiiCkGPJ3Ur1D', "Pop Internacional — Mais Tocadas", "#MusicPlaylist LIT", 'u2ah9tWTkmk'),
  pl('internacional', 'Internacional', 'PLDIoUOhQQPlXr63I_vwF9GD8sAKh77dWU', "Top Songs — Top Hits", "Chillax", 'Rt9tW3cMLhI'),
  pl('internacional', 'Internacional', 'PLSKsoW1K1XEPzA9GC3pi_N8vXET_B5kH3', "Melhores Internacionais", "Eloise Music", 'byxFUKxhT3s'),
  pl('rock', 'Rock', 'PL_Q15fKxrBb7wo5SRxHbhk6ZL6zMYh5tH', "Os Melhores Rocks de Todos os Tempos", "Redlist - Músicas Mais Tocadas", 'kXYiU_JCYtU'),
  pl('rock', 'Rock', 'PLJ8E1oONCGCSu4WtLe_5bdd4QdVQ3eDWL', "400 Músicas de Rock Nacional", "#SET7Music: World", 'tI9kSZgMLsc'),
  pl('rock', 'Rock', 'PLceUtE0RInTz5oY5582kRrS_5EB7fmNG7', "Rock Nacional e Internacional", "raigomes2", 'eVTXPUF4Oz4'),
  pl('eletronica', 'Eletrônica', 'PLhgO2i9SR2sPJ-ihUiutO4XXLU9Jr6-nZ', "Eletrônica — Mais Tocadas", "Nova Records - Música Eletrônica", '98ovJs-Ibd4'),
  pl('eletronica', 'Eletrônica', 'PLhgO2i9SR2sPZe8WQgxUP0v0LRDpZ_NEO', "Alok — Melhores Eletrônicas", "Nova Records - Música Eletrônica", 'uWImYzB-LSs'),
  pl('eletronica', 'Eletrônica', 'PL5D7fjEEs5ydGHEy5I2hoLGP37gw1OPU2', "Top Músicas Eletrônicas", "Redlist - Timeless Songs", 'nS-fOh1CfhQ'),
  pl('flashback', 'Flashback', 'PL78D7MveYuCF7lrevT-nvkvEEXZRtsGAn', "Internacionais Anos 70, 80 e 90", "Músicas Internacionais Antigas - AS MELHORES ♪", 'YRfDg4jLpCM'),
  pl('flashback', 'Flashback', 'PLCwAHfhr-Gc9rTk-WMBpjST3f-c5ldBQL', "Flashback Romântico Internacional", "Músicas Mais Tocadas - Lançamentos 2026", 'iQzB5T_B_iI'),
  pl('flashback', 'Flashback', 'PLjCpnceKZ1Ybi7TFuVLJSIHysBrEFfaPV', "Flashback Anos 80 e 90", "Maicon Soares", 'k2C5TjS2sh4'),
];

export const MUSIC_SECTION: YoutubeSection = {
  brand: { label: 'Música', icon: 'material-symbols:music-note-rounded' },
  tabs: [
    { id: 'em-alta', label: 'Em alta', icon: 'material-symbols:whatshot-rounded', kind: 'feed', entries: [] },
    { id: 'generos', label: 'Gêneros', icon: 'material-symbols:queue-music-rounded', kind: 'playlists', entries: MUSIC_GENRES },
  ],
  // 10 = categoria Música do YouTube.
  feed: { fixedCategory: '10', searchPlaceholder: 'Buscar músicas e artistas' },
};

export function youtubeWatchUrl(entry: YoutubeEntry): string {
  return entry.kind === 'playlist'
    ? `https://www.youtube.com/playlist?list=${entry.youtubeId}`
    : `https://www.youtube.com/watch?v=${entry.youtubeId}`;
}

export function youtubeCoverUrl(entry: YoutubeEntry): string {
  return `https://i.ytimg.com/vi/${entry.coverVideoId}/hqdefault.jpg`;
}

/** Vídeo avulso do feed como item tocável pelo `YoutubePlayer` (com a fila seguinte). */
export function youtubeVideoEntry(
  video: { videoId: string; title?: string; channelTitle?: string },
  queue: string[] = [],
): YoutubeEntry {
  return {
    queue,
    id: video.videoId,
    title: video.title || 'YouTube',
    channel: video.channelTitle ?? '',
    kind: 'video',
    youtubeId: video.videoId,
    coverVideoId: video.videoId,
    embeddable: true,
  };
}
