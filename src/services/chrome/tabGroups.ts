import type { ChromeTabGroupColor } from '../../types';
import { ChromeApiError } from './errors';

/**
 * Reads a live Chrome Tab Group's title/color. Requires the `tabGroups`
 * permission (unlike reading `tab.groupId` itself, which only needs `tabs`).
 */
export async function getChromeTabGroup(
  chromeGroupId: number,
): Promise<{ title: string; color: ChromeTabGroupColor }> {
  try {
    const group = await chrome.tabGroups.get(chromeGroupId);
    return { title: group.title ?? '', color: group.color };
  } catch (error) {
    throw new ChromeApiError('getChromeTabGroup', error);
  }
}

/**
 * Groups the given (already-open) tabs together, creating a new Chrome Tab
 * Group, and returns its (session-scoped, ephemeral) group id.
 */
export async function groupChromeTabs(tabIds: [number, ...number[]]): Promise<number> {
  try {
    return await chrome.tabs.group({ tabIds });
  } catch (error) {
    throw new ChromeApiError('groupChromeTabs', error);
  }
}

/** Sets a Chrome Tab Group's title and color. */
export async function updateChromeTabGroup(
  chromeGroupId: number,
  details: { title: string; color: ChromeTabGroupColor },
): Promise<void> {
  try {
    await chrome.tabGroups.update(chromeGroupId, { title: details.title, color: details.color });
  } catch (error) {
    throw new ChromeApiError('updateChromeTabGroup', error);
  }
}
