# Pryma — documentação do app e registro da refatoração

Três partes: **o que mudou** nesta refatoração, **o que o app faz** e **como escrever
código novo** dentro do padrão. Regras de deploy e de VPS continuam em `CLAUDE.md`.

---

## 1. O que foi feito

### Resumo

| Medida | Antes | Depois |
| --- | --- | --- |
| Erros de `nuxt typecheck` | 2 | **0** |
| JS moderno / legado (build do APK) | 1.836 KB / 2.015 KB | **1.712 KB / 1.879 KB** |
| CSS | 145 KB | **114 KB** |
| Telas com estouro lateral no celular em pé | 3 de 13 | **0** |
| Fonte base no celular deitado | 8,2 px | **12,5 px** |
| Requests de catálogo ao abrir a TV ao vivo | 3 buscas extras de 50 canais | **0 extras** (só ao abrir o grupo) |
| Código em arquivos já existentes | — | −2.082 / +886 linhas |

A worktree estava idêntica à `main` (`8327c25`) quando o trabalho começou.
**Nada foi commitado nem publicado:** as mudanças estão na árvore de trabalho da
branch `shiroDev-br/refactoring-code`.

A skill `thermo-nuclear-code-quality-review` foi instalada em
`.claude/skills/thermo-nuclear-code-quality-review/`, copiada do repositório
`cursor/plugins`. Ela é só texto de revisão, sem scripts. Como tem
`disable-model-invocation`, roda só por `/thermo-nuclear-code-quality-review`; nesta
refatoração os critérios dela foram aplicados à mão, no código inteiro.

### Bugs corrigidos

| Bug | O que acontecia | Correção |
| --- | --- | --- |
| **F5 no site mostrava erro** (confirmado em produção) | O SSR buscava o catálogo sem token, recebia 401 e o HTML já saía com "Não foi possível carregar". O cliente aceitava o erro e não buscava de novo | Dados que exigem login não são buscados no servidor (`server: false` e guarda em `usePaginatedQuery`) |
| **Timeout do HTTP nunca funcionou** | O timer abortava o fetch, mas o código procurava um erro `TimeoutError` que nunca ocorre. Sem retentativa e com mensagem errada | `services/http.ts` usa o sinal `timedOut()`; `maxRetries` agora é respeitado |
| **Timer preso após sair da TV ao vivo** | Sair durante o carregamento do motor religava o vigia de 1 s depois do `stop` | `startWatch` antes do `play` em `useLiveFailover` |
| **"Tentar de novo" não tentava** | Falha de rede ficava em cache e o retry esgotava na hora. No VOD, o retry reusava a URL que tinha falhado | Falha não vai para o cache; o retry limpa o cache e pede sessão nova |
| **Duas sessões de playback por abertura** | `prefetch` + `load` geravam dois requests no provedor | Requests em voo são compartilhados (`usePlayback`) |
| **URL vencida reaproveitada** | O cache ignorava o `expiresAt` da URL assinada | O cache respeita `expiresAt` e limpa o que venceu |
| **Botões do card de pausa mortos no toque e no mouse** | A camada do HUD cobria o card inteiro | Só as barras do HUD recebem toque |
| **Tocar no vídeo não trazia o HUD de volta no celular** | Só `pointermove` acordava o HUD | `pointerdown` também acorda |
| **Voltar do Fire Stick ignorava modal e menu** | Com "Jogos do dia" aberto, Voltar navegava por trás e contava como tentativa de sair | Nova pilha `useBackLayer`, consultada pelo plugin do Capacitor |
| **Voltar no navegador ao chegar na home** | Avisava "pressione de novo para sair", e o 2º toque abria a janela de sair | Listener de `popstate` removido |
| **↓ na home parava nos pontinhos** | Os indicadores do carrossel recebiam foco invisível | `tabindex="-1"` (toque e mouse continuam) |
| **Carrossel da home com medidas de 1280×720 no site** | A hidratação mantinha o tamanho do SSR até redimensionar | Mede a janela real depois de hidratar |
| **Seção sem categorias ficava sem foco inicial** | O D-pad começava do nada | O foco também espera o fim do carregamento |
| **`/pricing` espremida em todas as telas** | `.container` ficava com `max-width: 0` por causa dos breakpoints em 0px | Resolvido pelos breakpoints novos |
| **`/dev` no ar em produção** | Página de teste com credenciais de demonstração | Removida do build; responde 404 |

### Player

- **Plyr removido.** Ele rodava com `controls: []`, ou seja, não entregava nada que o
  HUD próprio já não fizesse, e ainda envolvia o `<video>` no DOM, criava a corrida
  que deixava o card de pausa sobre o filme e exigia um hack em API interna. Agora
  `usePlayer` fala direto com o elemento. O volume salvo continua valendo, porque a
  mesma chave do `localStorage` foi mantida.
- `utils/stream.ts` centraliza a detecção de formato e o carregamento de hls.js e
  mpegts.js, antes duplicados entre player e prévia. **As configurações de buffer de
  cada motor não mudaram.**
- `useSkipBurst` (±10 s acumulados) e `usePlayerFill` saíram das telas.
- `HudIcon` eliminou 25 SVGs inline repetidos no HUD, no card de pausa e no selo de avanço.
- `releaseVideo` passou a ser o único jeito de soltar o decodificador.

### Responsividade no celular

A causa era uma só: todos os breakpoints do Tailwind estavam em `0px`, então o código
escrito mobile-first (`sm:`, `lg:`…) nunca fazia efeito no celular.

- **Correção de raiz em `tailwind.config.ts`:** em landscape as variantes continuam
  sempre ligadas, e a TV não muda. Em pé, voltam a ser por largura.
- **Celular deitado:** piso de fonte de 12,5 px. `pointer: coarse` separa o celular de
  TV em modo compat, que tem a mesma altura mas usa D-pad.
- **Home em pé:** grade com os 9 destinos (`HomeMenuGrid`) no lugar do carrossel.
- **TV ao vivo em pé:** uma coluna com vídeo fixo no topo, dados do canal, grupos em
  faixa lateral e lista. A grade de programação fica oculta abaixo de 640 px, já que o
  programa atual aparece nos dados do canal.
- **Barra "OK para abrir":** some no aparelho de toque, onde só tapava conteúdo.
- **Teclado do Android:** `adjustPan` no manifest, para o teclado não encolher a tela e
  virar o layout para "deitado".

### Fire Stick

| Item | Situação |
| --- | --- |
| Launcher de TV, banner, toque opcional, tráfego HTTP | ✅ Presentes no manifest do APK gerado |
| APK compila (`assembleDebug`, 12 MB) | ✅ |
| Fluxos de D-pad em 960×540 | ✅ 30 de 30, incluindo os de toque no celular |
| Visual igual ao anterior | ✅ Comparação pixel a pixel: 0,05% (o relógio) |
| Teclas de controle sem nome (WebView antiga) | ✅ `utils/remoteKeys.ts`; a TV ao vivo só entendia `ArrowLeft` etc. |
| Fire Stick de verdade | ⚠️ **Não testado** — ver "Limites" |

**Diferenças visuais intencionais:** `/pricing` corrigida; Premiere, ESPN e SporTV ficam
sem contagem até o grupo ser aberto (consequência de não buscar esses canais à toa).

### Limpeza

- **Removidos por não terem nenhum uso:** `PlayerNavbar`, `AppSidebar`, `BrowseSplitView`,
  `ChannelGuide`, `HomeNavigationBar`, `useFullscreen`, `assets/css/responsive.css`, 3
  arquivos `.zip`, 1 arquivo-lixo de 0 bytes e 4 funções utilitárias.
- **`LiveChannelPreview` dividido:** de 785 para 600 linhas, com `LiveFullscreenHud` e
  `LivePreviewPlaceholder`.
- **Duplicações eliminadas:** validação de seção (`useBrowseSection`), filtro de categorias
  (`useSectionCategories`), cards de atalho (`CategoryShortcut`), leitura de teclas
  (`remoteKeys`), abertura de item de menu (`useMenuItemLink`), `.live-panel`.

### Como foi verificado

Tudo contra os builds de produção, com dados mock:

| Verificação | Resultado |
| --- | --- |
| `nuxt typecheck` | 0 erros |
| `nuxt generate` (APK) e `nuxt build` (VPS) | OK |
| D-pad em Fire Stick e toque em celular (`scripts/qa/flow.mjs`) | 30/30 |
| Vídeo real no WebKit: autoplay, HUD, avanço, pausa, volume, decoder solto (`player.mjs`) | Sem falhas |
| Estouro lateral em 13 telas × 6 tamanhos (`overflow.mjs`) | 0 em 78 |
| Build SSR: HTML sem erro no F5, `/dev` 404, CSS do `/admin/login` | OK |
| Avisos de hidratação em produção (15 rotas) | Só um, no 1º `/login`, e só em modo mock |

### Limites — o que NÃO foi validado

1. **Nenhum teste em Fire Stick físico.** Sem aparelho nem `adb` aqui: foi emulação de
   viewport e teclado em navegador. WebView antiga, decodificador único e memória real só
   aparecem no aparelho. **Teste antes de distribuir:** abrir canal, zapear, avançar filme e
   apertar Voltar com modal aberto.
2. **Nenhum stream IPTV real nem a API de produção.** Os testes usam mock, com HLS público
   de exemplo. O caminho mpegts.js (`.ts`) foi compilado, mas não tocou vídeo: o Chromium de
   teste não tem H.264.
3. **`adjustPan` e o Voltar nativo** compilam, mas só rodam no aparelho.
4. **Painel `/admin`:** só o login foi testado (exige API real). Ele não usa as variantes
   `sm:`/`lg:`, então os breakpoints novos não devem afetá-lo.
5. **Revisão desigual.** Player, TV ao vivo, navegação e fetch foram lidos linha a linha.
   `footballApi`, `DayFixturesModal`, `MediaDetailPanel`, YouTube, MTV e as telas do painel
   só passaram por busca automática (listeners, timers, `any`, código morto) e testes de
   tela — podem ter problemas que não apareceram.

### Pendências que dependem de decisão

- **Fire OS 5 não instala o app:** `minSdk 23` (exigido pelo Capacitor 7) exclui Fire Sticks
  de 1ª e 2ª geração, com Android 5.1.
- **Protetor de tela durante o vídeo:** vale conferir no aparelho. Se ativar em transmissão
  longa, a solução é `FLAG_KEEP_SCREEN_ON`, que é nativa.
- **`pnpm-lock.yaml` desatualizado:** o `package-lock.json` é mais novo, o `pnpm-lock` ainda
  cita o Plyr e o README recomenda pnpm. Escolha um gerenciador e apague o outro lockfile.
- **Código de mock no bundle de produção:** `repositories/index.ts` importa os mocks de forma
  estática.
- **`TVLiveSplitView`** só é alcançável por URL digitada (`/browse/tv/<categoria>`).
- **Chave do futebol vai para o navegador** (`runtimeConfig.public`), embora o `.env.example`
  diga "nunca exposta ao browser". Corrija o comentário ou passe por proxy.

---

## 2. O que o app faz

App de IPTV em Nuxt 3, com três alvos a partir do mesmo código:

| Alvo | Build | Particularidade |
| --- | --- | --- |
| **Web** | `nuxt build` (SSR casca + cliente) | Na VPS. Inclui o painel `/admin` |
| **APK celular e TV** | `npm run apk` (SPA + Capacitor) | Fala direto com a API; sem `/admin` nem `/dev` |
| **Fire Stick / Android TV** | O mesmo APK | Launcher de TV, navegação por D-pad |

### Telas

| Rota | Função |
| --- | --- |
| `/login` | Entrada do cliente |
| `/` | Home: carrossel na TV, grade no celular; barra com jogos e time do coração |
| `/browse/tv` | TV ao vivo: grupos, canais e prévia. 1º OK escolhe o canal, 2º abre em tela cheia (`?full=1`) |
| `/browse/filmes`, `/browse/series` | Trilho de categorias e destaques |
| `/browse/[seção]/[categoria]` | Grade de títulos com rolagem infinita e ordenação |
| `/browse/[seção]/favoritos`, `/recents` | Favoritos e continuar assistindo (locais) |
| `/detalhes/[...slug]` | Detalhe do filme |
| `/series/[id]` | Temporadas e episódios |
| `/medias/[...slug]` | Player (filme, episódio ou canal) |
| `/search` | Busca com sugestões |
| `/team`, `/background`, `/cache`, `/about` | Time, plano de fundo, limpeza de dados, termos + diagnóstico do aparelho |
| `/youtube`, `/musica`, `/mtv` | Telas com player do YouTube |
| `/admin/*` | Painel de staff: clientes, revendedores, servidores, wallpapers |

### Mapa do código

```
pages/        rotas — montam a tela, sem regra de negócio
components/   visual; só .vue vira componente (nomes planos, sem prefixo de pasta)
composables/  estado e lógica de tela (use*)
stores/       estado global Pinia: auth, player, preferences, football
repositories/ acesso à API; contracts.ts define a interface; versão HTTP ou mock
services/     http.ts (timeout, retentativa, refresh de sessão)
utils/        funções puras: remoteKeys, spatial, stream, video, viewportScale…
plugins/      navegação espacial, escala de TV, Voltar nativo, restauração de foco
```

### Mecanismos centrais

- **Escala (`viewport-scale`):** em landscape, tudo é um canvas de 1440×810 a 17 px, e o
  `font-size` do `<html>` acompanha a tela. Só funciona porque **todo tamanho é em rem**.
- **Navegação espacial (`spatial-navigation`):** um listener global move o foco pela
  geometria da tela. Telas com lógica própria dão `preventDefault` e ele fica de fora.
- **Dois motores de vídeo:** `useStreamEngine` (player, buffer maior) e `useLivePreview`
  (prévia, buffer curto e menor qualidade).
- **Failover ao vivo (`useLiveFailover`):** imagem parada → reconecta uma vez → troca de
  formato (`.ts` ↔ `.m3u8`) → troca de versão (FHD/HD/SD). Lembra a fonte boa por 12 h.
  Sempre uma conexão por vez, porque provedores limitam.
- **Sessão:** token no `localStorage`, logo **só o cliente faz chamadas autenticadas**.

---

## 3. Padrão para código novo

Revisão estrita: `/thermo-nuclear-code-quality-review`. Cada regra abaixo existe porque a
versão errada já quebrou algo.

### Fetch

```ts
// ✅ tela → composable → repositório → http
const repository = getRepositories().media;
const list = usePaginatedQuery((cursor, signal) => repository.search({ q, cursor }, { signal }));
```

- **Nunca** use `fetch` direto em tela. Rota nova entra em `ENDPOINTS`, `contracts.ts`, no
  repositório HTTP **e** no mock.
- **Listas:** `usePaginatedQuery` (cancela o anterior e não usa reatividade profunda).
- **Dado único com login:** `useAsyncData(..., { server: false })`, tratando `idle` como
  carregando:

  ```ts
  const isLoading = computed(() => status.value === 'pending' || status.value === 'idle');
  ```

- **Não busque o que ninguém viu.** Se é caro e opcional, busque ao abrir.
- **Resposta atrasada:** guarde um contador e descarte o que não for a última, ou passe `signal`.
- **Cache de falha é bug:** só guarde sucesso, e respeite a validade do dado.
- **Precisa de `await list.ready` no setup?** Na hidratação ele não espera. O que depende da
  lista (foco, por exemplo) usa `await list.settled` ou um `watch`.

### Tela nova

- [ ] Tamanhos em **rem**. Nada de `px`, `vh` ou `clamp` em layout.
- [ ] **Mobile-first:** `grid-cols-2 sm:grid-cols-4 lg:grid-cols-6`. Em landscape todas as
      variantes valem; `max-*:` não existe.
- [ ] Sem `@media` de largura para landscape. Exceção: celular deitado,
      `(orientation: landscape) and (max-height: 500px) and (pointer: coarse)`.
- [ ] Estrutura diferente no celular: `usePortraitPhone()`, que é `false` na hidratação.
- [ ] Foco inicial definido, inclusive quando a lista chega depois de montar.
- [ ] Testada em **960×540, 1920×1080, 390×844 e 844×390**.
- [ ] Rota do painel fica sob `/admin`; CSS do painel vai em `assets/css/admin.css`, nunca
      em `<style scoped>`.

### Controle remoto

```ts
const direction = directionOf(event);   // nunca event.key === 'ArrowLeft'
if (isOkKey(event)) { /* … */ }
```

- Toda tecla passa por `utils/remoteKeys.ts`. WebView antiga pode mandar só o código.
- Tecla tratada na tela: `preventDefault` tira o motor global da jogada.
- Área com setas próprias: `[data-no-spatial]`. Barra fixa: `[data-spatial-chrome]`.
- Modal: `role="dialog" aria-modal="true"` limita a navegação a ele.
- **Tudo que abre por cima da tela declara o Voltar**, senão o Fire Stick navega por trás:

  ```ts
  useBackLayer(() => isOpen.value, close);
  ```

### Vídeo

- **Soltar o decoder ao sair:** `releaseVideo(video)`. Tirar do DOM não basta, e Fire Stick
  costuma ter um decoder só.
- **Outro vídeo no layout `default`?** Use `useSuspendBackgroundMotion`, senão o fundo animado
  segura o decoder.
- **Uma conexão por vez:** derrube a anterior antes de abrir outra.
- **Não coloque biblioteca de player** em volta do `<video>`.
- **Antes de mudar buffer:** os valores e o motivo estão comentados no código.
- **Nunca logue URL de stream fora de dev:** ela leva usuário e senha do provedor.

### Compatibilidade com WebView antiga

- Sem flex `gap` crítico: use margem ou a classe `html.no-flex-gap`.
- `aspect-ratio` precisa de fallback (`.ratio-16x9`, `.ratio-2x3`).
- Sem `backdrop-filter`, `filter` ou `mix-blend` em áreas grandes.
- Sem animação contínua de `box-shadow`.
- Só `width`, `height` e `translate` animam nos cards — e o mínimo possível.
- Medidas críticas calculadas em px no JS, como faz o carrossel.

### Vazamentos e estrutura

- Todo `addEventListener`, `setInterval` e `setTimeout` tem limpeza em
  `onBeforeUnmount`/`onScopeDispose`. Em código assíncrono, confira depois do `await` se a
  tela ainda existe.
- Listener global e permanente só em plugin.
- Arquivo acima de ~500 linhas: extraia composable ou subcomponente.
- Três cópias do mesmo bloco viram componente ou classe. Lógica repetida vai para
  `utils/` (pura) ou `composables/` (com estado).
- Sem `any`, sem `@ts-ignore`, sem `console.log` fora de `import.meta.dev`.
- Comentário explica o **porquê**, principalmente workaround de TV.

### Antes de entregar

```bash
npx nuxt typecheck

# QA: instale o Playwright sem salvar no projeto (versão usada: 1.49.1)
npm i --no-save playwright@1.49.1

DATA_MODE=mock npx nuxt dev --port 3456      # em outro terminal
node scripts/qa/flow.mjs   http://localhost:3456 /tmp/qa   # D-pad + toque
node scripts/qa/player.mjs http://localhost:3456 /tmp/qa   # vídeo real (WebKit)
U=demo P=password node scripts/qa/overflow.mjs http://localhost:3456 /tmp/qa   # estouro lateral

# Mudou CSS do painel ou fluxo de SSR? Valide no build de produção: o dev esconde esses erros.
```

Mudança que toca player, teclas ou nativo também precisa de **um teste no Fire Stick**.
