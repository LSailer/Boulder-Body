# BoulderBody Web App — Implementation Plan

## Overview
Build a React-based web app for tracking bouldering sessions with localStorage persistence, deployed to GitHub Pages.

## Technology Stack
- **Framework**: React 18+ with Vite (fast dev experience)
- **Language**: TypeScript (type safety, better DX)
- **Styling**: TailwindCSS (dark theme support, responsive)
- **Routing**: React Router v6
- **Charts**: Recharts (React-friendly, donut charts)
- **Storage**: Browser localStorage (no backend needed)
- **Hosting**: GitHub Pages (free, simple deployment)

## Project Structure
```
boulderbody-web/
├── src/
│   ├── components/
│   │   ├── BoulderLogModal.tsx      # Modal for logging attempt results
│   │   └── SessionHistoryItem.tsx    # List item for past sessions
│   ├── pages/
│   │   ├── StartView.tsx             # Home screen with form + history
│   │   ├── ActiveSessionView.tsx     # Live session logging
│   │   └── SummaryView.tsx           # Post-session chart + stats
│   ├── models/
│   │   ├── Session.ts                # Session type definition
│   │   └── BoulderAttempt.ts         # BoulderAttempt type + AttemptResult enum
│   ├── logic/
│   │   ├── SessionRecommender.ts     # Recommendation engine
│   │   └── StorageManager.ts         # localStorage CRUD operations
│   ├── App.tsx                       # Router setup
│   ├── main.tsx                      # Entry point
│   └── index.css                     # Global styles + Tailwind imports
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── .github/
    └── workflows/
        └── deploy.yml                # Auto-deploy to GitHub Pages
```

---

## Implementation Phases

### Phase 1: Project Setup

**Goal**: Create the React + Vite project with all dependencies

**Steps**:
1. Create new Vite project with React-TypeScript template:
   ```bash
   npm create vite@latest boulderbody-web -- --template react-ts
   ```

2. Install dependencies:
   ```bash
   npm install react-router-dom recharts
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```

3. Configure Tailwind for dark theme in `tailwind.config.js`:
   ```js
   whitemode: 'class'
   ```

4. Configure Vite for GitHub Pages deployment in `vite.config.ts`:
   ```ts
   base: '/boulderbody-web/'  // Replace with your repo name
   ```

5. Create folder structure (`src/components`, `src/pages`, `src/models`, `src/logic`)

6. Set up basic `index.css` with Tailwind imports and dark theme

**Verification**: `npm run dev` should start the dev server with a working React app

---

### Phase 2: Data Models & Storage

**Goal**: Define TypeScript types and implement localStorage persistence

**Files to create**:

**`src/models/BoulderAttempt.ts`**:
```typescript
export type AttemptResult = 'flash' | 'done' | 'fail';

export interface BoulderAttempt {
  id: string;
  order: number;              // 1, 2, 3...
  result?: AttemptResult;     // undefined until logged
  comment?: string;
  timestamp?: Date;
}
```

**`src/models/Session.ts`**:
```typescript
import { BoulderAttempt } from './BoulderAttempt';

export interface Session {
  id: string;
  date: Date;
  targetLevel: number;
  boulderCount: number;
  isFinished: boolean;
  attempts: BoulderAttempt[];
}
```

**`src/logic/StorageManager.ts`**:
- Key: `'boulderbody_sessions'`
- Functions:
  - `getAllSessions(): Session[]` — load from localStorage, parse dates
  - `saveSession(session: Session): void` — add new session
  - `updateSession(session: Session): void` — update existing
  - `deleteSession(id: string): void` — remove session
  - `getCurrentSession(): Session | null` — return unfinished session if exists
  - `getLastFinishedSession(): Session | null` — for recommendation engine

**Verification**: Write a simple test script to save/load a session and log to console

---

### Phase 3: Recommendation Engine

**Goal**: Port the iOS logic to TypeScript

**File**: `src/logic/SessionRecommender.ts`

**Implementation**:
```typescript
export function getRecommendation(lastSession: Session | null): { level: number; boulderCount: number } {
  // Default values
  if (!lastSession) {
    return { level: 5, boulderCount: 20 };
  }

  let level = lastSession.targetLevel;

  // Step 1: Performance adjustment
  const loggedAttempts = lastSession.attempts.filter(a => a.result !== undefined);
  const failCount = loggedAttempts.filter(a => a.result === 'fail').length;
  const failRate = loggedAttempts.length > 0 ? failCount / loggedAttempts.length : 0;

  if (failRate < 0.25) level += 1;
  else if (failRate > 0.75) level -= 1;

  // Step 2: Time decay
  const daysSince = Math.floor((Date.now() - new Date(lastSession.date).getTime()) / (1000 * 60 * 60 * 24));
  if (daysSince >= 8 && daysSince <= 14) level -= 1;
  else if (daysSince > 14) level -= 2;

  // Step 3: Clamp
  level = Math.max(1, level);

  return { level, boulderCount: 20 };
}
```

**Verification**: Unit test with various scenarios (no session, good performance, time decay, etc.)

---

### Phase 4: UI Components

**Goal**: Build reusable UI components

**`src/components/BoulderLogModal.tsx`**:
- Props: `attempt: BoulderAttempt`, `onSave: (result, comment) => void`, `onClose: () => void`
- Three large buttons: Flash (green bg), Done (blue bg), Fail (red bg)
- Optional comment textarea
- "Save" button calls `onSave` and `onClose`
- Show current result as pre-selected if exists

**`src/components/SessionHistoryItem.tsx`**:
- Props: `session: Session`, `onClick: () => void`
- Display: date, level, result summary ("8 Flash · 7 Done · 5 Fail")
- Use colored badges for counts
- Clickable card that navigates to SummaryView

**Styling**: Use Tailwind utility classes, large touch targets (min 44px), dark theme colors

**Verification**: Create a demo page showing these components in isolation

---

### Phase 5: Main Views

**Goal**: Build the three main pages

**`src/pages/StartView.tsx`**:
1. Check `getCurrentSession()` on mount
2. If unfinished session exists: show "Resume Session" button → navigate to ActiveSessionView
3. Otherwise show form:
   - Level input (prefilled from `getRecommendation()`)
   - Boulder count input (default 20)
   - Both editable via number inputs
4. "Start Session" button:
   - Create new Session with generated UUID
   - Create BoulderAttempt array (1 to boulderCount)
   - Save to localStorage
   - Navigate to ActiveSessionView
5. Below form: "Session History" section
   - Map over `getAllSessions().filter(s => s.isFinished)`
   - Render SessionHistoryItem for each
   - Click → navigate to SummaryView with session ID

**`src/pages/ActiveSessionView.tsx`**:
1. Receive session ID from route params
2. Load session from StorageManager
3. Header: display date (formatted) and target level
4. Boulder list:
   - Map over `session.attempts`
   - Each row: "Boulder {order}" + result indicator (icon or colored badge)
   - "Not logged" if no result
   - Click → open BoulderLogModal
5. Modal save handler:
   - Update attempt in session
   - Save session via StorageManager
   - Re-render list
6. Progress indicator: "X / Y logged"
7. "Finish Session" button:
   - Enabled when at least 1 attempt has a result
   - Set `isFinished = true`
   - Save session
   - Navigate to SummaryView

**`src/pages/SummaryView.tsx`**:
1. Receive session ID from route params
2. Load session from StorageManager
3. Display session info: date, level, boulder count
4. Calculate chart data:
   - Count Flash, Done, Fail results
   - Use Recharts `<PieChart>` with `<Pie>` (donut chart via `innerRadius`)
   - Colors: Flash=#22c55e (green-500), Done=#3b82f6 (blue-500), Fail=#ef4444 (red-500)
5. Display fail rate: `(fails / logged attempts) * 100` as large percentage
6. Show next recommendation: "Next session: Level X" using `getRecommendation(session)`
7. "Back to Home" button → navigate to StartView

**Verification**: Full user flow test (start → log → finish → view summary → start new session)

---

### Phase 6: Routing & App Shell

**Goal**: Set up React Router and app layout

**`src/App.tsx`**:
```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import StartView from './pages/StartView';
import ActiveSessionView from './pages/ActiveSessionView';
import SummaryView from './pages/SummaryView';

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <BrowserRouter basename="/boulderbody-web">
        <Routes>
          <Route path="/" element={<StartView />} />
          <Route path="/session/:id" element={<ActiveSessionView />} />
          <Route path="/summary/:id" element={<SummaryView />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}
```

**`src/main.tsx`**: Import and render `<App />`

**`src/index.css`**:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-gray-900 text-white;
}
```

**Verification**: All routes navigate correctly, dark theme applied globally

---

### Phase 7: Polish & Edge Cases

**Goal**: Handle edge cases and improve UX

1. **Empty states**:
   - No sessions yet: show helpful message in StartView history
   - Session with 0 logged attempts: show warning in SummaryView

2. **Confirmation dialogs**:
   - "Finish Session" with unlogged boulders: show confirm alert

3. **Date formatting**:
   - Use `Intl.DateTimeFormat` or `date-fns` for consistent date display

4. **Loading states**:
   - Add skeleton loaders if needed (localStorage is instant, so optional)

5. **Responsive design**:
   - Ensure touch targets are 44px minimum
   - Test on mobile viewport in browser DevTools

6. **Accessibility**:
   - Add ARIA labels to buttons
   - Keyboard navigation support

**Verification**: Test all edge cases manually

---

### Phase 8: GitHub Pages Deployment

**Goal**: Auto-deploy to GitHub Pages on push to main

1. Create GitHub repository: `boulderbody-web`

2. Create `.github/workflows/deploy.yml`:
   ```yaml
   name: Deploy to GitHub Pages

   on:
     push:
       branches: [ main ]

   jobs:
     build-and-deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
           with:
             node-version: 18
         - run: npm ci
         - run: npm run build
         - uses: peaceiris/actions-gh-pages@v3
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: ./dist
   ```

3. Push code to GitHub

4. Enable GitHub Pages in repo settings: source = gh-pages branch

5. Access app at: `https://yourusername.github.io/boulderbody-web/`

**Verification**: Navigate to live URL, test full app in production

---

## Critical Files Summary

**Data & Logic**:
- `src/models/Session.ts` — Session interface
- `src/models/BoulderAttempt.ts` — BoulderAttempt interface + AttemptResult enum
- `src/logic/StorageManager.ts` — localStorage CRUD
- `src/logic/SessionRecommender.ts` — Recommendation algorithm

**Components**:
- `src/components/BoulderLogModal.tsx` — Modal for logging attempts
- `src/components/SessionHistoryItem.tsx` — History list item

**Pages**:
- `src/pages/StartView.tsx` — Home screen
- `src/pages/ActiveSessionView.tsx` — Live session
- `src/pages/SummaryView.tsx` — Post-session stats

**Config**:
- `vite.config.ts` — Base path for GitHub Pages
- `tailwind.config.js` — Dark theme config
- `.github/workflows/deploy.yml` — Auto-deployment

---

## Testing Strategy

**Manual Testing Flow**:
1. Start a new session with default recommendations
2. Log some boulders (mix of Flash/Done/Fail)
3. Leave some unlogged
4. Finish session → verify summary chart and stats
5. Start another session → verify recommendation changed based on performance
6. Close and reopen browser → verify data persists
7. Test time decay: manually edit localStorage to set old session date

**Edge Cases to Test**:
- No sessions yet (default recommendation)
- All boulders same result (chart still renders)
- Finish with 0 logged (show warning)
- Very old session (>14 days, -2 level penalty)
- Level never goes below 1 (clamp test)

---

## Success Criteria

✅ App deployed to GitHub Pages and accessible via URL
✅ Can start, log, and finish sessions
✅ Data persists in localStorage across browser sessions
✅ Recommendation engine works correctly (verified via manual tests)
✅ White theme applied throughout
✅ Charts display correctly
✅ Responsive on mobile (tested in DevTools)
✅ No console errors

---

## Future Enhancements (Out of Scope for v1)

- PWA support (offline mode, install to home screen)
- Export sessions as JSON/CSV
- Backend sync for multi-device access
- Photo/video upload for boulders
- Statistics dashboard (trends over time)
- Gym location tracking
