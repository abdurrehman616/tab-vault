import { groupChromeTabs, updateChromeTabGroup } from '../services/chrome';
import { getChromeGroupInfos } from '../services/storage';
import type { ChromeTabGroupInfo, SavedTab } from '../types';

export type RecreateChromeGroupsOutcome = { recreatedCount: number; failedCount: number };

/**
 * Given tabs that were just successfully restored (each paired with the new
 * Chrome tab id it got), re-clusters any that shared a `chromeGroupKey`
 * back into a real Chrome Tab Group, with its original title and color.
 *
 * This runs strictly *after* the tabs themselves are already open and
 * already removed from storage — it's a best-effort visual/cosmetic step
 * layered on top, isolated from the tab restoration itself. A failure here
 * (e.g. Chrome rejects grouping one cluster) never risks the tabs that were
 * already successfully restored; it only means that one cluster doesn't get
 * its group back, which is reported to the caller rather than silently
 * dropped. One problematic cluster does not stop the others from being
 * processed.
 */
export async function recreateChromeGroups(
  restoredTabs: { tab: SavedTab; chromeTabId: number }[],
): Promise<RecreateChromeGroupsOutcome> {
  // Cluster the newly-created Chrome tab ids by chromeGroupKey, preserving
  // the order tabs were restored in (see openTabsInOrder) within each cluster.
  const chromeTabIdsByKey = new Map<string, number[]>();
  for (const { tab, chromeTabId } of restoredTabs) {
    if (!tab.chromeGroupKey) continue;
    const ids = chromeTabIdsByKey.get(tab.chromeGroupKey) ?? [];
    ids.push(chromeTabId);
    chromeTabIdsByKey.set(tab.chromeGroupKey, ids);
  }

  if (chromeTabIdsByKey.size === 0) {
    return { recreatedCount: 0, failedCount: 0 };
  }

  let infos: ChromeTabGroupInfo[];
  try {
    infos = await getChromeGroupInfos();
  } catch {
    console.error('TabVault: failed to read Chrome tab group metadata');
    return { recreatedCount: 0, failedCount: chromeTabIdsByKey.size };
  }
  const infoById = new Map(infos.map((info) => [info.id, info]));

  let recreatedCount = 0;
  let failedCount = 0;
  for (const [key, chromeTabIds] of chromeTabIdsByKey) {
    // chromeTabIds is always non-empty by construction (only pushed to
    // above), but chrome.tabs.group()'s type requires a non-empty tuple.
    if (chromeTabIds.length === 0) continue;
    const [firstTabId, ...restTabIds] = chromeTabIds;

    try {
      const newChromeGroupId = await groupChromeTabs([firstTabId, ...restTabIds]);
      const info = infoById.get(key);
      if (info) {
        await updateChromeTabGroup(newChromeGroupId, { title: info.title, color: info.color });
      }
      recreatedCount += 1;
    } catch {
      console.error('TabVault: failed to recreate a Chrome tab group', key);
      failedCount += 1;
    }
  }

  return { recreatedCount, failedCount };
}
