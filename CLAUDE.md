# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

BoulderBody is a client-only React + TypeScript + Vite app for tracking bouldering sessions. All state lives in `localStorage`; it deploys to GitHub Pages at `/Boulder-Body/`.

All source lives under `boulderbody-web/`. Run commands from there:

```bash
npm install
npm run dev          # vite dev server
npm run build        # tsc -b && vite build && cp dist/index.html dist/404.html
npm run preview
npm run lint         # eslint .
```

The `cp dist/index.html dist/404.html` in `build` is the GitHub Pages SPA fallback — without it, deep links (e.g. `/summary/:id`) 404 on refresh.

## Two session types (discriminated union)

`Session` in `models/Session.ts` is `VolumeSession | TrainingSession`, discriminated by `sessionType`. Always narrow with `isVolumeSession` / `isTrainingSession` before touching type-specific fields.

- **Volume session** — target level + boulder count, each attempt is `flash | done | fail` (unlogged counts as fail for fail-rate math). Views: `StartView` → `ActiveSessionView` → `SummaryView`.
- **Training session** — hang + pull-up use a **ramped max-test** (see `TrainingRecommender.ts` and `logic/weights.ts`): today starts at `lastWorking − 10 kg`, steps `+5 kg` until it reaches last working, then `+2.5 kg` per step. When the user taps "No more", working weight = `failed − 5 kg` (floored to 2.5 kg plate, ≥ 0) for 3 working sets × 3 reps. Bench and trap-bar are fixed-weight (5 × 3) with linear `+2.5 kg` progression on a fully completed session. Protocol constants in `models/SessionType.ts` (`TRAINING_PROTOCOL`).

Recommenders are split per type: `SessionRecommender.getRecommendation()` (fail-rate + time decay for volume) and `TrainingRecommender.getTrainingRecommendation()`. Likewise storage: `getLastVolumeSession()` / `getLastTrainingSession()` — `getLastFinishedSession()` is deprecated.

## Gamification is derived, not stored

XP, level, and streak are **recomputed from the session array on every render** by `logic/XPCalculator.ts` — never persisted, so there's no drift to reconcile. Only earned badges persist, under a separate `localStorage` key. Badge rules live in `logic/BadgeEngine.ts`, the catalog in `models/Gamification.ts`.

## Storage

`logic/StorageManager.ts` owns all `localStorage` I/O. Three keys:
- `boulderbody_sessions` — versioned schema `{ version, sessions[] }`, currently **v4**
- `boulderbody_theme` — `'light' | 'dark'`
- `boulderbody_badges` — earned badges

Schema migrations run on load (`migrateV1toV2` … `migrateV3toV4`) and write back immediately. v3→v4 **drops legacy training sessions** because the old fixed-weight/ramp-up shape can't be reshaped into the 9c max-test/working structure without fabricating data. When the session shape changes, bump `CURRENT_VERSION` and add a migration — don't silently mutate on read.

Dates are ISO strings on disk; `deserializeSession` rehydrates them (including nested `TrainingSet.timestamp`). Keep date handling at this boundary — don't leak ISO strings into components.

Only one unfinished session should exist at a time (`getCurrentSession()`). Session and set IDs use `crypto.randomUUID()`.

## Routing & deploy

`App.tsx` wires `BrowserRouter basename="/Boulder-Body"`, matching `base: '/Boulder-Body/'` in `vite.config.ts`. Routes: `/`, `/session/:id` (volume), `/training/:id`, `/summary/:id`. `.github/workflows/deploy.yml` builds on push to `main` and publishes `boulderbody-web/dist` to Pages.

## UI layout

- `components/` — feature components (modals, history row, theme toggle, max-test prompt)
- `components/ui/` — presentational atoms (XPCard, PaperCard, HoldTile, RingTimer, RampBar, BadgeStrip, Counter, StampLabel, …). Prefer composing these over inline Tailwind when adding new views.

Tailwind dark theme is toggled on `<html>` via `initializeTheme()` in `App.tsx`; use existing semantic classes rather than hardcoding `bg-gray-900`.

## When writing code here

- Narrow `Session` with the type guards before accessing volume- or training-specific fields — TypeScript won't let you access `targetLevel` on a `TrainingSession`, and that's intentional.
- Don't persist anything derivable (XP, level, streak, fail-rate) — recompute.
- Treat `logic/weights.ts` as the single source of truth for plate math (`roundTo2_5`, `workingWeightFromFailed`, `generateWorkingSets`). Don't inline the 2.5 / 5 / 10 constants elsewhere.
- Unlogged volume attempts count as fails — this is deliberate (stricter), not a bug to "fix".
- `planing_file.md` is the original 8-phase plan; it's historical context, not a live roadmap. The current mockup redesign branch is the active direction.
