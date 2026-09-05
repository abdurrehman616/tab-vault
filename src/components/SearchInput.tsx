import { forwardRef, useImperativeHandle, useRef } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { SearchIcon } from './icons';

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { value, onChange, disabled = false },
  ref,
) {
  // An internal ref, exposed via useImperativeHandle, so the clear button
  // can restore focus regardless of what kind of ref (object or callback)
  // the parent passed in for the keyboard-shortcut handler.
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape' && value) {
      // Clear the query instead of letting Escape do nothing/close the
      // popup; stop propagation so it doesn't also trigger anything else
      // listening for Escape (e.g. a group rename in progress elsewhere).
      event.stopPropagation();
      onChange('');
    }
  };

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <label className="relative flex items-center">
      <span className="sr-only">Search saved tabs</span>
      <SearchIcon className="pointer-events-none absolute left-2 size-4 text-slate-400" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Search saved tabs..."
        className="w-full rounded-md border border-slate-200 py-1.5 pr-7 pl-8 text-sm transition-colors [&::-webkit-search-cancel-button]:appearance-none hover:border-slate-300 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-200"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled}
          aria-label="Clear search"
          className="absolute right-1.5 flex size-5 items-center justify-center rounded text-base leading-none text-slate-400 transition-colors hover:enabled:bg-slate-100 hover:enabled:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ×
        </button>
      )}
    </label>
  );
});
