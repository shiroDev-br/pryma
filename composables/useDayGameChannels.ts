import { ref, shallowRef } from 'vue';
import { useDayFixtures } from '~/composables/useDayFixtures';
import { useFixtureChannels } from '~/composables/useFixtureChannels';
import type { MediaSummary } from '~/types';

/**
 * Grupo "Jogos do dia" da TV ao vivo: os canais que transmitem os jogos de hoje
 * (mesmo cruzamento jogos × programação do modal da home). Cada canal vem com o
 * jogo no lugar da categoria ("Flamengo x Palmeiras · 21:30"), na ordem dos jogos.
 *
 * Só carrega quando pedido: o cruzamento consulta a programação de muitos canais.
 */
export function useDayGameChannels() {
  const { fetchFixtures } = useDayFixtures();
  const { findChannels, matches } = useFixtureChannels();

  const channels = shallowRef<MediaSummary[]>([]);
  const isLoading = ref(false);
  const error = ref('');
  /** Já carregou alguma vez (o badge do grupo só mostra número depois disso). */
  const loaded = ref(false);
  let inFlight: Promise<void> | null = null;

  async function run(): Promise<void> {
    isLoading.value = true;
    error.value = '';
    try {
      const result = await fetchFixtures();
      const fixtures = [...(result?.fixtures ?? [])].sort((a, b) => a.timestamp - b.timestamp);
      if (fixtures.length) await findChannels(fixtures);

      // Todos os canais de cada jogo (SporTV e Premiere passando o mesmo jogo),
      // na ordem dos jogos. Um canal com dois jogos no dia fica no primeiro.
      const seen = new Set<string>();
      const list: MediaSummary[] = [];
      for (const fixture of fixtures) {
        const match = matches.value.get(fixture.id);
        if (!match) continue;
        const time = new Date(fixture.timestamp * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        for (const channel of match.channels) {
          if (seen.has(channel.id)) continue;
          seen.add(channel.id);
          list.push({ ...channel, categoryName: `${fixture.home.name} x ${fixture.away.name} · ${time}` });
        }
      }
      channels.value = list;
      loaded.value = true;
    } catch {
      error.value = 'Não foi possível carregar os jogos do dia.';
    } finally {
      isLoading.value = false;
      inFlight = null;
    }
  }

  /** Carrega (ou devolve a carga em andamento). `force` refaz mesmo já carregado. */
  function load(force = false): Promise<void> {
    if (inFlight) return inFlight;
    if (loaded.value && !force) return Promise.resolve();
    inFlight = run();
    return inFlight;
  }

  return { channels, isLoading, error, loaded, load };
}
