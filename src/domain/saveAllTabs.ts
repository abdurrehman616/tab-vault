import { closeTab, getCurrentWindowTabs } from '../services/chrome';
import { DEFAULT_GROUP_ID, getSavedTabs, saveSavedTabs } from '../services/storage';
import type { BrowserTab, ChromeTabGroupInfo, SavedTab } from '../types';
import { captureChromeGroupsForTabs } from './captureChromeGroups';

export type SaveAllTabsResult =
  | {
      status: 'saved';
      savedCount: number;
      skippedDuplicateCount: number;
      unclosedCount: number;
      totalSaved: number;
    }
  | { status: 'nothing-to-save' }
  | { status: 'error'; message: string };

function toSavedTab(browserTab: BrowserTab, chromeGroupInfoByChromeId: Map<number, ChromeTabGroupInfo>): SavedTab {
  return {
    id: crypto.randomUUID(),
    url: browserTab.url,
    title: browserTab.title,
    faviconUrl: browserTab.faviconUrl,
    windowId: browserTab.windowId,
    index: browserTab.index,
    savedAt: Date.now(),
    groupId: DEFAULT_GROUP_ID,
    isFavorite: false,
    chromeGroupKey: chromeGroupInfoByChromeId.get(browserTab.chromeGroupId)?.id,
  };
}

/**
 * Saves every savable tab in the current window and, only once that data has
 * been durably persisted in a single write, closes the tabs that were saved.
 *
 * Tabs whose URL is already saved from a previous action are left untouched
 * (not re-saved, not closed) so repeat saves don't pile up duplicates.
 * Tabs that share a URL with each other *within this batch* are all saved
 * and closed — that reflects tabs the user genuinely had open together.
 *
 * If reading tabs/storage or writing storage fails, nothing is closed and no
 * data is lost. If some tabs fail to close after a successful save, that is
 * reported back rather than silently dropped — the data itself is safe
 * either way, since it was already persisted before any tab was closed.
 */
export async function saveAllTabs(): Promise<SaveAllTabsResult> {
  let openTabs: BrowserTab[];
  try {
    openTabs = await getCurrentWindowTabs();
  } catch {
    return { status: 'error', message: "Couldn't read the open tabs." };
  }

  if (openTabs.length === 0) {
    return { status: 'nothing-to-save' };
  }

  let existing: SavedTab[];
  try {
    existing = await getSavedTabs();
  } catch {
    return { status: 'error', message: "Couldn't read saved tabs." };
  }

  const existingUrls = new Set(existing.map((tab) => tab.url));
  const orderedOpenTabs = [...openTabs].sort((a, b) => a.index - b.index);
  const tabsToSave = orderedOpenTabs.filter((tab) => !existingUrls.has(tab.url));
  const skippedDuplicateCount = orderedOpenTabs.length - tabsToSave.length;

  if (tabsToSave.length === 0) {
    return { status: 'nothing-to-save' };
  }

  const chromeGroupInfoByChromeId = await captureChromeGroupsForTabs(tabsToSave);
  const newSavedTabs = tabsToSave.map((tab) => toSavedTab(tab, chromeGroupInfoByChromeId));
  const updated = [...existing, ...newSavedTabs];

  try {
    await saveSavedTabs(updated);
  } catch {
    return { status: 'error', message: "Couldn't save the tabs, so none were closed." };
  }

  const closeResults = await Promise.allSettled(tabsToSave.map((tab) => closeTab(tab.id)));
  const unclosedCount = closeResults.filter((result) => result.status === 'rejected').length;
  if (unclosedCount > 0) {
    console.error(`TabVault: saved ${newSavedTabs.length} tabs but failed to close ${unclosedCount} of them`);
  }

  return {
    status: 'saved',
    savedCount: newSavedTabs.length,
    skippedDuplicateCount,
    unclosedCount,
    totalSaved: updated.length,
  };
}
