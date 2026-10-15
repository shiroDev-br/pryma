# IPTV — Diretrizes de UI, Arquitetura e Implementação

> Documento de referência para evolução do frontend existente. **Não recriar a base do projeto.** Antes de alterar arquivos, inspecionar a estrutura, os tipos, os serviços e os dados mockados atuais.

## 1. Contexto e objetivo

O projeto IPTV já possui uma camada **TypeScript (TS) construída, com dados mockados e preparada para integração com API**. O trabalho atual é desenvolver/refinar a interface visual **consumindo diretamente essa camada existente**. O backend definitivo será integrado posteriormente, possivelmente via FastAPI, sem reescrever a UI.

A imagem de referência inspira apenas a **composição e navegação**: menu horizontal de categorias, item central em destaque, profundidade entre cards e barras discretas de informações. **Não copiar** sua textura espacial, saturação, brilho neon, tipografia ou excesso de elementos.

**Resultado desejado:** uma experiência de TV premium, elegante, fluida e profissional, com identidade **preto + dourado**, navegação clara e foco absoluto no conteúdo.

## 2. Direção visual

### 2.1 Princípios

- Sofisticação antes de ornamentação; interface limpa, com hierarquia evidente.
- Preto profundo, superfícies grafite e dourado usado **apenas para estados de destaque, foco e detalhes**.
- Fundo com gradiente escuro suave, vinheta controlada e, se necessário, textura sutil de baixo contraste. **Nada de galáxias, estrelas, partículas chamativas, brilhos neon ou excesso de glassmorphism.**
- Profundidade por escala, contraste, opacidade e sombra suave; não por bordas luminosas exageradas.
- Tipografia contemporânea, legível à distância, com pesos e espaçamentos consistentes.
- Evitar interfaces visualmente poluídas e animações constantes.

### 2.2 Tokens sugeridos

Centralizar tokens no sistema de estilos já adotado pelo projeto (CSS variables, tema ou configuração equivalente):

```css
:root {
  --color-bg: #090909;
  --color-surface: #141414;
  --color-surface-raised: #1c1c1c;
  --color-border: #303030;
  --color-gold: #c8a65a;
  --color-gold-hover: #dfbe78;
  --color-gold-muted: #78643c;
  --color-text: #f5f3ed;
  --color-text-muted: #aaa7a0;
  --color-danger: #df6666;
  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --focus-ring: 0 0 0 3px rgba(200, 166, 90, .65);
  --transition-fast: 160ms ease;
  --transition-normal: 260ms ease;
}
```

Valores são ponto de partida, não obrigação; verificar contraste e acessibilidade. Reservar dourado para poucos elementos por tela.

### 2.3 Composição da home

1. **Header discreto:** marca, navegação/atalhos relevantes, relógio opcional e acesso a perfil/configurações. Evitar banners e indicadores sem função.
2. **Hero/área principal:** título curto, contexto e carousel horizontal de categorias. Item selecionado maior, centralizado e nítido; vizinhos menores e com contraste reduzido. Evitar perspectiva 3D agressiva.
3. **Cards de categoria:** TV ao vivo, filmes, séries, favoritos e demais categorias **somente quando suportadas pelos dados e recursos existentes**. Ícone consistente, nome, descrição opcional e quantidade **somente se disponível**.
4. **Faixa informativa opcional:** conteúdo em reprodução, programação ou próximo evento, **somente quando os mocks expuserem dados confiáveis**. Não inventar partidas, temperaturas, canais ou contagens.
5. **Estados vazios e de carregamento:** tão bem desenhados quanto o estado preenchido.

### 2.4 Experiência em TV e outras telas

- Priorizar layout 16:9 e navegação com controle remoto/teclado (setas, Enter, Escape/Back), se a aplicação for destinada a TV/Android TV.
- Foco visual **muito evidente**, independente do hover; foco dourado com contraste suficiente.
- Áreas clicáveis grandes, texto legível a distância e rolagem previsível.
- Layout responsivo para desktop, tablet e celular quando fizer parte do escopo do produto.
- Respeitar `prefers-reduced-motion`; evitar efeitos que prejudiquem desempenho em dispositivos modestos.

## 3. Regras obrigatórias de arquitetura

### 3.1 Preservar o TS existente

**Regra fundamental:** os dados mockados já estão disponíveis em TypeScript e essa camada está pronta para consumo. **Usá-la como fonte de dados do frontend desde já.**

- Investigar primeiro onde estão interfaces, tipos, mocks, adapters, hooks, stores e serviços existentes.
- **Não duplicar mocks** em componentes, páginas, arrays locais ou arquivos paralelos.
- **Não recriar serviços, modelos ou contratos** já existentes.
- **Não substituir** a camada existente por chamadas HTTP fictícias.
- Consumir os contratos atuais, mesmo que o retorno venha de mocks.
- Se a camada já possui uma abstração de repositório/API, manter a UI desacoplada de sua implementação.
- Mudanças em tipos e contratos devem ser justificadas e compatíveis com os consumidores atuais.
- Não instalar bibliotecas ou migrar frameworks sem necessidade e aprovação.

**Fluxo desejado:**

```text
Página / Composição de tela
       ↓
Hook / Controller / Store existente (quando aplicável)
       ↓
Serviço / Repositório TypeScript existente
       ↓
Mocks atuais → Futuramente API FastAPI
```

A troca `Mocks → API` deve ocorrer preferencialmente na camada de acesso a dados, **não dentro dos componentes visuais**.

### 3.2 Componentização como regra

**Não criar arquivos JSX/TSX extensos contendo uma tela inteira de marcação.** Separar componentes por responsabilidade visual e comportamental, usando a organização já adotada no repositório.

Candidatos a componentes (criar somente quando necessários; reutilizar equivalentes existentes):

- `AppShell` — estrutura global.
- `Header` / `Brand` / `HeaderActions` — topo da aplicação.
- `CategoryCarousel` — composição e navegação da faixa horizontal.
- `CategoryCard` — card reutilizável de categoria.
- `FocusFrame` — tratamento visual de foco, caso faça sentido como abstração.
- `SectionHeading` — títulos de seções.
- `ContentCard` — filmes, séries ou programas.
- `ContentRail` — trilhos/listas horizontais.
- `InfoStrip` — faixa contextual inferior.
- `EmptyState`, `LoadingState`, `ErrorState` — estados de interface.
- `IconButton`, `Badge`, `PosterImage` — primitivas quando não existirem equivalentes.

**Critério de extração:** separar quando existir responsabilidade independente, repetição real, lógica própria ou necessidade de teste. **Não fragmentar** cada `div`, `span` ou detalhe trivial em um componente.

### 3.3 DRY, coesão e simplicidade

- **DRY:** uma única implementação para padrões repetidos; dados variáveis entram por `props` tipadas.
- **Single Responsibility:** componentes de apresentação não fazem parsing de playlists, requisições HTTP ou transformação pesada de dados.
- **Composição sobre duplicação:** variantes por propriedades e slots/children, quando apropriado.
- **Sem abstração prematura:** reutilização deve resolver um problema real, não criar camadas artificiais.
- **Sem números mágicos:** cores, espaçamentos, raios e durações em tokens.
- **Sem lógica de domínio espalhada:** normalização e regras de negócio na camada apropriada.
- **Sem `any` desnecessário:** respeitar tipagem estrita e contratos existentes.
- **Sem arquivos monolíticos:** páginas orquestram componentes e dados; não concentram toda a implementação.

### 3.4 Estrutura ilustrativa (adaptar ao projeto real)

```text
src/
  components/
    ui/                 # primitivas reutilizáveis
    layout/             # shell, header, navegação
    media/              # cards, trilhos, imagens
    states/             # loading, error, empty
  features/
    home/
      components/       # elementos específicos da home
      hooks/            # apenas se necessários
      HomePage.tsx
    live-tv/
    movies/
    series/
  services/              # preservar camada já existente
  types/                 # preservar contratos existentes
  styles/                # tokens e estilos compartilhados
```

**Importante:** essa árvore é um exemplo, **não uma ordem para reestruturar o repositório**. Preferir convenções existentes.

## 4. Integração com mocks e futura API

1. Localizar e documentar os métodos já disponíveis no TS.
2. Mapear cada componente visual aos dados existentes.
3. Consumir os métodos/contratos atuais, sem fabricar um segundo modelo de dados.
4. Tratar `loading`, `empty`, `error` e sucesso de modo consistente com a camada atual.
5. Evitar acessar campos opcionais sem validação e fornecer fallbacks visuais seguros.
6. Não acoplar componentes ao formato bruto de resposta HTTP; se necessário, usar adapters **na fronteira de dados**, sem duplicar o que já existe.
7. Quando FastAPI entrar em operação, preservar as interfaces consumidas pela UI; substituir a implementação de obtenção dos dados e validar compatibilidade.

**Exemplo conceitual, não código para copiar literalmente:**

```tsx
// A página recebe dados de um hook/serviço já existente.
// Os nomes reais devem ser identificados no repositório.
function HomePage() {
  const { categories, status } = useExistingCatalog();

  return (
    <AppShell>
      <HomeHero />
      <CategoryCarousel items={categories} />
      <CatalogStatus status={status} />
    </AppShell>
  );
}
```

Não criar `useExistingCatalog` ou `CatalogStatus` apenas porque aparecem no exemplo: identificar o que já existe e implementar só o necessário.

## 5. Comportamento dos componentes

### CategoryCarousel

- Recebe lista tipada de categorias e estado de seleção controlado ou claramente encapsulado.
- Navegação por teclado e, quando pertinente, controle remoto.
- Mantém item ativo visível, com animação curta e suave.
- Não pressupõe quantidade fixa de categorias.
- Suporta listas vazias, nomes longos e itens sem descrição/contagem.
- Não usa transformações pesadas ou efeitos permanentes.

### CategoryCard

- Renderiza a partir de propriedades tipadas, sem dados hardcoded.
- Estados: padrão, selecionado, foco e desabilitado (se aplicável).
- Ícone e texto com alinhamento consistente.
- Não concentra navegação, acesso a dados e lógica de negócio ao mesmo tempo.

### ContentCard e ContentRail

- Usar modelos existentes de mídia, quando disponíveis.
- Imagens com fallback, carregamento eficiente e proporção consistente.
- Metadados opcionais não devem quebrar o layout.
- Seleção e navegação previsíveis.

## 6. Qualidade, acessibilidade e performance

- Semântica correta, labels e foco navegável; nunca depender apenas de cor para comunicar estado.
- Contraste adequado, inclusive no dourado sobre fundos escuros.
- Evitar animações de layout custosas; preferir `transform` e `opacity` quando apropriado.
- Não adicionar bibliotecas de animação para efeitos simples.
- Evitar re-renderizações e cálculos desnecessários, sem usar memoização indiscriminadamente.
- Imagens dimensionadas e lazy loading quando adequado.
- Preservar compatibilidade com ferramentas, roteamento, estilos e testes já presentes.
- Validar lint, TypeScript, build e testes existentes ao concluir alterações.

## 7. Processo obrigatório de implementação

### Etapa 1 — Auditoria

Antes de programar, verificar:

- Framework e convenções existentes.
- Estrutura de componentes e design system atual.
- Serviços TS, contratos, mocks, hooks e stores.
- Rotas e navegação já implementadas.
- Restrições do dispositivo-alvo e do player de mídia.

### Etapa 2 — Plano de alterações

Descrever brevemente quais componentes serão reutilizados, quais serão criados, quais arquivos serão alterados e de onde cada seção receberá dados. **Não propor refatorações grandes sem necessidade.**

### Etapa 3 — Implementação incremental

1. Definir tokens e fundo premium.
2. Refinar shell/header.
3. Implementar cards e carousel reutilizáveis.
4. Conectar à camada TS mockada existente.
5. Refinar estados de foco, carregamento, vazio e erro.
6. Ajustar responsividade e animações.
7. Validar tipagem, testes, build e comportamento visual.

### Etapa 4 — Revisão

Conferir se nenhum componente introduziu dados duplicados, contratos paralelos, HTML/JSX monolítico ou dependência direta de uma futura API.

## 8. Critérios de aceite

- [ ] Identidade visual preto/dourado, sofisticada, sem neon e sem fundo espacial.
- [ ] Menu horizontal com item central destacado e navegação fluida.
- [ ] Interface legível e utilizável no dispositivo-alvo.
- [ ] Componentes reutilizáveis, pequenos e com responsabilidades claras.
- [ ] Nenhuma duplicação desnecessária de UI, lógica, tokens ou mocks.
- [ ] **Frontend consumindo o TypeScript mockado já existente.**
- [ ] **Nenhuma recriação da camada de dados pronta.**
- [ ] Integração futura com FastAPI possível sem reescrever componentes.
- [ ] Estados vazios, erro, carregamento e foco contemplados.
- [ ] Sem erros novos de TypeScript, lint, testes ou build.

## 9. Instrução final para o agente de desenvolvimento

> **Trabalhe sobre o código existente, não sobre um projeto imaginário.** Primeiro leia a arquitetura TypeScript e os mocks atuais. Depois implemente a identidade premium preto/dourado inspirada na composição da referência, mas com acabamento sóbrio. Priorize componentes coesos, reutilização real, DRY, tipagem e separação entre apresentação e dados. As páginas devem ser pequenas composições de componentes, e todos os dados exibidos devem vir da camada TS já disponível. Não recrie mocks, serviços ou contratos. Não conecte uma API inexistente agora. Prepare a interface para que a futura substituição dos mocks pela API FastAPI aconteça na camada de dados, com o mínimo de impacto visual.
