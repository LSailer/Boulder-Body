# BoulderBody 🧗

A web application for tracking bouldering sessions with intelligent recommendations based on your performance.

## Features

- ✨ **Smart Recommendations** - Get level suggestions based on your fail rate and time since last session
- 📊 **Session Tracking** - Log boulder attempts as Flash/Done/Fail
- 📈 **Visual Analytics** - See your performance with interactive donut charts
- ⏱️ **Time Tracking** - Track session duration automatically
- 🌓 **Theme Toggle** - Switch between light and dark modes
- 💾 **Offline Storage** - All data saved locally in your browser (no backend required)

## Live Demo

Visit the app: [https://lucamac.github.io/Boulder-Body/](https://lucamac.github.io/Boulder-Body/)

## How It Works

### Recommendation Algorithm

The app suggests your next session's difficulty level based on:

1. **Performance Adjustment**
   - Fail rate < 25% → increase level by 1
   - Fail rate > 75% → decrease level by 1
   - Otherwise → keep same level

2. **Time Decay**
   - 8-14 days since last session → decrease level by 1
   - More than 14 days → decrease level by 2
   - Less than 8 days → no change

3. **Level Clamping**
   - Minimum level is always 1

### Fail Rate Calculation

Unlogged boulders count as fails (stricter approach). This encourages you to log all attempts and provides a more honest assessment of performance.

## Technology Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Recharts** - Data visualization
- **Tailwind CSS** - Styling
- **localStorage** - Data persistence

## Development

### Prerequisites

- Node.js 20 or higher
- npm

### Setup

```bash
# Clone the repository
git clone https://github.com/lucamac/Boulder-Body.git
cd Boulder-Body

# Navigate to web app
cd boulderbody-web

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Project Structure

```
boulderbody-web/
├── src/
│   ├── components/     # Reusable UI components
│   │   ├── BoulderLogModal.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── SessionHistoryItem.tsx
│   │   └── ThemeToggle.tsx
│   ├── logic/          # Business logic
│   │   ├── SessionRecommender.ts
│   │   └── StorageManager.ts
│   ├── models/         # TypeScript interfaces
│   │   ├── BoulderAttempt.ts
│   │   └── Session.ts
│   ├── pages/          # Main views
│   │   ├── ActiveSessionView.tsx
│   │   ├── StartView.tsx
│   │   └── SummaryView.tsx
│   ├── App.tsx         # Router setup
│   ├── main.tsx        # Entry point
│   └── index.css       # Global styles
├── public/
└── dist/               # Build output (ignored by git)
```

## Deployment

The app is configured for automatic deployment to GitHub Pages via GitHub Actions.

### Manual Deployment

```bash
# Build the app
npm run build

# The dist/ folder contains the production build
# Deploy the contents to any static hosting service
```

### GitHub Pages Deployment

1. Push changes to the `main` branch
2. GitHub Actions automatically builds and deploys
3. App is live at `https://<username>.github.io/Boulder-Body/`

## Features in Detail

### Session Management

- **Start Session**: Enter target level and boulder count
- **Log Attempts**: Tap boulders to log as Flash/Done/Fail
- **Add Notes**: Optional comments on individual attempts
- **Finish Session**: Complete session with confirmation if many unlogged

### Session History

- View all past sessions
- Click to see detailed summary
- Delete sessions with confirmation

### Summary View

- Donut chart visualization
- Breakdown by Flash/Done/Fail
- Session duration
- Fail rate percentage
- Option to delete session

## Data Privacy

All data is stored locally in your browser's localStorage. No data is sent to any server. Your session history stays private and on your device.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Acknowledgments

Built with guidance from Claude Code (claude.ai/code)
