import { saveSavedTabs } from '../services/storage';
import type { SavedTab } from '../types';

export type PersistSavedTabsResult = { status: 'saved' } | { status: 'error'; message: string };

/**
 * Persists an already-computed saved-tabs snapshot — e.g. from
 * `computeReorderedSavedTabs` or `computeToggledFavorite`. Shared by any
 * action where the UI already knows the full new array (from its own
 * in-memory state) and just needs it written to storage, no extra read.
 * Generalized from reorderSavedTabs.ts's `persistSavedTabsOrder`, which is
 * now just this function under a new name.
 */
export async function persistSavedTabs(tabs: SavedTab[]): Promise<PersistSavedTabsResult> {
  try {
    await saveSavedTabs(tabs);
  } catch {
    return { status: 'error', message: "Couldn't save your changes." };
  }
  return { status: 'saved' };
}
