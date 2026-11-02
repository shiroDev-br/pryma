Pryma — front (Nuxt 3)

App de IPTV (web, TV e APK via Capacitor) e o **painel de staff em `/admin`**.

Backend: FastAPI em `/Users/shiro/orca/projects/api-pryma` (repositório separado).

## Produção (VPS)


|          |                                                                                                |
| -------- | ---------------------------------------------------------------------------------------------- |
| Servidor | `root@187.127.38.71` (acesso por chave SSH)                                                    |
| Front    | `http://187.127.38.71:3000` — container `iptv-front`, em `/opt/iptv-front`                     |
| API      | `http://187.127.38.71:8001` — containers `api-pryma-api` + `api-pryma-db` + `api-pryma-wallpaper-worker`, em `/opt/api-pryma` |


A VPS também hospeda **outros sistemas** (nginx em :80/:443 com `primeauto`,

`dmlavajato`, `integra`; mariadb; redis). Não mexer em nada fora de

`/opt/iptv-front`, `/opt/api-pryma` e dos quatro containers acima. Front e API

são servidos direto por IP:porta, sem nginx.

## Deploy do front

```bash
scripts/deploy-vps.sh                  # exige árvore de trabalho limpa (tudo commitado)
ALLOW_DIRTY=1 scripts/deploy-vps.sh    # publica a árvore como está — só se for intencional
scripts/deploy-vps.sh --rollback       # volta para o build anterior
```

O que o script faz (não fazer à mão de outro jeito):

1. Copia o projeto para uma pasta temporária (sem `node_modules`, `.nuxt`,

   `android/`, `.git`, zips) e roda `nuxt build` lá — assim não disputa o

   `.nuxt` com um `nuxt dev` aberto. `BUILD_ID` = commit + data (aparece no

   rodapé do login do app).
2. Envia `deploy/docker-compose.yml` e o `.output/` para `/opt/iptv-front/.output.next`.
3. Troca: `.output` → `.output.prev`, `.output.next` → `.output`, recria o

   container e espera o healthcheck (`/admin/login`). O build anterior fica

   em `.output.prev` para o rollback.

Conferir depois: abrir `http://187.127.38.71:3000/login` (o rodapé mostra o

build) e `/admin/login`; o console do navegador deve ficar sem erros.

- O build não acontece na VPS — o container só roda `node .output/server/index.mjs`

  (imagem `node:22-alpine`). Mudanças em `deploy/docker-compose.yml` vão

  junto no próximo deploy.
- `PUBLIC_API_BASE_URL` (padrão `http://187.127.38.71:8001`) é embutido no

  build e também passado em runtime (`NUXT_PUBLIC_API_BASE_URL`).
- Variáveis do `.env` local (ex.: `FOOTBALL_API_KEY`) entram no build — o que

  estiver em `runtimeConfig.public` vai para o navegador.

## Deploy da API (repo api-pryma)

Rodar a partir de `/Users/shiro/orca/projects/api-pryma`:

```bash
# 1. backup do banco ANTES de qualquer migração
ssh root@187.127.38.71 'mkdir -p /root/backups/api-pryma && docker exec api-pryma-db pg_dump -U postgres -d api_pryma -Fc > /root/backups/api-pryma/api_pryma-$(date -u +%Y%m%dT%H%M%SZ).dump'

# 2. código (nunca enviar o .env local — o da VPS tem os segredos de produção)
rsync -az --exclude .venv --exclude .git --exclude .env --exclude 'playlist*.m3u' \
  --exclude .ruff_cache --exclude .opencode --exclude docker-compose.yml \
  --exclude __pycache__ --exclude .pytest_cache --exclude docs --exclude frontend-docs \
  --exclude tests --exclude data ./ root@187.127.38.71:/opt/api-pryma/

# 3. build da imagem (a API antiga segue no ar), migrações, troca do container
ssh root@187.127.38.71 'cd /opt/api-pryma \
  && docker compose -f docker-compose.prod.yml build api \
  && docker compose -f docker-compose.prod.yml run --rm --no-deps api alembic upgrade head \
  && docker compose -f docker-compose.prod.yml up -d api wallpaper-worker'

# 4. conferir
curl http://187.127.38.71:8001/api/v1/health      # 200
curl -o /dev/null -w '%{http_code}\n' http://187.127.38.71:8001/api/v1/media   # 401 (catálogo exige login)
```

Antes do deploy: `uv run ruff check . && uv run pytest` no repo da API.

### Wallpapers animados

- Admin importa em `/admin/wallpapers` (navega no DesktopHut ou cola o link).
  O container `api-pryma-wallpaper-worker` (mesma imagem da API, 1 CPU/1,5 GB,
  `nice 19`) baixa o original (HEVC 4K) e converte com ffmpeg para H.264
  1080p/720p + pôster/miniatura/prévia, um por vez.
- Arquivos em `/opt/api-pryma/data/wallpapers` (fora do rsync — `--exclude data`),
  servidos pela API em `/static/wallpapers` com cache `immutable`. O banco guarda
  só a pasta; a URL vem de `WALLPAPER_PUBLIC_BASE_URL`. Migrar para storage
  externo (R2/S3) = copiar a pasta + trocar essa variável.
- Limite de disco: `WALLPAPER_MAX_STORAGE_MB` (padrão 5 GB). Logs:
  `docker logs api-pryma-wallpaper-worker`.
- No app, o fundo animado só fica no pôster quando há outro vídeo na tela
  (`useSuspendBackgroundMotion` — prévia ao vivo e trailer), com
  `prefers-reduced-motion`/economia de dados, ou se não tocar em 8 s.
- Os termos do DesktopHut não autorizam uso comercial — pendente pedir permissão.

### Contas de staff (admin / revendedor)

Não existe cadastro público. Staff é criado pela CLI (a senha aparece uma única vez):

```bash
ssh root@187.127.38.71 'cd /opt/api-pryma && docker compose -f docker-compose.prod.yml exec -T api \
  python -m scripts.create_user --role reseller --username NOME'    # ou --role admin
```

Clientes são criados pelo painel (`/admin` → Novo cliente: nome + URL M3U).

### CORS

O `.env` da API na VPS tem `ALLOWED_ORIGINS` com a origem do front

(`http://187.127.38.71:3000`) e as do APK (`capacitor://localhost`,

`http://localhost`, `https://localhost`). Se o front mudar de porta/domínio,

acrescentar a nova origem lá e recriar a API

(`docker compose -f docker-compose.prod.yml up -d api`).

## Cuidados que já quebraram coisas

- **Bundle legado (`@vitejs/plugin-legacy`)**: o Nuxt imprime os `-legacy.js`

  como `type="module"`. No servidor isso é corrigido por

  `server/plugins/legacy-scripts.ts`; no APK, por `scripts/fix-legacy-html.mjs`.

  Sem isso, navegador moderno roda o bundle legado (`System is not defined`).
- **CSS do painel**: tudo em `assets/css/admin.css`, carregado como CSS

  global (`css` no `nuxt.config.ts`). Não usar `<style scoped>` nem

  `import` de CSS nas páginas do painel: elas rodam sem SSR e, com

  `cssCodeSplit: false`, CSS de componente vai para um `style.css` que o HTML

  não referencia — em produção o painel fica sem estilo (no dev funciona,

  então não confie no dev para isso). Conferir com screenshot da VPS.
- **Painel `/admin`**: só web. É removido do build do APK (`pages:extend` em

  `nuxt.config.ts` quando `NUXT_SSR=0`) e roda sem SSR (`routeRules`). A

  autorização real é da API — o middleware `admin` é só navegação.
- **Breakpoints do Tailwind estão neutralizados** (tudo escala por rem para TV):

  `md:`/`lg:` sempre valem. Responsividade do painel é por media query em

  `assets/css/admin.css` (tabelas viram cartões ≤ 900px; navegação em linha

  própria ≤ 760px).
- **Escala de TV (`plugins/viewport-scale.client.ts`)**: em landscape o app

  muda o `font-size` do `<html>` pela tela (22px em 1080p, 8px em celular

  deitado). O painel `/admin` é excluído (`isAdminPath`) e usa rem normal —

  qualquer rota nova do painel precisa ficar sob `/admin` para herdar isso.

  Testar o painel em 1920×1080, 1024×768, 844×390 e 390×844.
- **APK**: `npm run apk` (gera SPA estático + `cap sync`). Não usa a VPS do

  front — fala direto com a API em `:8001`.

