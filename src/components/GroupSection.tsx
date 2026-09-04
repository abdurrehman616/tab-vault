import { useState } from 'react';
import type { SavedTab, TabGroup } from '../types';
import { IconButton } from './IconButton';
import { SavedTabRow } from './SavedTabRow';
import { SmallButton } from './SmallButton';
import { TrashIcon } from './icons';

type GroupSectionProps = {
  group: TabGroup;
  tabs: SavedTab[];
  isDefault: boolean;
  disabled: boolean;
  isOpeningAll: boolean;
  isDeletingGroup: boolean;
  openingTabId: string | null;
  deletingTabId: string | null;
  onRename: (name: string) => void;
  onDelete: () => void;
  onOpenAll: () => void;
  onOpenTab: (tab: SavedTab) => void;
  onDeleteTab: (tab: SavedTab) => void;
};

export function GroupSection({
  group,
  tabs,
  isDefault,
  disabled,
  isOpeningAll,
  isDeletingGroup,
  openingTabId,
  deletingTabId,
  onRename,
  onDelete,
  onOpenAll,
  onOpenTab,
  onDeleteTab,
}: GroupSectionProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState(group.name);

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

      {tabs.length === 0 ? (
        <p className="px-1 text-xs text-slate-300">No tabs in this group.</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {tabs.map((tab) => (
            <SavedTabRow
              key={tab.id}
              tab={tab}
              onOpen={() => onOpenTab(tab)}
              onDelete={() => onDeleteTab(tab)}
              disabled={disabled}
              isOpening={openingTabId === tab.id}
              isDeleting={deletingTabId === tab.id}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
