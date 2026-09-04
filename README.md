# TabVault

A OneTab-style Chrome extension for saving, organizing, and restoring browser tabs.

## Stack

Manifest V3 · TypeScript · React · Vite · Tailwind CSS

## Scripts

- `npm run dev` — start Vite in watch mode for local development
- `npm run build` — type-check and build the extension into `dist/`
- `npm run typecheck` — run the TypeScript compiler with no output
- `npm run lint` — run oxlint

## Load the extension in Chrome

1. `npm run build`
2. Go to `chrome://extensions`, enable Developer mode
3. "Load unpacked" → select the `dist/` folder
