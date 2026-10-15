# Plano de implementação — Home IPTV no estilo da referência

## Objetivo

Reestruturar a **home** para ficar visualmente próxima da imagem de referência: interface IPTV cinematográfica, fundo em tela cheia, navegação por cards centrais, identidade no topo e sem sidebar.

**Regra principal:** não refazer funcionalidades que já existem. O trabalho é principalmente de **layout, composição visual e integração** com o que o projeto já possui.

---

## 1. Mudança estrutural da Home

### Remover

- Sidebar lateral.
- A estrutura atual de navegação baseada em uma lista/carrossel com muitas categorias.
- A `BottomInfoBar` atual como barra de informações.
- Texto de boas-vindas genérico como elemento principal da home.

### Criar

Home dividida em:

1. **Header superior**
2. **Área principal cinematográfica**
3. **Carrossel principal de navegação**
4. **Barra inferior de atalhos/navegação**

A home deve ocupar praticamente toda a viewport e usar o plano de fundo atrás de todos os elementos.

---

# 2. Header

## Visual

Seguir a referência:

- fundo transparente/escuro;
- logo à esquerda;
- nome do sistema ao lado da logo;
- relógio + data no canto superior direito;
- ícones de busca, notificações e usuário;
- elementos pequenos, discretos e com bordas arredondadas;
- azul como cor principal de destaque.

### Alteração importante

Hoje o projeto já possui `AppHeader.vue`, então **não criar outro header**.

Adaptar:

```text
components/layout/AppHeader.vue
```

### Identidade

Trocar:

```text
Prysma
```

pela identidade/nome real do sistema quando definido.

Usar a logo real do sistema. Se ainda não existir no projeto, criar/adicionar um asset em:

```text
public/
```

ou

```text
assets/
```

### Ações do topo

Manter as funcionalidades existentes:

- relógio;
- data;
- time favorito;
- troca de plano de fundo.

Porém reorganizar visualmente.

Sugestão:

```text
[ LOGO + NOME ]                    [ 🔎 ] [ 🔔 ] [ 👤 ] [ 00:12 ]
                                      [ data ]
```

O acesso ao plano de fundo pode ficar dentro do menu de usuário/configurações, em vez de ocupar um botão fixo no topo.

---

# 3. Área principal

A referência possui uma área de destaque sobre um fundo cinematográfico.

Criar uma composição semelhante:

```text
                 NOME DO SISTEMA / FRASE CURTA

      [ CANAIS ] [ FILMES ] [ PLANOS ] [ SÉRIES ] [ ANIMAÇÃO ]
                         ^ card ativo

              navegação horizontal / foco central
```

O card central deve ser maior e ter destaque visual.

## Cards

Criar/reaproveitar:

```text
components/navigation/NavigationCard.vue
components/navigation/HomeCarousel.vue
```

O carrossel existente já possui:

- navegação;
- foco;
- teclado;
- cards adjacentes;
- perspectiva;
- seleção.

Portanto, **não reimplementar o mecanismo do carrossel**.

A alteração deve ser principalmente:

- dimensões;
- proporção;
- bordas;
- glow;
- fundo dos cards;
- tipografia;
- quantidade de itens exibidos;
- posição vertical;
- cores.

---

# 4. Itens principais do carrossel

A home deve priorizar exatamente estas áreas:

### 1. Canais

Destino:

```text
/medias?type=live
```

Ícone:

```text
material-symbols:live-tv
```

Descrição curta:

```text
Todos os canais em um só lugar.
```

---

### 2. Filmes

Destino:

```text
/medias?type=vod
```

Ícone:

```text
material-symbols:movie
```

Descrição:

```text
Lançamentos, clássicos e muito mais.
```

---

### 3. Planos

Destino:

```text
/pricing
```

Ícone:

```text
material-symbols:workspace-premium
```

Descrição:

```text
Escolha o plano ideal para você.
```

Este pode ser o card central/destaque inicial.

---

### 4. Séries

Destino:

```text
/medias?type=series
```

Ícone:

```text
material-symbols:video-library
```

Descrição:

```text
Suas séries favoritas sempre disponíveis.
```

---

### 5. Animação

Criar/usar uma categoria/filtro apropriado caso exista no catálogo.

Se a categoria de animação já vier da API:

```text
/medias?category=<slug-da-categoria>
```

Não inventar slug fixo se ele ainda não existir.

Caso a categoria não exista, deixar o item preparado para receber o slug real.

---

# 5. `useHomeMenu`

Arquivo:

```text
composables/useHomeMenu.ts
```

Simplificar o menu da home.

### Remover da primeira camada da home

- Lançamentos
- Catálogo
- categorias individuais
- excesso de categorias dinâmicas

Essas opções continuam existindo no sistema, mas **não devem competir com os cinco cards principais**.

A home deve ter uma navegação simples.

Estrutura esperada:

```ts
[
  canais,
  filmes,
  planos,
  series,
  animacao,
]
```

Categorias e funcionalidades secundárias continuam acessíveis pelas telas próprias.

---

# 6. Barra inferior

A barra inferior atual:

```text
components/layout/BottomInfoBar.vue
```

não deve mais funcionar como painel de informações do card.

Substituir por uma **barra de navegação rápida**, inspirada na faixa inferior da referência.

Exemplo:

```text
[ Início ] [ Canais ] [ Filmes ] [ Séries ] [ Meu time ] [ Favoritos ] [ Planos ]
```

Cada item deve ser clicável.

### Importante

Essa barra deve aproveitar funcionalidades que já existem.

Não criar páginas falsas.

---

# 7. Funcionalidades já prontas que DEVEM ser preservadas

## Time favorito

Já existe:

```text
composables/useFavoriteTeam.ts
stores/football.ts
pages/team.vue
```

Preservar:

- seleção do time;
- persistência;
- escudo;
- próximo jogo;
- atualização/cache.

Na nova home, exibir de forma compacta.

Sugestão:

```text
Meu time
[ escudo ] Flamengo
Próximo jogo: ...
```

Pode aparecer na barra inferior ou como pequeno bloco secundário.

**Não transformar o time favorito em um dos cinco cards principais.**

---

## Próximo jogo

Já existe integração em:

```text
server/api/football/next.get.ts
components/football/NextMatchBadge.vue
stores/football.ts
```

Preservar.

A nova home apenas deve reposicionar visualmente essa informação.

---

## Plano de fundo

Já existe:

```text
pages/background.vue
composables/useBackgrounds.ts
stores/preferences.ts
components/layout/AppBackground.vue
```

Preservar completamente a lógica.

A nova home deve apenas aproveitar melhor o fundo.

### Alteração visual

O fundo deve ocupar:

```text
100vw x 100vh
```

com:

- imagem cinematográfica;
- overlay escuro;
- gradiente;
- vinheta;
- conteúdo legível por cima.

A imagem da referência é apenas **referência visual**.

Não substituir a funcionalidade atual de escolha de fundo.

---

# 8. Fundo padrão

Criar/adicionar um fundo padrão mais próximo da referência:

- montanhas/paisagem cinematográfica;
- tons azulados;
- alto contraste;
- áreas escuras para leitura;
- sem elementos excessivamente claros atrás dos textos.

O fundo personalizado do usuário continua tendo prioridade.

Fluxo:

```text
Fundo personalizado selecionado
        ↓
usar fundo selecionado

sem seleção
        ↓
usar fundo padrão cinematográfico
```

---

# 9. Paleta

A referência usa principalmente:

```text
#020817
#06142D
#0A1F45
#0B5CFF
#1688FF
#FFFFFF
#A9B9D6
```

### Trocar a identidade atual

O projeto atualmente usa bastante:

```text
preto + dourado
```

A home nova deve migrar para:

```text
preto/azul escuro + azul elétrico
```

O dourado não deve continuar como cor dominante da home.

Se houver componentes internos que ainda usam dourado, adaptar somente onde fizer parte da nova identidade visual.

---

# 10. Card ativo

O card central deve ter:

- borda azul;
- glow azul;
- leve transparência;
- backdrop blur;
- sombra;
- imagem de fundo;
- ícone grande;
- título;
- descrição;
- botão/indicador de entrada.

Visual aproximado:

```text
┌─────────────────────────────┐
│                             │
│            ÍCONE            │
│                             │
│           PLANOS            │
│                             │
│ Escolha o plano ideal...    │
│                             │
│             →               │
└─────────────────────────────┘
        GLOW AZUL
```

Cards laterais:

- menores;
- mais escuros;
- parcialmente transparentes;
- menor brilho;
- ainda claramente legíveis.

---

# 11. Imagens dos cards

Os cards devem possuir imagens relacionadas ao conteúdo.

Exemplo:

```text
Canais    → imagem de TV/canais
Filmes    → imagem cinematográfica
Planos    → mosaico de conteúdo
Séries    → imagem de série
Animação  → imagem de animação
```

Não depender de imagens externas sem necessidade.

Preferir:

```text
assets/
public/
```

ou URLs que já existam no catálogo quando fizer sentido.

---

# 12. Página inicial

Alterar:

```text
pages/index.vue
```

A estrutura final deve ficar aproximadamente:

```vue
<AppBackground />

<AppHeader />

<main>
    <Hero / identidade />

    <HomeCarousel />

    <HomeNavigationBar />
</main>
```

Não criar sidebar.

---

# 13. Componentes

## Reaproveitar

```text
components/layout/AppBackground.vue
components/layout/AppHeader.vue
components/navigation/HomeCarousel.vue
components/navigation/NavigationCard.vue
components/navigation/NavigationIndicators.vue
components/football/NextMatchBadge.vue
```

## Adaptar

```text
components/layout/BottomInfoBar.vue
composables/useHomeMenu.ts
pages/index.vue
assets/css/main.css
```

## Possivelmente criar

```text
components/navigation/HomeNavigationBar.vue
```

ou substituir completamente a implementação de `BottomInfoBar`.

Não manter dois sistemas de navegação fazendo a mesma coisa.

---

# 14. Responsividade

A referência é desktop/TV, mas a interface precisa continuar funcionando em:

- 1920×1080;
- 1366×768;
- 1280×720;
- notebook;
- tablet;
- mobile.

No mobile:

- cards laterais podem desaparecer;
- card central ocupa maior largura;
- barra inferior vira scroll horizontal;
- header reduz elementos secundários.

---

# 15. Acessibilidade/navegação

Preservar o que já existe no carrossel:

- `←` / `→` para navegar;
- `Enter` para abrir;
- foco visível;
- `aria-label`;
- navegação por teclado.

Não trocar a navegação funcional por uma animação puramente visual.

---

# 16. O que NÃO fazer

Não:

- remover o sistema de time favorito;
- remover próximo jogo;
- remover troca de fundo;
- remover favoritos;
- remover busca;
- remover catálogo;
- remover player;
- remover planos;
- recriar API;
- alterar contratos da API sem necessidade;
- criar dados fictícios para funcionalidades que já possuem dados;
- colocar todas as categorias do catálogo na home;
- criar sidebar;
- manter a barra inferior antiga apenas com outro CSS;
- transformar a home em uma cópia literal da imagem.

A imagem deve ser usada como **referência de layout e identidade visual**, não como conteúdo literal.

---

# 17. Ordem de implementação

## Etapa 1 — Estrutura

- remover sidebar, caso exista em alguma camada;
- ajustar layout principal;
- garantir home full-screen;
- adaptar `AppHeader`.

## Etapa 2 — Identidade

- adicionar logo;
- adicionar nome do sistema;
- trocar cores para azul;
- ajustar tipografia;
- ajustar ícones.

## Etapa 3 — Fundo

- manter `useBackgrounds`;
- manter seleção persistida;
- criar fundo padrão cinematográfico;
- ajustar overlays.

## Etapa 4 — Cards

- simplificar `useHomeMenu`;
- deixar somente os cinco destinos principais;
- adaptar `NavigationCard`;
- adaptar `HomeCarousel`;
- adicionar imagens;
- destacar card ativo.

## Etapa 5 — Navegação inferior

- substituir `BottomInfoBar`;
- criar barra com atalhos;
- conectar às rotas existentes.

## Etapa 6 — Funcionalidades existentes

Integrar visualmente:

- time favorito;
- próximo jogo;
- favoritos;
- busca;
- plano de fundo;
- planos.

Sem alterar suas regras de negócio.

## Etapa 7 — Responsividade

Validar:

- 1920×1080;
- 1366×768;
- 1280×720;
- mobile.

## Etapa 8 — Finalização

- remover código/componente não utilizado;
- verificar rotas;
- verificar navegação por teclado;
- rodar `npm run typecheck`;
- rodar `npm run build`;
- revisar visual contra a referência.

---

# 18. Resultado esperado

A home final deve transmitir:

```text
IPTV premium
       ↓
fundo cinematográfico
       ↓
logo + nome do sistema
       ↓
5 áreas principais
       ↓
card central em destaque
       ↓
navegação simples
       ↓
funcionalidades existentes integradas sem poluir a tela
```

A prioridade visual é:

1. **conteúdo**
2. **navegação**
3. **identidade**
4. **time favorito/próximo jogo**
5. **ações secundárias**

Tudo deve parecer parte de um único produto, e não um conjunto de componentes independentes.
