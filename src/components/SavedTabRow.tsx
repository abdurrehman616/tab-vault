import { useState } from 'react';
import type { DragEvent } from 'react';
import { MOVE_TO_END } from '../domain';
import type { SavedTab, TabGroup } from '../types';
import { HighlightedText } from './HighlightedText';
import { IconButton } from './IconButton';
import { SmallButton } from './SmallButton';
import { ChevronDownIcon, ChevronUpIcon, TrashIcon, VaultIcon } from './icons';

type SavedTabRowProps = {
  tab: SavedTab;
  onOpen: () => void;
  onDelete: () => void;
  disabled: boolean;
  isOpening: boolean;
  isDeleting: boolean;
  searchTerms: string[];
  /** This tab's position among its group's other tabs, for the move up/down controls. */
  localIndex: number;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  /** All groups, for the "move to group" control. Only rendered when there's more than one. */
  allGroups: TabGroup[];
  /** True while a search filter is active — see Popup.tsx for why reordering is disabled then. */
  reorderingDisabled: boolean;
  onMoveTab: (tabId: string, targetGroupId: string, targetIndexInGroup: number) => void;
};

export function SavedTabRow({
  tab,
  onOpen,
  onDelete,
  disabled,
  isOpening,
  isDeleting,
  searchTerms,
  localIndex,
  isFirstInGroup,
  isLastInGroup,
  allGroups,
  reorderingDisabled,
  onMoveTab,
}: SavedTabRowProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const dragDisabled = disabled || reorderingDisabled;

  const handleDragStart = (event: DragEvent<HTMLLIElement>) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', tab.id);
  };

  const handleDragOver = (event: DragEvent<HTMLLIElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (event: DragEvent<HTMLLIElement>) => {
    event.preventDefault();
    // Stop this from also reaching the group's container-level drop zone —
    // dropping precisely on a row means "insert before this row", not
    // "append to the end of the group".
    event.stopPropagation();
    setIsDragOver(false);
    const draggedTabId = event.dataTransfer.getData('text/plain');
    if (!draggedTabId || draggedTabId === tab.id) return;
    onMoveTab(draggedTabId, tab.groupId, localIndex);
  };

  return (
    <li
      draggable={!dragDisabled}
      onDragStart={dragDisabled ? undefined : handleDragStart}
      onDragOver={dragDisabled ? undefined : handleDragOver}
      onDragEnter={dragDisabled ? undefined : () => setIsDragOver(true)}
      onDragLeave={dragDisabled ? undefined : () => setIsDragOver(false)}
      onDrop={dragDisabled ? undefined : handleDrop}
      className={`flex flex-col gap-1 rounded-md px-1.5 py-1.5 hover:bg-slate-50 ${
        isDragOver ? 'border-t-2 border-slate-900' : 'border-t-2 border-transparent'
      }`}
    >
      <div className="flex items-center gap-2">
        {tab.faviconUrl ? (
          <img src={tab.faviconUrl} alt="" className="size-4 shrink-0 rounded-sm" />
        ) : (
          <VaultIcon className="size-4 shrink-0 text-slate-300" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-slate-800">
            <HighlightedText text={tab.title} terms={searchTerms} />
          </p>
          <p className="truncate text-xs text-slate-400">
            <HighlightedText text={tab.url} terms={searchTerms} />
          </p>
        </div>
        <SmallButton onClick={onOpen} disabled={disabled}>
          {isOpening ? 'Opening…' : 'Open'}
        </SmallButton>
        <IconButton label="Delete" onClick={onDelete} disabled={disabled} className={isDeleting ? 'opacity-50' : ''}>
          <TrashIcon className="size-4" />
        </IconButton>
      </div>

      <div className="flex items-center gap-1 pl-6">
        <IconButton
          label="Move up"
          onClick={() => onMoveTab(tab.id, tab.groupId, localIndex - 1)}
          disabled={dragDisabled || isFirstInGroup}
        >
          <ChevronUpIcon className="size-3.5" />
        </IconButton>
        <IconButton
          label="Move down"
          onClick={() => onMoveTab(tab.id, tab.groupId, localIndex + 1)}
          disabled={dragDisabled || isLastInGroup}
        >
          <ChevronDownIcon className="size-3.5" />
        </IconButton>
        {allGroups.length > 1 && (
          <select
            aria-label={`Move "${tab.title}" to a different group`}
            value={tab.groupId}
            disabled={dragDisabled}
            onChange={(event) => onMoveTab(tab.id, event.target.value, MOVE_TO_END)}
            className="max-w-24 truncate rounded border border-slate-200 bg-white py-0.5 pl-1 text-xs text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {allGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </li>
  );
}
