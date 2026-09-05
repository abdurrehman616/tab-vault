import { getSavedTabs } from '../services/storage';
import type { SavedTab } from '../types';
import { openTabsInOrder } from './openTabsInOrder';

export type OpenGroupTabsResult =
  | {
      status: 'opened';
      openedCount: number;
      failedCount: number;
      groupsRecreatedCount: number;
      groupsFailedCount: number;
    }
  | { status: 'nothing-to-open' }
  | { status: 'error'; message: string };

/** Reopens every saved tab belonging to one group, in the order they're stored. */
export async function openGroupTabs(groupId: string): Promise<OpenGroupTabsResult> {
  let tabs: SavedTab[];
  try {
    tabs = await getSavedTabs();
  } catch {
    return { status: 'error', message: "Couldn't read saved tabs." };
  }

  const groupTabs = tabs.filter((tab) => tab.groupId === groupId);
  if (groupTabs.length === 0) {
    return { status: 'nothing-to-open' };
  }

  const { openedCount, failedCount, groupsRecreatedCount, groupsFailedCount } = await openTabsInOrder(groupTabs);
  return { status: 'opened', openedCount, failedCount, groupsRecreatedCount, groupsFailedCount };
}
