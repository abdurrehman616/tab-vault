import { getSavedTabs } from '../services/storage';
import type { SavedTab } from '../types';

/** All saved tabs, in saved order. Defaults to `[]` if storage can't be read. */
export async function listSavedTabs(): Promise<SavedTab[]> {
  try {
    return await getSavedTabs();
  } catch {
    return [];
  }
}
