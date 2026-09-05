import type { ChromeTabGroupInfo } from '../../types';
import { StorageError } from './errors';
import { STORAGE_KEYS } from './schema';

/**
 * Returns all captured Chrome Tab Group metadata (title/color), keyed by
 * TabVault's own stable ids — see `ChromeTabGroupInfo`. Resolves to `[]` if
 * none has been captured yet.
 */
export async function getChromeGroupInfos(): Promise<ChromeTabGroupInfo[]> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.chromeGroups);
    const infos = result[STORAGE_KEYS.chromeGroups];
    return Array.isArray(infos) ? (infos as ChromeTabGroupInfo[]) : [];
  } catch (error) {
    throw new StorageError('getChromeGroupInfos', error);
  }
}

/** Persists the given list of Chrome Tab Group metadata, replacing whatever was stored before. */
export async function saveChromeGroupInfos(infos: ChromeTabGroupInfo[]): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.chromeGroups]: infos });
  } catch (error) {
    throw new StorageError('saveChromeGroupInfos', error);
  }
}
