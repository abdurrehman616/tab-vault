import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  EmptyState,
  GroupSection,
  IconButton,
  InboxIcon,
  SearchIcon,
  SearchInput,
  SettingsIcon,
  SmallButton,
  Toast,
  VaultIcon,
} from '../components';
import { DEFAULT_GROUP_ID, normalizeSearchQuery, searchSavedTabs } from '../domain';
import { useTabVaultPopup } from './useTabVaultPopup';

export default function Popup() {
  const {
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
    handleMoveSavedTab,
  } = useTabVaultPopup();

  const [newGroupName, setNewGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hasAnyContent = savedTabs.length > 0 || groups.length > 1;

  // Pressing "/" focuses search, unless the user is already typing
  // somewhere else (another input, the group-name field, an in-progress
  // group rename) — a common, low-risk convention (GitHub, Slack, etc.)
  // that doesn't interfere with typing "/" as part of a URL or a name.
  useEffect(() => {
    function handleGlobalKeyDown(event: KeyboardEvent) {
      if (event.key !== '/') return;
      const target = event.target as HTMLElement | null;
      const isTypingElsewhere =
        target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;
      if (isTypingElsewhere || !searchInputRef.current) return;
      event.preventDefault();
      searchInputRef.current.focus();
    }
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const isSearching = normalizeSearchQuery(searchQuery).length > 0;
  const filteredSavedTabs = useMemo(() => searchSavedTabs(savedTabs, searchQuery), [savedTabs, searchQuery]);
  // Reuses the same normalized terms searchSavedTabs matched against, so
  // what's highlighted in each row always matches why it's shown.
  const searchTerms = isSearching ? normalizeSearchQuery(searchQuery).split(' ') : [];
  const groupsToShow = isSearching
    ? groups.filter((group) => filteredSavedTabs.some((tab) => tab.groupId === group.id))
    : groups;

  const submitNewGroup = () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) return;
    handleCreateGroup(trimmed);
    setNewGroupName('');
  };

  return (
    <div className="flex max-h-[600px] w-80 flex-col overflow-hidden bg-white text-slate-900">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <VaultIcon className="size-5 text-slate-900" />
          <span className="text-sm font-semibold tracking-tight">TabVault</span>
        </div>
        <IconButton label="Settings" disabled>
          <SettingsIcon className="size-4" />
        </IconButton>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {notification && <Toast message={notification.message} variant={notification.type} />}

        <Button onClick={handleSaveCurrentTab} disabled={isBusy}>
          {busy.type === 'saving-current' ? 'Saving…' : 'Save Current Tab'}
        </Button>
        <Button variant="secondary" onClick={handleSaveAllTabs} disabled={isBusy}>
          {busy.type === 'saving-all' ? 'Saving…' : 'Save All Tabs'}
        </Button>

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-3">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submitNewGroup();
            }}
            className="flex gap-1.5"
          >
            <input
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.target.value)}
              placeholder="New group name"
              disabled={isBusy}
              className="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <SmallButton type="submit" disabled={isBusy || !newGroupName.trim()}>
              {busy.type === 'creating-group' ? 'Adding…' : 'Add group'}
            </SmallButton>
          </form>

          {!isLoaded ? null : !hasAnyContent ? (
            <EmptyState
              icon={<InboxIcon className="size-6" />}
              title="No saved tabs yet"
              description="Tabs you save will show up here, organized and ready to restore."
            />
          ) : (
            <>
              <SearchInput ref={searchInputRef} value={searchQuery} onChange={setSearchQuery} />

              {isSearching && (
                <p className="px-1 text-xs text-slate-400">
                  {filteredSavedTabs.length} matching tab{filteredSavedTabs.length === 1 ? '' : 's'}
                </p>
              )}

              {isSearching && filteredSavedTabs.length === 0 ? (
                <EmptyState
                  icon={<SearchIcon className="size-6" />}
                  title="No matching tabs"
                  description="Try a different title, URL, or domain."
                />
              ) : (
                <>
                  <Button variant="secondary" onClick={handleOpenAllTabs} disabled={isBusy}>
                    {busy.type === 'opening-all' ? 'Opening…' : 'Open All'}
                  </Button>
                  {isSearching && (
                    // Reordering/moving is disabled while a search filter is
                    // active: some of a group's tabs are hidden from view, so
                    // there's no unambiguous way to map a position in the
                    // visible subset back onto the true, full order without
                    // risking silently scrambling it.
                    <p className="px-1 text-xs text-slate-400">Clear the search to reorder or move tabs.</p>
                  )}
                  <div className="flex flex-col gap-3">
                    {groupsToShow.map((group) => (
                      <GroupSection
                        key={group.id}
                        group={group}
                        tabs={filteredSavedTabs.filter((tab) => tab.groupId === group.id)}
                        allGroups={groups}
                        isDefault={group.id === DEFAULT_GROUP_ID}
                        disabled={isBusy}
                        reorderingDisabled={isSearching}
                        isOpeningAll={busy.type === 'opening-group' && busy.groupId === group.id}
                        isDeletingGroup={busy.type === 'deleting-group' && busy.groupId === group.id}
                        openingTabId={busy.type === 'opening' ? busy.tabId : null}
                        deletingTabId={busy.type === 'deleting' ? busy.tabId : null}
                        onRename={(name) => handleRenameGroup(group, name)}
                        onDelete={() => handleDeleteGroup(group)}
                        onOpenAll={() => handleOpenGroupTabs(group)}
                        onOpenTab={handleOpenTab}
                        onDeleteTab={handleDeleteTab}
                        onMoveTab={handleMoveSavedTab}
                        searchTerms={searchTerms}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>

      <footer className="shrink-0 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-400">
        {savedTabs.length} tab{savedTabs.length === 1 ? '' : 's'} saved
      </footer>
    </div>
  );
}
