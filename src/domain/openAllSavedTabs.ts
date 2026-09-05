import { getSavedTabs } from '../services/storage';
import type { SavedTab } from '../types';
import { openTabsInOrder } from './openTabsInOrder';

export type OpenAllSavedTabsResult =
  | {
      status: 'opened';
      openedCount: number;
      failedCount: number;
      groupsRecreatedCount: number;
      groupsFailedCount: number;
    }
  | { status: 'nothing-to-open' }
  | { status: 'error'; message: string };

/** Reopens every saved tab, across all groups, in the order they're stored. */
export async function openAllSavedTabs(): Promise<OpenAllSavedTabsResult> {
  let tabs: SavedTab[];
  try {
    tabs = await getSavedTabs();
  } catch {
    return { status: 'error', message: "Couldn't read saved tabs." };
  }

  if (tabs.length === 0) {
    return { status: 'nothing-to-open' };
  }

  const { openedCount, failedCount, groupsRecreatedCount, groupsFailedCount } = await openTabsInOrder(tabs);
  return { status: 'opened', openedCount, failedCount, groupsRecreatedCount, groupsFailedCount };
}
