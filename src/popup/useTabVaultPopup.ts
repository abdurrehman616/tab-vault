import { useEffect, useRef, useState } from 'react';
import {
  computeReorderedSavedTabs,
  computeToggledFavorite,
  createGroup,
  deleteGroup,
  deleteSavedTab,
  isSameSavedTabsOrder,
  listGroups,
  listSavedTabs,
  openAllSavedTabs,
  openGroupTabs,
  openSavedTab,
  persistSavedTabs,
  renameGroup,
  saveAllTabs,
  saveAllWindowsTabs,
  saveCurrentTab,
} from '../domain';
import { normalizeSavedTabs, STORAGE_KEYS } from '../services/storage';
import type { SavedTab, TabGroup } from '../types';

type Notification = { type: 'success' | 'error' | 'info'; message: string };

type BusyState =
  | { type: 'idle' }
  | { type: 'saving-current' }
  | { type: 'saving-all' }
  | { type: 'saving-all-windows' }
  | { type: 'opening'; tabId: string }
  | { type: 'opening-all' }
  | { type: 'deleting'; tabId: string }
  | { type: 'creating-group' }
  | { type: 'renaming-group'; groupId: string }
  | { type: 'deleting-group'; groupId: string }
  | { type: 'opening-group'; groupId: string }
  | { type: 'reordering' }
  | { type: 'toggling-favorite' };

const NOTIFICATION_DURATION_MS: Record<Notification['type'], number> = {
  success: 2000,
  error: 4000,
  info: 3000,
};

function pluralTabs(count: number): string {
  return count === 1 ? 'tab' : 'tabs';
}

function pluralGroups(count: number): string {
  return count === 1 ? 'group' : 'groups';
}

/**
 * Builds the notification for any "opened N tabs" outcome, folding in
 * Chrome Tab Group recreation results (see `openTabsInOrder`/
 * `recreateChromeGroups`) alongside the existing open/fail counts.
 */
function buildOpenNotification(result: {
  openedCount: number;
  failedCount: number;
  groupsRecreatedCount: number;
  groupsFailedCount: number;
}): Notification {
  const parts = [
    result.failedCount > 0
      ? `${result.openedCount} ${pluralTabs(result.openedCount)} opened — ${result.failedCount} couldn't open`
      : `${result.openedCount} ${pluralTabs(result.openedCount)} opened`,
  ];
  if (result.groupsRecreatedCount > 0) {
    parts.push(`${result.groupsRecreatedCount} ${pluralGroups(result.groupsRecreatedCount)} restored`);
  }
  if (result.groupsFailedCount > 0) {
    parts.push(`${result.groupsFailedCount} ${pluralGroups(result.groupsFailedCount)} couldn't be restored`);
  }

  return {
    type: result.failedCount > 0 || result.groupsFailedCount > 0 ? 'error' : 'success',
    message: parts.join(' · '),
  };
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

  // Keeps this popup instance in sync with any *other* TabVault context
  // (another popup window, if Chrome allows more than one open at once)
  // that changes storage. `chrome.storage.onChanged` fires for every write
  // to `chrome.storage.local`, including this instance's own — mirroring
  // its `newValue` directly is the simplest reliable way to stay in sync
  // without a second read round-trip. This is deliberately simple (no
  // merge logic here): correctness against concurrent writes is already
  // guaranteed at the storage layer (see `updateSavedTabs`), so this effect
  // only has to solve "stale UI", not data safety.
  //
  // A rare cosmetic side effect: if this popup has an optimistic update
  // in flight (reorder/favorite-toggle) when another context's unrelated
  // write arrives, that write's `newValue` will briefly replace the
  // optimistic view until this instance's own write resolves and
  // reconciles again a moment later. No data is at risk either way.
  useEffect(() => {
    function handleStorageChanged(changes: Record<string, chrome.storage.StorageChange>, areaName: string) {
      if (areaName !== 'local') return;
      if (STORAGE_KEYS.tabs in changes) {
        setSavedTabs(normalizeSavedTabs(changes[STORAGE_KEYS.tabs].newValue));
      }
      if (STORAGE_KEYS.groups in changes) {
        const groups = changes[STORAGE_KEYS.groups].newValue;
        setGroups(Array.isArray(groups) ? (groups as TabGroup[]) : []);
      }
    }
    chrome.storage.onChanged.addListener(handleStorageChanged);
    return () => chrome.storage.onChanged.removeListener(handleStorageChanged);
  }, []);

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

  // Reordering is optimistic, unlike every other action here: the new order
  // is applied to `savedTabs` immediately (no storage read needed first —
  // see requirement to avoid unnecessary reloads), then persisted in the
  // background. If persistence fails, the pre-move snapshot is restored
  // exactly, so the UI can never end up showing an order that isn't what's
  // actually in storage, and no tab or group membership is ever lost.
  const handleMoveSavedTab = async (tabId: string, targetGroupId: string, targetIndexInGroup: number) => {
    if (busyRef.current) return;

    const previousTabs = savedTabs;
    const nextTabs = computeReorderedSavedTabs(previousTabs, tabId, targetGroupId, targetIndexInGroup);
    if (isSameSavedTabsOrder(nextTabs, previousTabs)) return;

    busyRef.current = true;
    setBusy({ type: 'reordering' });
    setSavedTabs(nextTabs);

    // The optimistic `nextTabs` above is only for instant visual feedback.
    // What's actually persisted is computed by re-running the same reorder
    // against storage's current state at write time (see `persistSavedTabs`),
    // so a concurrent change from another popup (e.g. it deleted this exact
    // tab) can't be silently undone by writing back this stale snapshot.
    const result = await persistSavedTabs((current) =>
      computeReorderedSavedTabs(current, tabId, targetGroupId, targetIndexInGroup),
    );
    if (result.status === 'error') {
      setSavedTabs(previousTabs);
      setNotification({ type: 'error', message: result.message });
    } else {
      setSavedTabs(result.tabs);
    }

    busyRef.current = false;
    setBusy({ type: 'idle' });
  };

  // Same optimistic-then-persist-then-rollback-on-failure shape as
  // handleMoveSavedTab, for the same reason: this is a quick, fully
  // reversible, storage-only change with no Chrome tab involved, so instant
  // visual feedback matters more than waiting for a round-trip confirm.
  const handleToggleFavorite = async (tab: SavedTab) => {
    if (busyRef.current) return;

    const previousTabs = savedTabs;
    const nextTabs = computeToggledFavorite(previousTabs, tab.id);
    if (nextTabs === previousTabs) return;

    busyRef.current = true;
    setBusy({ type: 'toggling-favorite' });
    setSavedTabs(nextTabs);

    const result = await persistSavedTabs((current) => computeToggledFavorite(current, tab.id));
    if (result.status === 'error') {
      setSavedTabs(previousTabs);
      setNotification({ type: 'error', message: result.message });
    } else {
      setSavedTabs(result.tabs);
    }

    busyRef.current = false;
    setBusy({ type: 'idle' });
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

  const handleSaveAllWindowsTabs = () =>
    runExclusive({ type: 'saving-all-windows' }, async () => {
      const result = await saveAllWindowsTabs();
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
        case 'opened':
          await refreshTabs();
          setNotification(buildOpenNotification(result));
          break;
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
        case 'opened':
          await refreshTabs();
          setNotification(buildOpenNotification(result));
          break;
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
    handleSaveAllWindowsTabs,
    handleOpenTab,
    handleDeleteTab,
    handleOpenAllTabs,
    handleCreateGroup,
    handleRenameGroup,
    handleDeleteGroup,
    handleOpenGroupTabs,
    handleMoveSavedTab,
    handleToggleFavorite,
  };
}
