import { useEffect, useRef, useState } from 'react';
import {
  createGroup,
  deleteGroup,
  deleteSavedTab,
  listGroups,
  listSavedTabs,
  openAllSavedTabs,
  openGroupTabs,
  openSavedTab,
  renameGroup,
  saveAllTabs,
  saveCurrentTab,
} from '../domain';
import type { SavedTab, TabGroup } from '../types';

type Notification = { type: 'success' | 'error' | 'info'; message: string };

type BusyState =
  | { type: 'idle' }
  | { type: 'saving-current' }
  | { type: 'saving-all' }
  | { type: 'opening'; tabId: string }
  | { type: 'opening-all' }
  | { type: 'deleting'; tabId: string }
  | { type: 'creating-group' }
  | { type: 'renaming-group'; groupId: string }
  | { type: 'deleting-group'; groupId: string }
  | { type: 'opening-group'; groupId: string };

const NOTIFICATION_DURATION_MS: Record<Notification['type'], number> = {
  success: 2000,
  error: 4000,
  info: 3000,
};

function pluralTabs(count: number): string {
  return count === 1 ? 'tab' : 'tabs';
}

export function useTabVaultPopup() {
  const [savedTabs, setSavedTabs] = useState<SavedTab[]>([]);
  const [groups, setGroups] = useState<TabGroup[]>([]);
  // Starts false so the UI can avoid rendering the "no saved tabs" empty
  // state before the initial storage read resolves — `savedTabs`/`groups`
  // start as `[]` either way, which looks identical to a genuinely empty
  // vault until this flips true.
  const [isLoaded, setIsLoaded] = useState(false);
  const [busy, setBusy] = useState<BusyState>({ type: 'idle' });
  const [notification, setNotification] = useState<Notification | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listSavedTabs(), listGroups()]).then(([tabs, loadedGroups]) => {
      if (cancelled) return;
      setSavedTabs(tabs);
      setGroups(loadedGroups);
      setIsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), NOTIFICATION_DURATION_MS[notification.type]);
    return () => clearTimeout(timer);
  }, [notification]);

  const isBusy = busy.type !== 'idle';

  const refreshTabs = () => listSavedTabs().then(setSavedTabs);
  const refreshGroups = () => listGroups().then(setGroups);
  const refreshAll = () => Promise.all([refreshTabs(), refreshGroups()]);

  // All storage-mutating actions share this single lock: chrome.storage has
  // no transactions, so two concurrent read-modify-write sequences (e.g. two
  // rapid clicks, or a save and a group edit at once) could clobber each
  // other. Serializing them here is what keeps the vault's data safe.
  //
  // The lock is enforced with a ref, not just the `busy` state: state updates
  // are asynchronous and batched, so two click events handled in the same
  // tick could otherwise both read `isBusy` as false before either commits.
  // A ref is written synchronously, so the second call always sees the first
  // call's lock immediately, no matter how close together the clicks are.
  const busyRef = useRef(false);
  const runExclusive = async (state: BusyState, task: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(state);
    try {
      await task();
    } finally {
      busyRef.current = false;
      setBusy({ type: 'idle' });
    }
  };

  const handleSaveCurrentTab = () =>
    runExclusive({ type: 'saving-current' }, async () => {
      const result = await saveCurrentTab();
      switch (result.status) {
        case 'saved':
          await refreshTabs();
          setNotification({ type: 'success', message: 'Tab saved' });
          break;
        case 'duplicate':
          setNotification({ type: 'info', message: 'This tab is already saved.' });
          break;
        case 'not-savable':
          setNotification({ type: 'error', message: "This page can't be saved." });
          break;
        case 'error':
          setNotification({ type: 'error', message: result.message });
          break;
      }
    });

  const handleSaveAllTabs = () =>
    runExclusive({ type: 'saving-all' }, async () => {
      const result = await saveAllTabs();
      switch (result.status) {
        case 'saved': {
          await refreshTabs();
          const leftOpen = result.skippedDuplicateCount + result.unclosedCount;
          const message =
            leftOpen > 0
              ? `${result.savedCount} ${pluralTabs(result.savedCount)} saved — ${leftOpen} left open`
              : `${result.savedCount} ${pluralTabs(result.savedCount)} saved`;
          setNotification({ type: 'success', message });
          break;
        }
        case 'nothing-to-save':
          setNotification({ type: 'info', message: 'No new tabs to save.' });
          break;
        case 'error':
          setNotification({ type: 'error', message: result.message });
          break;
      }
    });

  const handleOpenTab = (tab: SavedTab) =>
    runExclusive({ type: 'opening', tabId: tab.id }, async () => {
      const result = await openSavedTab(tab);
      if (result.status === 'opened') {
        await refreshTabs();
        setNotification({ type: 'success', message: 'Tab opened' });
      } else {
        setNotification({ type: 'error', message: result.message });
      }
    });

  const handleDeleteTab = (tab: SavedTab) =>
    runExclusive({ type: 'deleting', tabId: tab.id }, async () => {
      const result = await deleteSavedTab(tab.id);
      if (result.status === 'deleted') {
        await refreshTabs();
        setNotification({ type: 'success', message: 'Tab deleted' });
      } else {
        setNotification({ type: 'error', message: result.message });
      }
    });

  const handleOpenAllTabs = () =>
    runExclusive({ type: 'opening-all' }, async () => {
      const result = await openAllSavedTabs();
      switch (result.status) {
        case 'opened': {
          await refreshTabs();
          const message =
            result.failedCount > 0
              ? `${result.openedCount} ${pluralTabs(result.openedCount)} opened — ${result.failedCount} couldn't open`
              : `${result.openedCount} ${pluralTabs(result.openedCount)} opened`;
          setNotification({ type: result.failedCount > 0 ? 'error' : 'success', message });
          break;
        }
        case 'nothing-to-open':
          setNotification({ type: 'info', message: 'No saved tabs to open.' });
          break;
        case 'error':
          setNotification({ type: 'error', message: result.message });
          break;
      }
    });

  const handleCreateGroup = (name: string) =>
    runExclusive({ type: 'creating-group' }, async () => {
      const result = await createGroup(name);
      switch (result.status) {
        case 'created':
          await refreshGroups();
          setNotification({ type: 'success', message: `Group "${result.group.name}" created` });
          break;
        case 'invalid-name':
          setNotification({ type: 'error', message: 'Enter a group name.' });
          break;
        case 'error':
          setNotification({ type: 'error', message: result.message });
          break;
      }
    });

  const handleRenameGroup = (group: TabGroup, name: string) =>
    runExclusive({ type: 'renaming-group', groupId: group.id }, async () => {
      const result = await renameGroup(group.id, name);
      switch (result.status) {
        case 'renamed':
          await refreshGroups();
          setNotification({ type: 'success', message: 'Group renamed' });
          break;
        case 'invalid-name':
          setNotification({ type: 'error', message: 'Enter a group name.' });
          break;
        case 'not-found':
          await refreshGroups();
          setNotification({ type: 'error', message: "That group doesn't exist anymore." });
          break;
        case 'error':
          setNotification({ type: 'error', message: result.message });
          break;
      }
    });

  const handleDeleteGroup = (group: TabGroup) =>
    runExclusive({ type: 'deleting-group', groupId: group.id }, async () => {
      const result = await deleteGroup(group.id);
      switch (result.status) {
        case 'deleted':
          await refreshAll();
          setNotification({ type: 'success', message: `Group "${group.name}" deleted — its tabs were kept` });
          break;
        case 'cannot-delete-default':
          setNotification({ type: 'info', message: "The default group can't be deleted." });
          break;
        case 'error':
          setNotification({ type: 'error', message: result.message });
          break;
      }
    });

  const handleOpenGroupTabs = (group: TabGroup) =>
    runExclusive({ type: 'opening-group', groupId: group.id }, async () => {
      const result = await openGroupTabs(group.id);
      switch (result.status) {
        case 'opened': {
          await refreshTabs();
          const message =
            result.failedCount > 0
              ? `${result.openedCount} ${pluralTabs(result.openedCount)} opened — ${result.failedCount} couldn't open`
              : `${result.openedCount} ${pluralTabs(result.openedCount)} opened`;
          setNotification({ type: result.failedCount > 0 ? 'error' : 'success', message });
          break;
        }
        case 'nothing-to-open':
          setNotification({ type: 'info', message: 'No tabs in this group.' });
          break;
        case 'error':
          setNotification({ type: 'error', message: result.message });
          break;
      }
    });

  return {
    savedTabs,
    groups,
    isLoaded,
    busy,
    isBusy,
    notification,
    handleSaveCurrentTab,
    handleSaveAllTabs,
    handleOpenTab,
    handleDeleteTab,
    handleOpenAllTabs,
    handleCreateGroup,
    handleRenameGroup,
    handleDeleteGroup,
    handleOpenGroupTabs,
  };
}
