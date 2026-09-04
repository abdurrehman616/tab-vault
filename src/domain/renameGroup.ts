import { getGroups, saveGroups } from '../services/storage';
import type { TabGroup } from '../types';

export type RenameGroupResult =
  | { status: 'renamed' }
  | { status: 'invalid-name' }
  | { status: 'not-found' }
  | { status: 'error'; message: string };

/** Renames an existing group. */
export async function renameGroup(id: string, name: string): Promise<RenameGroupResult> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { status: 'invalid-name' };
  }

  let groups: TabGroup[];
  try {
    groups = await getGroups();
  } catch {
    return { status: 'error', message: "Couldn't read groups." };
  }

  const target = groups.find((group) => group.id === id);
  if (!target) {
    return { status: 'not-found' };
  }

  const updated = groups.map((group) =>
    group.id === id ? { ...group, name: trimmedName, updatedAt: Date.now() } : group,
  );

  try {
    await saveGroups(updated);
  } catch {
    return { status: 'error', message: "Couldn't rename the group." };
  }

  return { status: 'renamed' };
}
