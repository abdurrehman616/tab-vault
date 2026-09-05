import type { SavedTab } from '../../types';
import { StorageError } from './errors';
import { DEFAULT_GROUP_ID, STORAGE_KEYS } from './schema';

async function readSavedTabs(): Promise<SavedTab[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.tabs);
  const tabs = result[STORAGE_KEYS.tabs];
  if (!Array.isArray(tabs)) return [];
  // Tabs saved before groups/favorites existed are missing these fields;
  // default them on read rather than migrating storage.
  return (tabs as SavedTab[]).map((tab) => ({
    ...tab,
    groupId: tab.groupId ?? DEFAULT_GROUP_ID,
    isFavorite: tab.isFavorite ?? false,
  }));
}

async function writeSavedTabs(tabs: SavedTab[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.tabs]: tabs });
}

/**
 * Returns all saved tabs, in stored order. Resolves to `[]` if nothing has
 * been saved yet.
 */
export async function getSavedTabs(): Promise<SavedTab[]> {
  try {
    return await readSavedTabs();
  } catch (error) {
    throw new StorageError('getSavedTabs', error);
  }
}

/**
 * Persists the given list of saved tabs, replacing whatever was stored
 * before.
 */
export async function saveSavedTabs(tabs: SavedTab[]): Promise<void> {
  try {
    await writeSavedTabs(tabs);
  } catch (error) {
    throw new StorageError('saveSavedTabs', error);
  }
}

/** Removes a single saved tab by id, e.g. once it has been successfully reopened. */
export async function removeSavedTab(id: string): Promise<void> {
  try {
    const tabs = await readSavedTabs();
    await writeSavedTabs(tabs.filter((tab) => tab.id !== id));
  } catch (error) {
    throw new StorageError('removeSavedTab', error);
  }
}

/** Reassigns every tab in one group to another group, in a single write. */
export async function reassignTabsGroup(fromGroupId: string, toGroupId: string): Promise<void> {
  try {
    const tabs = await readSavedTabs();
    const updated = tabs.map((tab) => (tab.groupId === fromGroupId ? { ...tab, groupId: toGroupId } : tab));
    await writeSavedTabs(updated);
  } catch (error) {
    throw new StorageError('reassignTabsGroup', error);
  }
}
