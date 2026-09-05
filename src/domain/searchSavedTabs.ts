import type { SavedTab } from '../types';

/** Trims, collapses internal whitespace, and lowercases a raw query string. */
export function normalizeSearchQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ').toLowerCase();
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

/**
 * The text a saved tab is matched against. Kept as its own step so future
 * fields (tags, notes, a favorite flag, etc.) can be folded in here without
 * touching the matching logic in `searchSavedTabs` itself.
 */
function getSearchableText(tab: SavedTab): string {
  return `${tab.title} ${tab.url} ${getHostname(tab.url)}`.toLowerCase();
}

/**
 * Returns the subset of `tabs` whose title, URL, or hostname contain every
 * word in `query` (case-insensitive; extra/leading/trailing whitespace in
 * the query is ignored). An empty or whitespace-only query matches
 * everything, returning `tabs` unchanged (never mutated, never copied
 * needlessly). No ranking or fuzzy matching — plain substring containment,
 * intentionally simple so it's cheap to run on every keystroke.
 */
export function searchSavedTabs(tabs: SavedTab[], query: string): SavedTab[] {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) {
    return tabs;
  }

  const terms = normalized.split(' ');
  return tabs.filter((tab) => {
    const searchableText = getSearchableText(tab);
    return terms.every((term) => searchableText.includes(term));
  });
}
