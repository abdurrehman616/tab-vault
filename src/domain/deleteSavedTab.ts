import { removeSavedTab } from '../services/storage';

export type DeleteSavedTabResult = { status: 'deleted' } | { status: 'error'; message: string };

/**
 * Permanently removes one saved tab from local storage, identified by its
 * stable id. Every other saved tab is left untouched.
 */
export async function deleteSavedTab(id: string): Promise<DeleteSavedTabResult> {
  try {
    await removeSavedTab(id);
  } catch {
    return { status: 'error', message: "Couldn't delete the tab. Please try again." };
  }

  return { status: 'deleted' };
}
