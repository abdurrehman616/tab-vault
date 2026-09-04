import { DEFAULT_GROUP_ID, reassignTabsGroup, removeGroup } from '../services/storage';

export type DeleteGroupResult =
  | { status: 'deleted' }
  | { status: 'cannot-delete-default' }
  | { status: 'error'; message: string };

/**
 * Deletes a group. Its tabs are never deleted with it — they're reassigned
 * to the default "Saved Tabs" group first, and only once that reassignment
 * has been durably persisted is the (now-empty) group record removed. The
 * default group itself can't be deleted, since tabs always need a group to
 * fall back to.
 */
export async function deleteGroup(id: string): Promise<DeleteGroupResult> {
  if (id === DEFAULT_GROUP_ID) {
    return { status: 'cannot-delete-default' };
  }

  try {
    await reassignTabsGroup(id, DEFAULT_GROUP_ID);
  } catch {
    return { status: 'error', message: "Couldn't move this group's tabs, so it wasn't deleted." };
  }

  try {
    await removeGroup(id);
  } catch {
    return { status: 'error', message: "This group's tabs are safe, but the group itself couldn't be deleted." };
  }

  return { status: 'deleted' };
}
