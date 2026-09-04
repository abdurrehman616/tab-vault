import { getGroups } from '../services/storage';
import type { TabGroup } from '../types';

/** All groups, in stored order. Defaults to `[]` if storage can't be read. */
export async function listGroups(): Promise<TabGroup[]> {
  try {
    return await getGroups();
  } catch {
    return [];
  }
}
