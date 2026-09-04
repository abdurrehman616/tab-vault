import type { BrowserTab } from '../../types';
import { ChromeApiError } from './errors';

/**
 * URL schemes Chrome does not allow extensions to read, script, or reopen
 * reliably (internal pages, other extensions' pages, the New Tab page, etc.).
 */
const UNSAVABLE_URL_SCHEMES = [
  'chrome:',
  'chrome-extension:',
  'chrome-search:',
  'chrome-untrusted:',
  'devtools:',
  'edge:',
  'about:',
];

function isSavableUrl(url: string): boolean {
  try {
    const scheme = new URL(url).protocol;
    return !UNSAVABLE_URL_SCHEMES.includes(scheme);
  } catch {
    return false;
  }
}

/**
 * Converts a raw `chrome.tabs.Tab` into a normalized, read-only `BrowserTab`.
 * Returns `null` when the tab is missing required data or is not one
 * TabVault can save/restore (e.g. internal Chrome pages).
 *
 * The source tab object is never modified.
 */
function toBrowserTab(tab: chrome.tabs.Tab): BrowserTab | null {
  if (tab.id === undefined || !tab.url || !isSavableUrl(tab.url)) {
    return null;
  }

  return {
    id: tab.id,
    windowId: tab.windowId,
    index: tab.index,
    url: tab.url,
    title: tab.title ?? tab.url,
    faviconUrl: tab.favIconUrl,
    active: tab.active,
    pinned: tab.pinned,
  };
}

/**
 * Returns the active tab in the current window, or `null` if there isn't one
 * (e.g. it's an internal page that cannot be saved).
 */
export async function getCurrentTab(): Promise<BrowserTab | null> {
  let tabs: chrome.tabs.Tab[];
  try {
    tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch (error) {
    throw new ChromeApiError('getCurrentTab', error);
  }

  const [activeTab] = tabs;
  return activeTab ? toBrowserTab(activeTab) : null;
}

/**
 * Returns all savable tabs in the current window, in their on-screen order.
 */
export async function getCurrentWindowTabs(): Promise<BrowserTab[]> {
  let tabs: chrome.tabs.Tab[];
  try {
    tabs = await chrome.tabs.query({ currentWindow: true });
  } catch (error) {
    throw new ChromeApiError('getCurrentWindowTabs', error);
  }

  return tabs
    .map(toBrowserTab)
    .filter((tab): tab is BrowserTab => tab !== null);
}

/** Closes the given Chrome tab. */
export async function closeTab(tabId: number): Promise<void> {
  try {
    await chrome.tabs.remove(tabId);
  } catch (error) {
    throw new ChromeApiError('closeTab', error);
  }
}

/**
 * Opens the given URL in a new, background (inactive) Chrome tab.
 *
 * Deliberately not `active`: activating a newly created tab shifts window
 * focus away from the extension popup, which Chrome then closes immediately
 * — killing whatever code was still running in it. Opening in the background
 * keeps the popup alive so callers can finish their own bookkeeping (e.g.
 * removing the tab from storage) after this resolves.
 */
export async function openTab(url: string): Promise<void> {
  try {
    await chrome.tabs.create({ url, active: false });
  } catch (error) {
    throw new ChromeApiError('openTab', error);
  }
}
