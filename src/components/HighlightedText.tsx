import { Fragment } from 'react';

type HighlightedTextProps = {
  text: string;
  terms: string[];
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Renders `text` with any of `terms` wrapped in <mark>, case-insensitively.
 * Presentation only — it reuses the exact (already-normalized) terms
 * `searchSavedTabs` matched against, so what's highlighted always matches
 * why the row is shown. It doesn't reimplement or alter the search
 * algorithm itself.
 */
export function HighlightedText({ text, terms }: HighlightedTextProps) {
  if (terms.length === 0) {
    return <>{text}</>;
  }

  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');
  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, index) =>
        // One capturing group in a global regex makes String.split alternate
        // non-match, match, non-match, match, ... starting at index 0.
        index % 2 === 1 ? (
          <mark key={index} className="rounded-sm bg-amber-200 text-inherit">
            {part}
          </mark>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}
