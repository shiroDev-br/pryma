import type { MediaSummary } from '~/types';

/**
 * Conteúdo adulto — oculto por padrão em todo o app.
 * A flag de desbloqueio é uma `useState('adult.unlocked')` controlada pela UI;
 * até lá nada adulto aparece em listagens, abas, sidebar ou busca.
 */

/** Texto adulto (título, gênero, categoria…). */
export function isAdultText(text: string): boolean {
  const value = text.toLowerCase();
  return value.includes('adult') || value.startsWith('xxx');
}

/** Slug/id de categoria adulta (cobre `xxx-adultos` e `xxx-adultos-xxx`). */
export function isAdultCategory(slug: string): boolean {
  return isAdultText(slug);
}

/** Item de mídia adulto (por categoria). */
export function isAdultItem(item: Pick<MediaSummary, 'categoryId' | 'categoryName'>): boolean {
  if (item.categoryId && isAdultCategory(item.categoryId)) return true;
  return (item.categoryName ?? '').toLowerCase().includes('adulto');
}
