# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # dev server at http://localhost:5173
npm run build     # tsc --noEmit + vite build (outputs to dist/)
npm run preview   # preview production build locally
npm run lint      # ESLint (flat config, eslint.config.mjs)
npm run format    # Prettier over src/**/*.{ts,tsx}
```

There is no test suite. The Node version is pinned to 22 via `.nvmrc`.

## Architecture

This is a **100% client-side** React app — no server, no API, no database. All state lives in the browser via
`useContabilita` and is persisted through the `Archivio` abstraction.

### Storage layer (`src/storage.ts`)

On startup, `rilevaModalita()` detects which storage backend is available and sets the module-level `modalitaRilevata`
singleton:

- **`condiviso`** — `window.storage` API injected by the Claude artifact sandbox; shared across users, polled every 25 s
- **`locale`** — `localStorage` with the key prefix `fse-contabilita.`
- **`memoria`** — in-memory only, no persistence

All reads/writes go through `Archivio.leggi/scrivi/elimina/elenco`. Storage keys are `config`, `movimenti`, and `soci`.
There is a legacy migration path in `ricarica()` that reads old per-item keys (`mov.*`, `socio.*`) and consolidates them
into the flat arrays.

### State management (`src/hooks/useContabilita.ts`)

Single hook, `useContabilita()`, returns `[AppState, Azioni]`. Internally it uses `useReducer` with a small set of
action types. The pattern for mutations (`aggiornaLista`) is:

1. Read the current list fresh from storage (to handle concurrent writes in shared mode)
2. Apply the transformation
3. Write back with retry
4. Dispatch the local action to update React state

Config is stored as a single `config` key; movimenti and soci are stored as flat arrays under their respective keys.

### Component tree

`App.tsx` owns tab state (`scheda`) and print mode (`stampa`). It passes slices of `AppState` and `Azioni` down to the
four tab sections:

- **Prima nota** (`scheda === 'movimenti'`): `FormMovimento` + `SaldiIniziali` on the left, `RegistroMovimenti` on the
  right. Saldi (cassa/banca) are computed live from `saldiIniziali` + movement deltas in `App.tsx`.
- **Soci e quote** (`scheda === 'soci'`): `GestioneSoci` handles member CRUD and quota tracking. Recording a quota
  payment calls `azioni.aggiungiMovimento` directly, creating a linked entry in prima nota.
- **Categorie** (`scheda === 'categorie'`): `GestioneCategorie` / `ColonnaCategorie` edit `config.categorie.entrata` and
  `config.categorie.uscita` and call `azioni.salvaConfig`.
- **Rendiconto e stampa** (`scheda === 'rendiconto'`): `SchedaRendiconto` delegates to `calcolaRendiconto` (
  `src/components/rendiconto/calcolo.ts`) which builds `DatiRendiconto`; `ProspettoRendiconto` renders it. Print is
  triggered by setting `stampa` state, which causes `App.tsx` to render `StampaRendiconto` or `StampaRegistro` in a
  hidden `div.vista-stampa`, then calls `window.print()` after a 150 ms tick.

### Print flow

Print components (`StampaRendiconto`, `StampaRegistro`) are always mounted in the DOM but hidden via CSS (
`display:none`). On print they become the only visible content via `@media print` rules inlined in `App.tsx`. No
separate route or window is used.

### Key types (`src/types.ts`)

- `Movimento` — a single ledger entry; `metodo` is `'Cassa' | 'Bonifico' | 'Altro'` (determines cassa vs banca balance)
- `Config` — `intestazione` + `saldiIniziali` + `categorie` + `quotaAnnuale`
- `AppState extends Config` — everything above plus `movimenti[]`, `soci[]`, and UI status fields
- `Azioni` — the public mutation API returned by `useContabilita`

### Shared utilities

- `src/utils.ts` — `eur()`, `dataIT()`, `parseImporto()`, `genId()`, `stileCampo`/`stileLabel` (shared Tailwind class
  strings)
- `src/mocks/index.ts` — default categories (`CATEGORIE_BASE`), payment methods (`METODI`), scout units (`UNITA`), and
  `CONFIG_DEFAULT`

### Styling

Tailwind CSS 3 with no custom theme extensions beyond the defaults. Brand color is `#1b2a4a` (navy). Background is
`#f5f3ee` (warm off-white). Shared input/label class strings are exported from `src/utils.ts` as `stileCampo` and
`stileLabel`.
