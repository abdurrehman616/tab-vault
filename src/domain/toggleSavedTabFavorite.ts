import type { SavedTab } from '../types';

/**
 * Returns `tabs` with the given tab's favorite flag flipped. Pure and
 * synchronous — mirrors the same client-computed-then-persisted pattern
 * used for reordering (see `reorderSavedTabs.ts`): the caller already has
 * the current `savedTabs` in memory, so no storage read is needed just to
 * flip one flag. Returns the original reference unchanged if the tab no
 * longer exists.
 */
export function computeToggledFavorite(tabs: SavedTab[], tabId: string): SavedTab[] {
  const index = tabs.findIndex((tab) => tab.id === tabId);
  if (index === -1) return tabs;

  const updated = [...tabs];
  updated[index] = { ...updated[index], isFavorite: !updated[index].isFavorite };
  return updated;
}
