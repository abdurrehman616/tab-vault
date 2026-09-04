/**
 * Keys under which TabVault persists data in chrome.storage.local.
 *
 * `session` reserves the storage layout for SavedSession support in a later
 * phase — no code reads or writes it yet.
 */
export const STORAGE_KEYS = {
  tabs: 'tabvault.tabs',
  groups: 'tabvault.groups',
  session: 'tabvault.session',
} as const;

/**
 * The always-present fallback group. Newly saved tabs land here, and any
 * `SavedTab` persisted before groups existed is treated as belonging to it.
 */
export const DEFAULT_GROUP_ID = 'default';
export const DEFAULT_GROUP_NAME = 'Saved Tabs';
