import type { TabGroup } from './tabGroup.types';

/** The full set of tab groups persisted by TabVault at a point in time. */
export interface SavedSession {
  id: string;
  name: string;
  groups: TabGroup[];
  createdAt: number;
  updatedAt: number;
}
