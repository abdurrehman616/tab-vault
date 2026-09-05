import { updateSavedTabs } from '../services/storage';
import type { SavedTab } from '../types';

export type PersistSavedTabsResult =
  | { status: 'saved'; tabs: SavedTab[] }
  | { status: 'error'; message: string };

/**
 * Applies a pure transform (e.g. `computeReorderedSavedTabs` or
 * `computeToggledFavorite`, partially applied by the caller) to the *current*
 * saved tabs in storage, and persists the result.
 *
 * Deliberately takes a transform rather than an already-computed array: the
 * caller's in-memory `savedTabs` snapshot can be stale by the time this
 * resolves (another TabVault popup may have saved, deleted, or reordered
 * tabs in the meantime). Running the transform against a fresh read — via
 * `updateSavedTabs` — means this can never silently overwrite a concurrent
 * change with an outdated full-array snapshot; at worst, the transform
 * no-ops (e.g. the tab being reordered was already deleted elsewhere).
 *
 * Returns the actual persisted (or unchanged) array so the caller can
 * reconcile its own local state with what's truly in storage, rather than
 * assuming its optimistic guess was exactly right.
 */
export async function persistSavedTabs(
  transform: (current: SavedTab[]) => SavedTab[],
): Promise<PersistSavedTabsResult> {
  try {
    const tabs = await updateSavedTabs(transform);
    return { status: 'saved', tabs };
  } catch {
    return { status: 'error', message: "Couldn't save your changes." };
  }
}
