
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Coding Coach Approach

When working on this codebase, act as a coding coach by explaining your thought process and steps:

1. **Explain Before Acting** - Before implementing changes, briefly explain what you're about to do and why it's the right approach for this codebase
2. **Break Down Complex Tasks** - For multi-step implementations, outline the steps you'll take (e.g., "I'll create the data model first, then the storage logic, then wire it up to the UI")
3. **Teach Through Code** - When introducing new patterns or technologies, explain why they're being used and how they fit into the architecture
4. **Highlight Key Decisions** - Call out important architectural decisions, trade-offs, or conventions being followed (e.g., "Using localStorage instead of a backend because this is a client-only app")
5. **Reference the Plan** - Refer to `planing_file.md` when implementing features to show how the current work fits into the overall roadmap
6. **Explain Testing Strategy** - When adding features, mention how they should be tested and what edge cases to consider
7. **Point Out Connections** - Show how new code connects to existing parts of the system (e.g., "This component will use the StorageManager we'll create in the logic folder")

The goal is to help the developer understand not just what code is being written, but why and how it fits into the bigger picture.

## Project Overview

BoulderBody is a web application for tracking bouldering sessions. The app is built with React + TypeScript + Vite and uses localStorage for persistence. It will be deployed to GitHub Pages.

**Key Features:**
- Start bouldering sessions with recommended difficulty levels
- Log boulder attempts (Flash/Done/Fail)
- View session summaries with charts
- Intelligent recommendation engine based on performance and time decay

## Development Commands

```bash
# Navigate to web app directory first
cd boulderbody-web

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint
```

## Architecture

### Project Structure

The codebase follows a feature-based structure within `boulderbody-web/`:

```
src/
├── components/     # Reusable UI components
├── pages/          # Main view components (routing)
├── models/         # TypeScript type definitions
└── logic/          # Business logic and utilities
```

### Core Data Models

**Session** (`src/models/Session.ts`):
- Represents a complete bouldering session
- Contains: id, date, targetLevel, boulderCount, isFinished, attempts[]
- Sessions are persisted in localStorage

**BoulderAttempt** (`src/models/BoulderAttempt.ts`):
- Represents a single boulder attempt within a session
- AttemptResult: 'flash' | 'done' | 'fail'
- Each attempt has: id, order, result?, comment?, timestamp?

### Key Components

**Pages** (routing):
- `StartView.tsx` - Home screen with session form and history
- `ActiveSessionView.tsx` - Live session logging interface
- `SummaryView.tsx` - Post-session statistics and charts

**Components**:
- `BoulderLogModal.tsx` - Modal for logging attempt results (Flash/Done/Fail)
- `SessionHistoryItem.tsx` - List item displaying past session summary

### Business Logic

**StorageManager** (`src/logic/StorageManager.ts`):
- Manages localStorage CRUD operations
- Key: `'boulderbody_sessions'`
- Handles date serialization/deserialization
- Key functions: getAllSessions(), saveSession(), updateSession(), deleteSession(), getCurrentSession(), getLastFinishedSession()

**SessionRecommender** (`src/logic/SessionRecommender.ts`):
- Calculates recommended level for next session based on:
  1. Performance adjustment (fail rate: <25% → +1 level, >75% → -1 level)
  2. Time decay (8-14 days → -1 level, >14 days → -2 levels)
  3. Level clamping (minimum level = 1)
- Default recommendation: Level 5, 20 boulders

## Technology Stack

- **React 19** with TypeScript
- **Vite** for build tooling and dev server
- **React Router v6** for navigation (to be added)
- **Recharts** for donut charts (to be added)
- **TailwindCSS** for styling with dark theme (to be added)
- **localStorage** for data persistence

## Deployment

Configured for GitHub Pages deployment:
- Set `base` in `vite.config.ts` to match repository name
- GitHub Actions workflow (`.github/workflows/deploy.yml`) will handle auto-deployment
- Build output directory: `dist/`

## Development Notes

### Current State
The project is in initial setup phase with:
- Basic Vite + React + TypeScript scaffold
- Standard boilerplate App component
- No routing, styling, or business logic implemented yet

### Implementation Plan
Refer to `planing_file.md` for the complete 8-phase implementation strategy. Key phases:
1. ✅ Project Setup (Vite + React + TypeScript)
2. Data Models & Storage (localStorage implementation)
3. Recommendation Engine (performance + time decay algorithm)
4. UI Components (modal, history items)
5. Main Views (Start, Active Session, Summary)
6. Routing & App Shell (React Router setup)
7. Polish & Edge Cases
8. GitHub Pages Deployment

### Styling Approach
- Use TailwindCSS utility classes
- Dark theme throughout (bg-gray-900, text-white)
- Large touch targets (minimum 44px) for mobile
- Color scheme: Flash=#22c55e (green), Done=#3b82f6 (blue), Fail=#ef4444 (red)

### Data Flow
1. User starts session → create Session with empty BoulderAttempt[] → save to localStorage
2. User logs attempts → update individual attempts → save session
3. User finishes session → set isFinished=true → navigate to summary
4. Next session → calculate recommendation based on last finished session

### Important Considerations
- Always serialize/deserialize Date objects when working with localStorage
- Handle unfinished sessions (only one can exist at a time)
- Validate that at least one attempt is logged before allowing session finish
- Session IDs should be unique (use UUIDs)
- Chart should handle edge cases (all same result, 0 logged attempts)
