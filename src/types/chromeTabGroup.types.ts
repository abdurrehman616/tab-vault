/** The exact color values Chrome accepts for a Tab Group. */
export type ChromeTabGroupColor = 'grey' | 'blue' | 'red' | 'yellow' | 'green' | 'pink' | 'purple' | 'cyan' | 'orange';

/**
 * TabVault's own record of a *Chrome* Tab Group's appearance, captured at
 * save time so it can be recreated on restore.
 *
 * This is deliberately separate from TabVault's own `TabGroup` (the
 * user-organized collection tabs are saved into) — a Chrome Tab Group is a
 * different concept that happens to also be called a "group". A SavedTab
 * references one of these via `chromeGroupKey`, exactly the same
 * relational pattern `SavedTab.groupId` uses for TabVault's own groups.
 *
 * `id` is a stable key TabVault generates itself, NOT Chrome's own group
 * id — Chrome's group ids are only unique within a single browser session
 * and are never guaranteed to still mean anything after a restart, so they
 * are never persisted as if they were permanent identifiers.
 */
export interface ChromeTabGroupInfo {
  id: string;
  title: string;
  color: ChromeTabGroupColor;
}
