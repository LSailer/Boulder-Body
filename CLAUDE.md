# CLAUDE.md — Development Guide for Boulder-Body

## Project Overview

Boulder-Body is an iOS bouldering session tracker built with SwiftUI and MVVM architecture. Users log boulder attempts as Flash/Done/Fail, view pie chart summaries, and get automatic level recommendations for their next session.

## Build & Run

```bash
# Open in Xcode
open BoulderTracker/BoulderTracker.xcodeproj

# Or build from command line (requires Xcode installed)
xcodebuild -scheme BoulderTracker -destination 'platform=iOS Simulator,name=iPhone 15' build

# Run tests
xcodebuild -scheme BoulderTracker -destination 'platform=iOS Simulator,name=iPhone 15' test
```

No Xcode project file is checked in yet — create one in Xcode by adding all files under `BoulderTracker/BoulderTracker/` to a new iOS App project targeting iOS 17+.

## Code Architecture

- **MVVM pattern** — Views bind to ViewModels; ViewModels own business logic; Models are plain data types
- **SwiftUI only** — No UIKit dependencies; uses NavigationStack, Canvas, and @StateObject/@EnvironmentObject for state
- **Persistence** — `SessionStore` saves sessions to UserDefaults via Codable JSON encoding
- **No external dependencies** — Pure Swift/SwiftUI, no third-party packages

## Key Files

| File | Purpose |
|------|---------|
| `App/ContentView.swift` | Root view — manages navigation between setup, tracking, and summary screens |
| `Models/BoulderSession.swift` | Core data model with computed stats (fail rate, flash rate, counts) |
| `Models/SessionStore.swift` | ObservableObject that persists sessions to UserDefaults |
| `Services/LevelRecommendationService.swift` | Stateless level recommendation algorithm |
| `Views/Components/PieChartView.swift` | Custom pie chart using SwiftUI Canvas |

## Level Recommendation Rules

Defined in `LevelRecommendationService.swift`:
1. Fail rate < 25% → level up (+1)
2. Fail rate >= 75% → level down (-1)
3. Last session > 7 days ago → additional -1
4. Last session > 14 days ago → -2 instead of -1 from rule 3
5. No previous session → default V0

Performance and time adjustments stack. Levels clamped to V0–V12.

## Conventions

- **Naming**: Types are PascalCase, properties/methods are camelCase
- **File organization**: One type per file, files named after the primary type they contain
- **Views**: Each screen has its own View file; reusable components go in `Views/Components/`
- **ViewModels**: One ViewModel per screen, named `{Screen}ViewModel`
- **Enums**: Use `CaseIterable` and `Identifiable` for enums displayed in UI
- **State management**: Use `@StateObject` for owned state, `@EnvironmentObject` for shared state (`SessionStore`)
- **No force unwraps** — always use safe unwrapping patterns

## Common Tasks

### Adding a new boulder result type
1. Add case to `BoulderResult` enum in `Models/BoulderResult.swift`
2. Add `displayName`, `emoji`, and `color` in the switch statements
3. Update `BoulderSession` computed properties (add a count property)
4. Update `SessionSummaryViewModel.chartData` and percent properties

### Changing the level scale
1. Modify `BoulderLevel` enum cases in `Models/BoulderLevel.swift`
2. The `adjusted(by:)` method auto-clamps to valid range

### Switching persistence from UserDefaults to Core Data / SwiftData
1. Replace `SessionStore` internals — keep the same `@Published var sessions` interface
2. All views use `SessionStore` via `@EnvironmentObject`, so no view changes needed

### Adding tests
1. Create a test target in Xcode
2. `LevelRecommendationService` is fully testable — static methods with no dependencies
3. Models are plain Codable structs — test encoding/decoding round-trips
4. ViewModels can be tested by constructing with mock data
