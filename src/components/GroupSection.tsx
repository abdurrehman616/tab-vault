import { useState } from 'react';
import type { DragEvent } from 'react';
import { MOVE_TO_END } from '../domain';
import type { SavedTab, TabGroup } from '../types';
import { IconButton } from './IconButton';
import { SavedTabRow } from './SavedTabRow';
import { SmallButton } from './SmallButton';
import { TrashIcon } from './icons';

type GroupSectionProps = {
  group: TabGroup;
  tabs: SavedTab[];
  allGroups: TabGroup[];
  isDefault: boolean;
  disabled: boolean;
  reorderingDisabled: boolean;
  isOpeningAll: boolean;
  isDeletingGroup: boolean;
  openingTabId: string | null;
  deletingTabId: string | null;
  onRename: (name: string) => void;
  onDelete: () => void;
  onOpenAll: () => void;
  onOpenTab: (tab: SavedTab) => void;
  onDeleteTab: (tab: SavedTab) => void;
  onToggleFavorite: (tab: SavedTab) => void;
  onMoveTab: (tabId: string, targetGroupId: string, targetIndexInGroup: number) => void;
  searchTerms: string[];
};

export function GroupSection({
  group,
  tabs,
  allGroups,
  isDefault,
  disabled,
  reorderingDisabled,
  isOpeningAll,
  isDeletingGroup,
  openingTabId,
  deletingTabId,
  onRename,
  onDelete,
  onOpenAll,
  onOpenTab,
  onDeleteTab,
  onToggleFavorite,
  onMoveTab,
  searchTerms,
}: GroupSectionProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState(group.name);
  const [isContainerDragOver, setIsContainerDragOver] = useState(false);
  const dragDisabled = disabled || reorderingDisabled;

  const startEditing = () => {
    setDraftName(group.name);
    setIsEditingName(true);
  };

  // Commits only ever runs from onBlur. Removing a focused input from the
  // DOM (which closing edit mode does) fires a native blur on it, so if
  // Enter also called this directly, blur would fire again right after and
  // commit a second time. Enter instead just blurs the input, letting this
  // single handler run exactly once per edit.
  const commitRename = () => {
    setIsEditingName(false);
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== group.name) {
      onRename(trimmed);
    }
  };

  // Resets the draft back to the current name before closing, so the blur
  // that closing induces (see commitRename) sees no change and no-ops.
  const cancelEditing = () => {
    setDraftName(group.name);
    setIsEditingName(false);
  };

  // A drop that lands on empty space (an empty group, or below the last
  // row) means "append to the end of this group". Rows call
  // stopPropagation() on their own drop handler, so this only ever fires
  // when the drop didn't land precisely on a row.
  const handleContainerDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsContainerDragOver(false);
    const draggedTabId = event.dataTransfer.getData('text/plain');
    if (!draggedTabId) return;
    onMoveTab(draggedTabId, group.id, MOVE_TO_END);
  };

  const handleContainerDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        {isEditingName ? (
          <input
            autoFocus
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            onBlur={commitRename}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
              if (event.key === 'Escape') cancelEditing();
            }}
            className="min-w-0 flex-1 rounded-md border border-slate-200 px-1.5 py-0.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        ) : (
          <button
            type="button"
            onClick={startEditing}
            disabled={disabled}
            title="Rename group"
            className="min-w-0 truncate rounded px-1 text-xs font-semibold tracking-wide text-slate-500 uppercase hover:enabled:text-slate-900 disabled:cursor-not-allowed"
          >
            {group.name}
          </button>
        )}
        <span className="shrink-0 text-xs text-slate-300">{tabs.length}</span>
        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <SmallButton onClick={onOpenAll} disabled={disabled || tabs.length === 0}>
            {isOpeningAll ? 'Opening…' : 'Open all'}
          </SmallButton>
          {!isDefault && (
            <IconButton
              label={`Delete ${group.name}`}
              onClick={onDelete}
              disabled={disabled}
              className={isDeletingGroup ? 'opacity-50' : ''}
            >
              <TrashIcon className="size-4" />
            </IconButton>
          )}
        </div>
      </div>

      <div
        onDragOver={dragDisabled ? undefined : handleContainerDragOver}
        onDragEnter={dragDisabled ? undefined : () => setIsContainerDragOver(true)}
        onDragLeave={dragDisabled ? undefined : () => setIsContainerDragOver(false)}
        onDrop={dragDisabled ? undefined : handleContainerDrop}
        className={`rounded-md ${isContainerDragOver ? 'bg-slate-50 ring-1 ring-inset ring-slate-300' : ''}`}
      >
        {tabs.length === 0 ? (
          <p className="px-1 py-1 text-xs text-slate-300">
            {dragDisabled ? 'No tabs in this group.' : 'No tabs in this group. Drop a tab here to move it in.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {tabs.map((tab, index) => (
              <SavedTabRow
                key={tab.id}
                tab={tab}
                onOpen={() => onOpenTab(tab)}
                onDelete={() => onDeleteTab(tab)}
                onToggleFavorite={() => onToggleFavorite(tab)}
                disabled={disabled}
                isOpening={openingTabId === tab.id}
                isDeleting={deletingTabId === tab.id}
                searchTerms={searchTerms}
                localIndex={index}
                isFirstInGroup={index === 0}
                isLastInGroup={index === tabs.length - 1}
                allGroups={allGroups}
                reorderingDisabled={reorderingDisabled}
                onMoveTab={onMoveTab}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
