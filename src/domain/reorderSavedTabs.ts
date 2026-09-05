import type { SavedTab } from '../types';

/** Pass as `targetIndexInGroup` to mean "the end of the target group's list". */
export const MOVE_TO_END = Number.MAX_SAFE_INTEGER;

/**
 * Returns `tabs` with `tabId` moved to `targetIndexInGroup` within
 * `targetGroupId`'s tabs. Reordering within a group and moving to a
 * different group are the same operation here — the tab's *current* group
 * is looked up from `tabs` itself, not assumed from the caller, so a
 * cross-group drop and a same-group reorder both just work.
 *
 * "Position within a group" is derived, not stored: display order for a
 * group has always just been that group's tabs in the order they appear in
 * the flat saved-tabs array (see `services/storage`), so moving a tab is
 * really just moving its position within this array relative to the other
 * tabs already in the target group — no new ordering field is introduced.
 *
 * Pure and synchronous — never touches storage, never mutates `tabs` or any
 * tab object still referenced elsewhere. If `tabId` doesn't exist, or the
 * move would produce the exact same order that already exists, the original
 * `tabs` reference is returned unchanged so callers can cheaply detect a
 * no-op with `===`.
 */
export function computeReorderedSavedTabs(
  tabs: SavedTab[],
  tabId: string,
  targetGroupId: string,
  targetIndexInGroup: number,
): SavedTab[] {
  const tab = tabs.find((t) => t.id === tabId);
  if (!tab) return tabs;

  const withoutMoved = tabs.filter((t) => t.id !== tabId);
  const targetGroupTabs = withoutMoved.filter((t) => t.groupId === targetGroupId);
  const clampedIndex = Math.max(0, Math.min(targetIndexInGroup, targetGroupTabs.length));
  const movedTab: SavedTab = tab.groupId === targetGroupId ? tab : { ...tab, groupId: targetGroupId };

  let result: SavedTab[];
  if (clampedIndex < targetGroupTabs.length) {
    // Insert immediately before whichever tab currently sits at that position.
    const anchorId = targetGroupTabs[clampedIndex].id;
    const anchorIndex = withoutMoved.findIndex((t) => t.id === anchorId);
    result = [...withoutMoved.slice(0, anchorIndex), movedTab, ...withoutMoved.slice(anchorIndex)];
  } else if (targetGroupTabs.length > 0) {
    // Append after the target group's current last tab.
    const lastId = targetGroupTabs[targetGroupTabs.length - 1].id;
    const lastIndex = withoutMoved.findIndex((t) => t.id === lastId);
    result = [...withoutMoved.slice(0, lastIndex + 1), movedTab, ...withoutMoved.slice(lastIndex + 1)];
  } else {
    // Target group currently has no tabs at all.
    result = [...withoutMoved, movedTab];
  }

  return isSameSavedTabsOrder(tabs, result) ? tabs : result;
}

/** True if two saved-tab arrays contain the exact same tabs, in the exact same order. */
export function isSameSavedTabsOrder(a: SavedTab[], b: SavedTab[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((tab, index) => tab === b[index]);
}
