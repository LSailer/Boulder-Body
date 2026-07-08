# Routes Mode — Reviewer's Guide

How to judge the new **Routes** session mode: what changed, how to run it, a
click-through script that exercises every behavior, edge cases to poke, and the
acceptance checks from the agreed spec.

## What the feature does

A third session type (alongside **Climbing/Volume** and **Training**) where you
log individual routes — each with its **own difficulty level** — as **Flash /
Send / Fail** at a chosen **gym**. During the session you see live totals; at the
end you get a summary comparing this session against your **last session at the
same gym**, plus a per-level breakdown.

## Run it

```bash
cd boulderbody-web
npm install
npm run dev      # open the printed URL (path is /Boulder-Body/)
# or: npm run build && npm run preview
```

## File map (what changed and where)

**New files**
- `src/models/Gym.ts` — `Gym = { id, name, maxLevel }`.
- `src/models/RouteEntry.ts` — `RouteEntry` + `RouteResult = 'flash'|'send'|'fail'`.
- `src/pages/RouteSessionView.tsx` — the live logging screen.

**Changed files**
- `src/models/SessionType.ts` — adds `'route'` to the `SessionType` union.
- `src/models/Session.ts` — `RouteSession` interface, `isRouteSession()` guard,
  `getRouteCounts()` / `getRoutePercentages()` helpers.
- `src/logic/StorageManager.ts` — gym persistence (`getAllGyms`, `saveGym`, key
  `boulderbody_gyms`), route-session (de)serialization, and
  `getLastRouteSessionForGym(gymId, excludeId)` for same-gym comparison.
- `src/logic/XPCalculator.ts` — `computeRouteXP` (Flash 15 / Send 10 / Fail 2),
  wired into `computeSessionXP`.
- `src/pages/StartView.tsx` — Routes form: gym picker, add-gym, start handler,
  and redirect to `/route/:id` for an active route session.
- `src/pages/SummaryView.tsx` — `RouteSummary` (donut, comparison cards,
  per-level breakdown).
- `src/components/ui/SessionTypeToggle.tsx` — third **Routes** segment.
- `src/components/SessionHistoryItem.tsx` — renders route sessions in history.
- `src/App.tsx` — `/route/:sessionId` route.

## Click-through script (exercises every new behavior)

1. On the home screen, tap the **Routes** segment in the session-type toggle.
2. Tap **+ Add a new gym** → enter a name (e.g. "Test Wall") → set **Highest
   level** with the counter → **Save gym**. The new gym is selected automatically
   and **Begin routes** enables.
3. Tap **Begin routes →**. You land on the live screen; the level chips run
   **1…maxLevel**.
4. **Guard check:** tap **Flash** *before* selecting a level — nothing is logged
   and the level row flashes a hint.
5. Pick a level chip, then tap **Flash / Send / Fail**. Repeat across several
   levels. Watch the dark card: **Flash / Send / Fail / Routes** counts, the
   **percentage line**, and **+XP** all update live.
6. In **Logged routes**, tap **remove** on an entry — counts and XP recompute.
7. Tap **Finish session & collect XP →** → the summary:
   - Donut with center **Sent %** (= Flash + Send), legend counts.
   - **vs. your last session here** — three cards. First session at a gym shows
     **"— first here"**.
   - **Breakdown by level** — one row per level with a stacked mini-bar, route
     count, and sent %.
8. Go **home** → the session appears in **Recent sessions** (🎯 icon, gym name,
   route count, F/S/Fail counts).
9. Start a **second** Routes session — the same gym is **preselected**. Log a few
   routes, finish, and confirm the comparison cards now show **↑/↓ deltas vs the
   previous session's percentages**.

## Edge cases to poke

- **Finish with 0 routes** — the Finish button stays disabled.
- **New gym, no history** — comparison shows the baseline message, not deltas.
- **All same outcome** (e.g. every route a Flash) — donut is a single arc; deltas
  still compute.
- **Remove the last remaining route** — totals return to zero, Finish disables.
- **Existing Volume/Training sessions** — unaffected; history still renders them.
- **Reload mid-session** — an unfinished route session resumes via the
  home-screen redirect to `/route/:id`.

## Acceptance checks (from the agreed spec)

- [ ] Routes is a **separate session type**, not a change to Volume/Training.
- [ ] Each route stores its **own level** + Flash/Send/Fail.
- [ ] A **gym** is chosen before the session; new gyms are add-only with a
      name + max level; gyms persist and reuse.
- [ ] **Open-ended** logging (no preset count); live totals + percentages update
      on every tap.
- [ ] Summary shows **overall % per outcome** (donut) and **grouped-by-level**
      breakdown.
- [ ] Comparison is scoped to the **same gym**; "first here" when no prior.
- [ ] Route sessions **award XP** (Flash 15 / Send 10 / Fail 2) and count toward
      streaks/badges.
- [ ] `npm run build` passes (`tsc -b && vite build`).

## Notes / out of scope (v1)

- Gyms are add-and-select only — no edit/delete yet.
- Routes don't capture per-route comments in the UI (the model supports it).
- Lint shows the repo's pre-existing `no-explicit-any` (deserialize) and
  `set-state-in-effect` patterns; the new code mirrors the existing views
  (`ActiveSessionView`, `StorageManager`). The build gate is green.
