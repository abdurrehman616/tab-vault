import { openTab } from '../services/chrome';
import { removeSavedTab } from '../services/storage';
import type { SavedTab } from '../types';

export type OpenTabsOutcome = { openedCount: number; failedCount: number };

/**
 * Opens the given saved tabs one at a time, in order. Each tab is removed
 * from storage immediately after Chrome confirms it was reopened — not
 * batched until the end of the loop — so that if execution is interrupted
 * partway through (e.g. the popup is closed, or the browser is closed), the
 * tabs already opened are correctly cleared from storage and only the
 * not-yet-opened tabs remain saved. A tab that fails to open is left in
 * storage and does not stop the rest from being processed.
 */
export async function openTabsInOrder(tabs: SavedTab[]): Promise<OpenTabsOutcome> {
  let openedCount = 0;
  let failedCount = 0;

  for (const tab of tabs) {
    try {
      await openTab(tab.url);
    } catch {
      console.error('TabVault: failed to open saved tab', tab.id);
      failedCount += 1;
      continue;
    }

    openedCount += 1;
    try {
      await removeSavedTab(tab.id);
    } catch {
      // The tab was opened successfully; failing to remove its saved record
      // afterwards just leaves a harmless extra copy in the vault.
      console.error('TabVault: opened tab but failed to remove its saved record', tab.id);
    }
  }

  return { openedCount, failedCount };
}
