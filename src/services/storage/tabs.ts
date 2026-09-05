import type { SavedTab } from '../../types';
import { StorageError } from './errors';
import { DEFAULT_GROUP_ID, STORAGE_KEYS } from './schema';

/**
 * Tabs saved before groups/favorites existed are missing these fields;
 * default them on read rather than migrating storage. Exported so any
 * consumer reading a raw `STORAGE_KEYS.tabs` value (e.g. a
 * `chrome.storage.onChanged` listener) can apply the same normalization
 * this module uses internally.
 */
export function normalizeSavedTabs(tabs: unknown): SavedTab[] {
  if (!Array.isArray(tabs)) return [];
  return (tabs as SavedTab[]).map((tab) => ({
    ...tab,
    groupId: tab.groupId ?? DEFAULT_GROUP_ID,
    isFavorite: tab.isFavorite ?? false,
  }));
}

async function readSavedTabs(): Promise<SavedTab[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.tabs);
  return normalizeSavedTabs(result[STORAGE_KEYS.tabs]);
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

// `chrome.storage.local` has no compare-and-swap or transaction primitive:
// there is no way to say "write this, but only if nothing else has written
// since I last read." A handful of retries is enough to make the optimistic
// check below reliable for any realistic timing (two contexts acting even a
// few milliseconds apart); it exists to bound the loop, not because five
// genuinely-simultaneous popups are expected.
const MAX_UPDATE_ATTEMPTS = 5;

/**
 * Reads the current saved tabs, applies `updater` to them, and writes the
 * result back — using an optimistic-concurrency retry so a write from
 * another TabVault context (another popup window) in between this call's
 * read and write is never silently clobbered.
 *
 * Sequence per attempt: read `current`, compute `next = updater(current)`,
 * then re-read storage immediately before writing to confirm it still
 * matches `current`. If it doesn't — another context wrote in the meantime —
 * the attempt is abandoned and retried from scratch against the newer state,
 * rather than writing `next` (which was computed from data that's now
 * stale) over top of that other write. This is "optimistic concurrency
 * control", not a distributed transaction system: no locks, no coordination
 * between contexts, just detect-and-retry using the data already in
 * `chrome.storage.local`.
 *
 * `updater` should follow the same pure, same-reference-on-no-op convention
 * as `computeReorderedSavedTabs`/`computeToggledFavorite`, so a genuine no-op
 * (e.g. "tab already deleted by another context") is returned immediately
 * without a redundant write.
 */
export async function updateSavedTabs(updater: (current: SavedTab[]) => SavedTab[]): Promise<SavedTab[]> {
  try {
    for (let attempt = 0; attempt < MAX_UPDATE_ATTEMPTS; attempt++) {
      const current = await readSavedTabs();
      const next = updater(current);
      if (next === current) return next;

      const stillCurrent = await readSavedTabs();
      if (JSON.stringify(stillCurrent) !== JSON.stringify(current)) {
        continue; // Someone else wrote in between — retry against fresh state.
      }

      await writeSavedTabs(next);
      return next;
    }
    throw new Error('Gave up after too many concurrent write attempts.');
  } catch (error) {
    throw new StorageError('updateSavedTabs', error);
  }
}
