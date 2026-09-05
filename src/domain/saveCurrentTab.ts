import { closeTab, getCurrentTab } from '../services/chrome';
import { DEFAULT_GROUP_ID, getSavedTabs, saveSavedTabs } from '../services/storage';
import type { BrowserTab, ChromeTabGroupInfo, SavedTab } from '../types';
import { captureChromeGroupsForTabs } from './captureChromeGroups';

export type SaveCurrentTabResult =
  | { status: 'saved'; tab: SavedTab; totalSaved: number }
  | { status: 'duplicate' }
  | { status: 'not-savable' }
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
 * Saves the currently active tab to TabVault and, only once that data has
 * been durably persisted, closes it in Chrome.
 *
 * Persistence always happens before the tab is closed: if reading or writing
 * storage fails, the tab is left open and no data is lost.
 */
export async function saveCurrentTab(): Promise<SaveCurrentTabResult> {
  let browserTab: BrowserTab | null;
  try {
    browserTab = await getCurrentTab();
  } catch {
    return { status: 'error', message: "Couldn't read the current tab." };
  }

  if (!browserTab) {
    return { status: 'not-savable' };
  }

  let existing: SavedTab[];
  try {
    existing = await getSavedTabs();
  } catch {
    return { status: 'error', message: "Couldn't read saved tabs." };
  }

  if (existing.some((saved) => saved.url === browserTab.url)) {
    return { status: 'duplicate' };
  }

  const chromeGroupInfoByChromeId = await captureChromeGroupsForTabs([browserTab]);
  const savedTab = toSavedTab(browserTab, chromeGroupInfoByChromeId);
  const updated = [...existing, savedTab];

  try {
    await saveSavedTabs(updated);
  } catch {
    return { status: 'error', message: "Couldn't save the tab, so it's still open." };
  }

  try {
    await closeTab(browserTab.id);
  } catch {
    // The tab was saved successfully; a failure to close it afterwards
    // doesn't put any data at risk, so it isn't reported as an error.
    console.error('TabVault: saved tab but failed to close it', browserTab.id);
  }

  return { status: 'saved', tab: savedTab, totalSaved: updated.length };
}
