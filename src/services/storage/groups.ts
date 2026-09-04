import type { TabGroup } from '../../types';
import { StorageError } from './errors';
import { DEFAULT_GROUP_ID, DEFAULT_GROUP_NAME, STORAGE_KEYS } from './schema';

async function readGroups(): Promise<TabGroup[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.groups);
  const groups = result[STORAGE_KEYS.groups];
  return Array.isArray(groups) ? (groups as TabGroup[]) : [];
}

async function writeGroups(groups: TabGroup[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.groups]: groups });
}

/**
 * Returns all groups. Guarantees the default "Saved Tabs" group is always
 * present, creating and persisting it on first read if it's missing (fresh
 * install, or storage written before groups existed).
 */
export async function getGroups(): Promise<TabGroup[]> {
  try {
    const groups = await readGroups();
    if (groups.some((group) => group.id === DEFAULT_GROUP_ID)) {
      return groups;
    }

    const now = Date.now();
    const withDefault: TabGroup[] = [
      { id: DEFAULT_GROUP_ID, name: DEFAULT_GROUP_NAME, createdAt: now, updatedAt: now },
      ...groups,
    ];
    await writeGroups(withDefault);
    return withDefault;
  } catch (error) {
    throw new StorageError('getGroups', error);
  }
}

/** Persists the given list of groups, replacing whatever was stored before. */
export async function saveGroups(groups: TabGroup[]): Promise<void> {
  try {
    await writeGroups(groups);
  } catch (error) {
    throw new StorageError('saveGroups', error);
  }
}

/** Removes a single group by id. Does not touch any saved tabs. */
export async function removeGroup(id: string): Promise<void> {
  try {
    const groups = await readGroups();
    await writeGroups(groups.filter((group) => group.id !== id));
  } catch (error) {
    throw new StorageError('removeGroup', error);
  }
}
