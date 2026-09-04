import { openTab } from '../services/chrome';
import { removeSavedTab } from '../services/storage';
import type { SavedTab } from '../types';

export type OpenSavedTabResult = { status: 'opened' } | { status: 'error'; message: string };

/**
 * Reopens a saved tab in a new Chrome tab and, only once that succeeds,
 * removes it from storage.
 *
 * If opening fails, the saved tab is left untouched — nothing is ever
 * removed from storage before Chrome confirms the tab was created.
 */
export async function openSavedTab(tab: SavedTab): Promise<OpenSavedTabResult> {
  try {
    await openTab(tab.url);
  } catch {
    return { status: 'error', message: "Couldn't open the tab. It's still saved." };
  }

  try {
    await removeSavedTab(tab.id);
  } catch {
    // The tab was opened successfully; failing to remove its saved record
    // afterwards just leaves a harmless extra copy in the vault.
    console.error('TabVault: opened tab but failed to remove its saved record', tab.id);
  }

  return { status: 'opened' };
}
