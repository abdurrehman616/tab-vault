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
}
