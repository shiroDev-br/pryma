# PRYSMA — pacote de redesign da Home

Este pacote contém **somente os arquivos que precisam ser criados/substituídos** no projeto original.

## Objetivo

Transformar a Home atual no layout da referência enviada pelo usuário:

- sem sidebar;
- fundo cinematográfico em tela cheia;
- logo + nome no topo esquerdo;
- time favorito preservado no topo;
- busca, plano de fundo e acesso ao time no topo direito;
- relógio/data no topo direito;
- carrossel central com 5 cards: Canais, Filmes, Planos, Séries e Animação;
- card central grande com glow azul;
- cards laterais menores e inclinados;
- cards com arte visual em vez do visual preto/dourado atual;
- barra inferior transformada em navegação rápida;
- preservação da lógica existente de time favorito, próximo jogo, troca de fundo, catálogo e planos.

## Arquivos para substituir

```text
pages/index.vue
composables/useHomeMenu.ts
composables/useBackgrounds.ts
components/layout/AppHeader.vue
components/layout/AppBackground.vue
components/navigation/HomeCarousel.vue
components/navigation/NavigationCard.vue
assets/css/main.css
```

## Arquivos novos

```text
components/navigation/HomeNavigationBar.vue
assets/backgrounds/default-home.svg
public/prysma-mark.svg
```

## Importante

Não substituir nem remover `components/layout/BottomInfoBar.vue`.

Ele continua sendo utilizado por outras telas (`background`, `team` e `medias`). A Home passa a usar `HomeNavigationBar.vue` exclusivamente.

Não mexer em:

```text
composables/useFavoriteTeam.ts
stores/football.ts
pages/team.vue
pages/background.vue
stores/preferences.ts
components/football/NextMatchBadge.vue
```

Essas funcionalidades já estão prontas e devem continuar funcionando.

## Sobre Animação

O card aponta para:

```text
/medias?category=animacao
```

Se o backend/mock usar outro slug para a categoria de animação, o Agent deve trocar **somente esse slug**, sem alterar o restante da implementação.

## Identidade

A implementação usa `Prysma` como nome atual do sistema e `/public/prysma-mark.svg` como marca temporária baseada no conceito visual da referência.

Se o projeto possuir uma logo oficial diferente, substituir somente o asset/markup da marca.

## Validação

Depois de aplicar:

```bash
npm run typecheck
npm run build
```

Validar visualmente em pelo menos:

- 1920x1080
- 1536x864
- 1366x768
- mobile

A home deve continuar navegável por teclado/controle remoto com `←`, `→` e `Enter`.
