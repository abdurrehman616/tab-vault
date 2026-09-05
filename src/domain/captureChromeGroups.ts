import { getChromeTabGroup } from '../services/chrome';
import { getChromeGroupInfos, saveChromeGroupInfos } from '../services/storage';
import type { BrowserTab, ChromeTabGroupInfo } from '../types';

/** Matches `chrome.tabGroups.TAB_GROUP_ID_NONE` — see services/chrome/tabs.ts. */
const NO_CHROME_GROUP = -1;

/**
 * For a batch of tabs about to be saved, looks up any *Chrome* Tab Group
 * metadata (title/color) they belong to, persists a stable internal record
 * of it, and returns a map from each tab's Chrome group id (ephemeral,
 * meaningful only within this save operation) to that stable record.
 *
 * Chrome's own group ids are never persisted as permanent identifiers —
 * they're read here purely to correlate which of these tabs shared a group
 * *right now*; each one gets a freshly generated internal key. If reading
 * or persisting a particular group's metadata fails, the affected tabs are
 * simply saved without Chrome-group info (never blocks the save itself).
 */
export async function captureChromeGroupsForTabs(
  browserTabs: BrowserTab[],
): Promise<Map<number, ChromeTabGroupInfo>> {
  const chromeGroupIds = [...new Set(browserTabs.map((tab) => tab.chromeGroupId))].filter(
    (id) => id !== NO_CHROME_GROUP,
  );
  if (chromeGroupIds.length === 0) {
    return new Map();
  }

  const infoByChromeGroupId = new Map<number, ChromeTabGroupInfo>();
  for (const chromeGroupId of chromeGroupIds) {
    try {
      const details = await getChromeTabGroup(chromeGroupId);
      infoByChromeGroupId.set(chromeGroupId, { id: crypto.randomUUID(), title: details.title, color: details.color });
    } catch {
      console.error('TabVault: failed to read a Chrome tab group', chromeGroupId);
    }
  }

  if (infoByChromeGroupId.size === 0) {
    return infoByChromeGroupId;
  }

  try {
    const existing = await getChromeGroupInfos();
    await saveChromeGroupInfos([...existing, ...infoByChromeGroupId.values()]);
  } catch {
    console.error('TabVault: failed to persist Chrome tab group metadata');
    // The metadata isn't actually saved — don't hand back references to
    // records that don't exist in storage.
    return new Map();
  }

  return infoByChromeGroupId;
}
