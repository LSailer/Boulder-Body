# Boulder-Body

An iOS app for tracking bouldering sessions — log your climbs, track your progress, and get level recommendations based on your performance.

## Features

- **Session Setup** — Choose how many boulders to attempt (default: 20) and select a V-scale level (V0–V12)
- **Smart Level Suggestions** — The app recommends a level based on your last session:
  - Fail rate below 25% → level up
  - Fail rate 75% or above → level down
  - Last session over 7 days ago → drop 1 level
  - Last session over 14 days ago → drop 2 levels
- **Boulder Tracking** — For each boulder, record one of three outcomes:
  - **Flash** — Sent on the first try
  - **Done** — Sent after multiple attempts
  - **Fail** — Did not complete
- **Session Summary** — View a pie chart breakdown of your results and get a recommendation for your next session level
- **Session History** — Browse past sessions and track your progression over time

## Project Structure

```
BoulderTracker/
└── BoulderTracker/
    ├── App/
    │   ├── BoulderTrackerApp.swift     # App entry point
    │   └── ContentView.swift           # Root navigation (setup → tracking → summary)
    ├── Models/
    │   ├── BoulderLevel.swift          # V-scale grades (V0–V12)
    │   ├── BoulderResult.swift         # Attempt outcomes: Flash, Done, Fail
    │   ├── BoulderAttempt.swift        # Single boulder attempt
    │   ├── BoulderSession.swift        # Session with attempts and computed stats
    │   └── SessionStore.swift          # Persistence via UserDefaults
    ├── ViewModels/
    │   ├── SessionSetupViewModel.swift     # Setup logic and level recommendation
    │   ├── SessionViewModel.swift          # Active session state management
    │   └── SessionSummaryViewModel.swift   # Summary stats and chart data
    ├── Views/
    │   ├── SessionSetupView.swift      # Configure new session
    │   ├── BoulderTrackingView.swift    # Record results during session
    │   ├── SessionSummaryView.swift     # Pie chart + recommendation
    │   ├── SessionHistoryView.swift     # Past sessions list
    │   └── Components/
    │       └── PieChartView.swift       # Pie chart drawn with Canvas
    └── Services/
        └── LevelRecommendationService.swift  # Level suggestion algorithm
```

## Architecture

The app follows **MVVM** (Model-View-ViewModel):

- **Models** define data structures (`BoulderSession`, `BoulderAttempt`, `BoulderLevel`, `BoulderResult`) and persistence (`SessionStore`)
- **ViewModels** encapsulate business logic for each screen
- **Views** are SwiftUI views that bind to ViewModels
- **Services** contain stateless logic (level recommendation algorithm)

## Requirements

- iOS 17.0+
- Xcode 15.0+
- Swift 5.9+

## Getting Started

1. Clone the repository
2. Open `BoulderTracker/` in Xcode (or create a new Xcode project and add the source files)
3. Build and run on a simulator or device

## Level Recommendation Algorithm

The recommendation engine in `LevelRecommendationService` applies two adjustments:

**Performance-based:**
| Last Session Fail Rate | Adjustment |
|------------------------|------------|
| Below 25%              | +1 level   |
| 25%–74%                | No change  |
| 75% or above           | -1 level   |

**Time-based (stacks with performance):**
| Days Since Last Session | Adjustment |
|-------------------------|------------|
| 0–7 days                | No change  |
| 8–14 days               | -1 level   |
| 15+ days                | -2 levels  |

Levels are clamped to the V0–V12 range.

## License

MIT License — see [LICENSE](LICENSE) for details.
