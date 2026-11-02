import type { HttpClient } from '~/services/http';
import { ENDPOINTS } from '~/constants';
import type { AdminRepository } from '~/repositories/contracts';
import type {
  AdminWallpaper,
  AdminWallpaperList,
  ClientAccount,
  ClientList,
  CreatedReseller,
  Reseller,
  Server,
  SourceWallpaperPage,
  WallpaperImportResult,
} from '~/types';

/**
 * Painel de staff (admin/revendedor) — a API aplica o escopo:
 *
 * - GET  /users            revendedor: só os clientes dele; admin: todos,
 *                          filtrável por `resellerId` / `serverId` / `q`.
 * - Clientes não são cadastrados aqui: nascem no primeiro login do app (a API
 *   procura usuário/senha nos servidores cadastrados).
 * - POST /users/{id}/playlist/sync   verifica de novo a conta no servidor.
 * - DELETE /users/{id}     exclui o cliente (revendedor: só os dele).
 * - GET /servers           staff (dropdown do cadastro); POST/PATCH/DELETE — admin.
 * - GET/POST /resellers — admin.
 * - /admin/wallpapers — admin: fila de importação de fundos animados
 *   (navegar no DesktopHut, enfileirar, ocultar, repetir, excluir).
 */
export function createHttpAdminRepository(client: HttpClient): AdminRepository {
  return {
    listClients: (query, options) =>
      client.get<ClientList>(
        ENDPOINTS.users,
        {
          resellerId: query.resellerId,
          serverId: query.serverId,
          q: query.q,
          limit: query.limit,
          offset: query.offset,
        },
        options,
      ),

    syncClient: (id, options) => client.post<ClientAccount>(ENDPOINTS.userPlaylistSync(id), undefined, options),

    deleteClient: (id, options) => client.delete<void>(ENDPOINTS.userById(id), options),

    listResellers: (options) => client.get<{ items: Reseller[] }>(ENDPOINTS.resellers, undefined, options),

    createReseller: (payload, options) => client.post<CreatedReseller>(ENDPOINTS.resellers, payload, options),

    listServers: (options) => client.get<{ items: Server[] }>(ENDPOINTS.servers, undefined, options),

    createServer: (payload, options) => client.post<Server>(ENDPOINTS.servers, payload, options),

    updateServer: (id, payload, options) => client.patch<Server>(ENDPOINTS.serverById(id), payload, options),

    deleteServer: (id, options) => client.delete<void>(ENDPOINTS.serverById(id), options),

    listWallpapers: (query, options) =>
      client.get<AdminWallpaperList>(
        ENDPOINTS.adminWallpapers,
        { status: query.status, limit: query.limit, offset: query.offset },
        options,
      ),

    browseWallpaperSource: (params, options) =>
      client.get<SourceWallpaperPage>(ENDPOINTS.adminWallpaperSource, params, options),

    importWallpapers: (items, options) =>
      client.post<WallpaperImportResult>(ENDPOINTS.adminWallpapers, { items }, options),

    updateWallpaper: (id, payload, options) =>
      client.patch<AdminWallpaper>(ENDPOINTS.adminWallpaperById(id), payload, options),

    retryWallpaper: (id, options) => client.post<AdminWallpaper>(ENDPOINTS.adminWallpaperRetry(id), undefined, options),

    deleteWallpaper: (id, options) => client.delete<void>(ENDPOINTS.adminWallpaperById(id), options),
  };
}
