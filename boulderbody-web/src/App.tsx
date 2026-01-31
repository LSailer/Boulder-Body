import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { initializeTheme } from './logic/StorageManager';
import { StartView } from './pages/StartView';
import { ActiveSessionView } from './pages/ActiveSessionView';
import { SummaryView } from './pages/SummaryView';

/**
 * Main App component with routing.
 * Sets up React Router with three main views.
 */
function App() {
  // Initialize theme on mount
  useEffect(() => {
    initializeTheme();
  }, []);

  return (
    <BrowserRouter basename="/Boulder-Body">
      <Routes>
        <Route path="/" element={<StartView />} />
        <Route path="/session/:sessionId" element={<ActiveSessionView />} />
        <Route path="/summary/:sessionId" element={<SummaryView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
