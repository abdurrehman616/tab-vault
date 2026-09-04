import { getGroups, saveGroups } from '../services/storage';
import type { TabGroup } from '../types';

export type CreateGroupResult =
  | { status: 'created'; group: TabGroup }
  | { status: 'invalid-name' }
  | { status: 'error'; message: string };

/** Creates a new, initially empty group with the given name. */
export async function createGroup(name: string): Promise<CreateGroupResult> {
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

  const now = Date.now();
  const group: TabGroup = { id: crypto.randomUUID(), name: trimmedName, createdAt: now, updatedAt: now };

  try {
    await saveGroups([...groups, group]);
  } catch {
    return { status: 'error', message: "Couldn't create the group." };
  }

  return { status: 'created', group };
}
