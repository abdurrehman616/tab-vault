/**
 * A single browser tab that has been saved into TabVault. Holds only what's
 * needed to display and restore the tab later — not a full Chrome tab record.
 */
export interface SavedTab {
  id: string;
  url: string;
  title: string;
  faviconUrl?: string;
  /** ID of the Chrome window this tab was saved from, for grouping tabs saved together. */
  windowId: number;
  /** Position within that window at save time, for restoring tab order. */
  index: number;
  savedAt: number;
  /** ID of the TabGroup this tab belongs to. Always set — falls back to the default group. */
  groupId: string;
  /** Whether the user has marked this tab as a favorite. Always set — falls back to false. */
  isFavorite: boolean;
}
