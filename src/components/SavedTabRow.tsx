import type { SavedTab } from '../types';
import { IconButton } from './IconButton';
import { SmallButton } from './SmallButton';
import { TrashIcon, VaultIcon } from './icons';

type SavedTabRowProps = {
  tab: SavedTab;
  onOpen: () => void;
  onDelete: () => void;
  disabled: boolean;
  isOpening: boolean;
  isDeleting: boolean;
};

export function SavedTabRow({ tab, onOpen, onDelete, disabled, isOpening, isDeleting }: SavedTabRowProps) {
  return (
    <li className="flex items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-slate-50">
      {tab.faviconUrl ? (
        <img src={tab.faviconUrl} alt="" className="size-4 shrink-0 rounded-sm" />
      ) : (
        <VaultIcon className="size-4 shrink-0 text-slate-300" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-slate-800">{tab.title}</p>
        <p className="truncate text-xs text-slate-400">{tab.url}</p>
      </div>
      <SmallButton onClick={onOpen} disabled={disabled}>
        {isOpening ? 'Opening…' : 'Open'}
      </SmallButton>
      <IconButton label="Delete" onClick={onDelete} disabled={disabled} className={isDeleting ? 'opacity-50' : ''}>
        <TrashIcon className="size-4" />
      </IconButton>
    </li>
  );
}
