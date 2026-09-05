/**
 * A tab as read live from the Chrome tabs API, normalized into a stable shape.
 * Distinct from `SavedTab`, which represents a tab already persisted by TabVault.
 */
export interface BrowserTab {
  id: number;
  windowId: number;
  index: number;
  url: string;
  title: string;
  faviconUrl?: string;
  active: boolean;
  pinned: boolean;
  /** The Chrome Tab Group this tab belongs to, or -1 (`chrome.tabGroups.TAB_GROUP_ID_NONE`) if ungrouped. Ephemeral — only meaningful within the current browser session. */
  chromeGroupId: number;
}
