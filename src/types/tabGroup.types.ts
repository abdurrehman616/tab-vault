/**
 * A named collection saved tabs can belong to. Tabs reference a group by id
 * (`SavedTab.groupId`) rather than a group embedding its tabs, so a tab's
 * membership can change without rewriting group records.
 */
export interface TabGroup {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}
