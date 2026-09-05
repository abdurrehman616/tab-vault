import { closeTab, getAllWindowTabs, getCurrentWindowTabs } from '../services/chrome';
import { DEFAULT_GROUP_ID, getSavedTabs, updateSavedTabs } from '../services/storage';
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
 * Saves every savable tab returned by `getOpenTabs` and, only once that data
 * has been durably persisted in a single write, closes the tabs that were
 * saved.
 *
 * Tabs whose URL is already saved from a previous action are left untouched
 * (not re-saved, not closed) so repeat saves don't pile up duplicates. Tabs
 * that share a URL with each other *within this batch* are all saved and
 * closed — that reflects tabs the user genuinely had open together.
 *
 * The duplicate check runs twice, for the same reason as in
 * `saveCurrentTab`: an up-front check (against `existing`) decides which
 * open tabs are even candidates worth converting/closing, but the actual
 * write happens through `updateSavedTabs`, which re-filters against storage
 * as it is *at write time* — so a tab saved by another TabVault popup in the
 * exact moment in between is never duplicated, and no unrelated change that
 * popup made (e.g. a delete) is clobbered by writing back a stale snapshot.
 *
 * If reading tabs/storage or writing storage fails, nothing is closed and no
 * data is lost. If some tabs fail to close after a successful save, that is
 * reported back rather than silently dropped — the data itself is safe
 * either way, since it was already persisted before any tab was closed.
 */
async function saveOpenTabs(getOpenTabs: () => Promise<BrowserTab[]>): Promise<SaveAllTabsResult> {
  let openTabs: BrowserTab[];
  try {
    openTabs = await getOpenTabs();
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

  if (tabsToSave.length === 0) {
    return { status: 'nothing-to-save' };
  }

  const chromeGroupInfoByChromeId = await captureChromeGroupsForTabs(tabsToSave);
  const candidateSavedTabs = tabsToSave.map((tab) => toSavedTab(tab, chromeGroupInfoByChromeId));
  const candidateIdByOpenTabIndex = candidateSavedTabs.map((tab) => tab.id);

  let updated: SavedTab[];
  try {
    updated = await updateSavedTabs((current) => {
      const currentUrls = new Set(current.map((tab) => tab.url));
      const freshlyNewTabs = candidateSavedTabs.filter((tab) => !currentUrls.has(tab.url));
      return freshlyNewTabs.length === 0 ? current : [...current, ...freshlyNewTabs];
    });
  } catch {
    return { status: 'error', message: "Couldn't save the tabs, so none were closed." };
  }

  // `updated` reflects exactly which candidates actually got written (a
  // candidate is dropped if another context saved the same URL first, in
  // the fresh check inside the updater above) — recover that set by id,
  // since these are freshly generated UUIDs with no risk of collision.
  const persistedIds = new Set(updated.map((tab) => tab.id));
  const tabsActuallySaved = tabsToSave.filter((_, i) => persistedIds.has(candidateIdByOpenTabIndex[i]));
  const closeResults = await Promise.allSettled(tabsActuallySaved.map((tab) => closeTab(tab.id)));
  const unclosedCount = closeResults.filter((result) => result.status === 'rejected').length;
  if (unclosedCount > 0) {
    console.error(`TabVault: saved ${tabsActuallySaved.length} tabs but failed to close ${unclosedCount} of them`);
  }

  return {
    status: 'saved',
    savedCount: tabsActuallySaved.length,
    skippedDuplicateCount: orderedOpenTabs.length - tabsActuallySaved.length,
    unclosedCount,
    totalSaved: updated.length,
  };
}

/** Saves every savable tab in the current window. */
export async function saveAllTabs(): Promise<SaveAllTabsResult> {
  return saveOpenTabs(getCurrentWindowTabs);
}

/** Saves every savable tab across every open Chrome window. */
export async function saveAllWindowsTabs(): Promise<SaveAllTabsResult> {
  return saveOpenTabs(getAllWindowTabs);
}
