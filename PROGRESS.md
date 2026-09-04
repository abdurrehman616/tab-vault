# TabVault — Progress

## Day 1: Core tab management — COMPLETE

All Day 1 phases (1.1–1.10) are implemented, QA-reviewed, and passing build/typecheck/lint.

### Phases delivered

| Phase | Scope |
|---|---|
| 1.1 | Project foundation — MV3 manifest, Vite + React + TypeScript + Tailwind, folder structure, core domain types |
| 1.2 | Popup UI shell (header, primary action, empty state, footer) |
| 1.3 | Chrome Tabs API service (`getCurrentTab`, `getCurrentWindowTabs`) |
| 1.4 | `chrome.storage.local` storage service for saved tabs |
| 1.5 | Save Current Tab (save-then-close, duplicate detection, error handling) |
| 1.6 | Save All Tabs (atomic batch write, per-tab close, partial-failure reporting) |
| 1.7 | Restore: Open one tab / Open All (open-then-remove-from-storage ordering) |
| 1.8 | Delete a saved tab (stable-id based, storage-only) |
| 1.9 | Basic tab groups (create/rename/delete, default "Saved Tabs" group, backward-compatible with pre-groups data) |
| 1.10 | QA pass — found and fixed real data-integrity/race bugs (see below) |

### Bugs found and fixed during QA (Phase 1.10)

- Bulk restore batched storage cleanup until after the whole loop finished, so an interruption mid-loop left already-opened tabs still marked "saved". Fixed: each tab is removed from storage immediately after it opens.
- `chrome.tabs.create` defaulted to `active: true`, which can shift focus away from the popup and cause Chrome to close it mid-operation. Fixed: tabs are now opened in the background (`active: false`).
- Group rename could double-submit (Enter and the resulting blur both committed) and Escape-to-cancel could still commit. Fixed: rename now commits from a single code path.
- Popup briefly showed "No saved tabs yet" on every open, before the initial storage read resolved. Fixed with an `isLoaded` gate.
- The busy/lock guard was pure React state, which is asynchronous; added a synchronous ref-based guard alongside it to fully close the rapid-click race window.
- Removed a batch-removal storage function that became dead code once the above fix landed.

## Known remaining risks (not fixed — accepted for Day 1)

- **Multi-window concurrent popup synchronization.** Each popup instance's busy-lock only serializes actions *within that instance*. If a user has TabVault open in two Chrome windows at once and acts in both, their independent read-modify-write sequences against `chrome.storage.local` can still race, since there is no cross-instance transaction or live-sync (`chrome.storage.onChanged`) in place.
- **Pinned tab restoration.** `SavedTab` does not persist the tab's pinned state (an intentional Phase 1.4 scope decision — only what's needed to restore the tab is stored). Reopened tabs are always unpinned regardless of their original state.
- **Malformed storage validation.** Reads only check `Array.isArray` on the stored value, not the shape of individual records. Directly-tampered `chrome.storage.local` contents (e.g. via devtools) are not defended against; not reachable through normal UI use.
- **Very large favicon/storage quota considerations.** `chrome.storage.local`'s default quota (~10MB) is far beyond normal usage, but a very large vault (many hundreds/thousands of tabs) with large data-URI favicons could theoretically approach it. No quota monitoring or `unlimitedStorage` permission has been added.

## Explicitly out of scope for Day 1

search, drag and drop, undo, backups, session history, native Chrome tab groups integration, import/export, duplicate-management improvements beyond exact-URL dedup, snooze, cloud sync, AI.

## Current feature list

- Save the current tab / save all tabs in the window (dedup against previously saved URLs; tab is closed only after data is durably persisted)
- Open one saved tab / open all saved tabs / open all tabs in a group (tabs open in the background; storage record removed only after the tab is confirmed open)
- Delete a saved tab
- Create, rename, and delete groups; a default "Saved Tabs" group always exists and can't be deleted; deleting a group reassigns its tabs rather than losing them
- Persistent storage via `chrome.storage.local`, backward-compatible with tab data saved before groups existed
- Toast feedback (success/error/info) for every action
