import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import GameDetail from './pages/GameDetail';
import Alerts from './pages/Alerts';
import Scoreboard from './pages/Scoreboard';
import Settings from './pages/Settings';
import { storageService } from './services/storage';
import { LiveChatBanner } from './components/LiveChatBanner';

const App: React.FC = () => {
  useEffect(() => {
    // Initialize Theme
    const theme = storageService.getTheme();
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Initialize Auth/Guest State Global Listener
    // We pass a dummy callback because individual components will query getUserState() or subscribeToChanges()
    storageService.initAuthListener((state) => {
        // Optional: Could log state changes here
    });

  }, []);

  return (
    <Router>
      <div className="font-sans text-slate-900 dark:text-slate-100 antialiased min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/game/:id" element={<GameDetail />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/scoreboard" element={<Scoreboard />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
        <LiveChatBanner />
      </div>
    </Router>
  );
};

export default App;